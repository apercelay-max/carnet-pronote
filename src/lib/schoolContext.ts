// Construit le résumé de la scolarité envoyé à Gemini.
//
// Deux règles pour tout ce fichier :
//  1. AUCUN chiffre inventé. Si Pronote ne donne pas une information, elle est
//     absente du résumé — pas remplacée par une estimation. Une IA à qui on
//     donne une moyenne approximative répondra des conseils faux avec aplomb.
//  2. Compact. Le contexte part à chaque question : on garde ce qui sert à
//     réviser et à se situer, tronqué, plutôt que tout le carnet de bord.

import type {
  Assignment,
  Evaluation,
  GradesOverview,
  Notebook,
  Resource,
  Timetable,
} from "pawnote";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatGradeValue, gradeOn20 } from "./format";
import { stripHtml } from "./html";

export type SchoolData = {
  displayName?: string | null;
  grades: GradesOverview | null;
  assignments: Assignment[];
  timetable: Timetable | null;
  evaluations: Evaluation[];
  resources: Resource[];
  notebookData: Notebook | null;
};

/** Longueur max d'un extrait de cours ou d'énoncé recopié dans le contexte. */
const EXTRAIT_MAX = 320;
const MAX_NOTES = 12;
const MAX_COURS = 14;
const MAX_DEVOIRS = 15;

function extrait(input?: string | null, max = EXTRAIT_MAX): string {
  const texte = stripHtml(input ?? "").replace(/\s*\n\s*/g, " ");
  return texte.length > max ? `${texte.slice(0, max - 1)}…` : texte;
}

function jour(d: Date): string {
  return format(d, "d MMM", { locale: fr });
}

function note(value: any, outOf: any): string {
  const sur20 = gradeOn20(value, outOf);
  const brut = formatGradeValue(value);
  const bareme = outOf ? formatGradeValue(outOf) : null;
  if (sur20 == null) return brut;
  // On donne la note telle qu'elle est ET son équivalent /20 : un 27/40 et un
  // 13,5/20 ne se lisent pas pareil, et l'IA doit pouvoir comparer.
  return bareme && bareme !== "20"
    ? `${brut}/${bareme} (${sur20.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/20)`
    : `${brut}/20`;
}

/**
 * Résumé texte de la scolarité, prêt à être collé dans le prompt.
 *
 * `subjectFilter` restreint aux matières demandées (fiche sur une matière
 * précise) — sinon tout est inclus.
 */
export function buildSchoolContext(
  data: SchoolData,
  options: { subjectFilter?: string | null } = {}
): string {
  const { subjectFilter } = options;
  const garde = (nom?: string) =>
    !subjectFilter || (nom ?? "").toLowerCase().includes(subjectFilter.toLowerCase());

  const blocs: string[] = [];
  const aujourdhui = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });
  blocs.push(`Date du jour : ${aujourdhui}.`);
  if (data.displayName) blocs.push(`Élève : ${data.displayName}.`);

  // --- Moyennes --------------------------------------------------------
  const g = data.grades;
  if (g) {
    const lignes: string[] = [];
    const gen = gradeOn20(g.overallAverage);
    const cls = gradeOn20(g.classAverage);
    if (gen != null) {
      lignes.push(
        `Moyenne générale : ${gen.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}/20` +
          (cls != null
            ? ` (classe : ${cls.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}/20)`
            : "")
      );
    }
    const parMatiere = (g.subjectsAverages ?? [])
      .filter((s) => garde(s.subject?.name))
      .map((s) => {
        const eleve = gradeOn20(s.student);
        const moyClasse = gradeOn20(s.class_average);
        if (eleve == null) return null;
        return `- ${s.subject.name} : ${eleve.toLocaleString("fr-FR", {
          maximumFractionDigits: 2,
        })}/20${
          moyClasse != null
            ? ` (classe ${moyClasse.toLocaleString("fr-FR", { maximumFractionDigits: 2 })})`
            : ""
        }`;
      })
      .filter(Boolean);
    if (parMatiere.length) lignes.push("Moyennes par matière :", ...(parMatiere as string[]));
    if (lignes.length) blocs.push(`MOYENNES\n${lignes.join("\n")}`);

    const dernieres = (g.grades ?? [])
      .filter((n) => garde(n.subject?.name))
      .slice(0, MAX_NOTES)
      .map((n) => {
        const moyClasse = gradeOn20(n.average);
        return `- ${jour(n.date)} · ${n.subject.name} : ${note(n.value, n.outOf)}${
          n.coefficient && n.coefficient !== 1 ? ` coef ${n.coefficient}` : ""
        }${
          moyClasse != null
            ? ` · moyenne classe ${moyClasse.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}`
            : ""
        }${n.comment ? ` · ${extrait(n.comment, 90)}` : ""}`;
      });
    if (dernieres.length) blocs.push(`DERNIÈRES NOTES\n${dernieres.join("\n")}`);
  }

  // --- Travail à faire -------------------------------------------------
  const aFaire = data.assignments
    .filter((a) => !a.done && garde(a.subject?.name))
    .slice(0, MAX_DEVOIRS)
    .map(
      (a) =>
        `- Pour le ${jour(a.deadline)} · ${a.subject.name} : ${extrait(a.description)}${
          a.length ? ` (~${a.length} min)` : ""
        }`
    );
  if (aFaire.length) blocs.push(`DEVOIRS À FAIRE\n${aFaire.join("\n")}`);

  // --- Contrôles annoncés ----------------------------------------------
  // Uniquement le drapeau `test` de Pronote : jamais un contrôle deviné à
  // partir d'un mot dans une description.
  const controles = (data.timetable?.classes ?? [])
    .filter((c: any) => c.test && !c.canceled && c.startDate >= new Date() && garde(c.subject?.name))
    .slice(0, 8)
    .map((c: any) => `- ${jour(c.startDate)} · ${c.subject?.name ?? "?"}`);
  if (controles.length) blocs.push(`CONTRÔLES ANNONCÉS\n${controles.join("\n")}`);

  // --- Contenu des cours (cahier de textes) ----------------------------
  // C'est la matière première des fiches et des questions : ce que le prof a
  // effectivement écrit avoir traité en cours.
  const cours: string[] = [];
  for (const r of [...data.resources].reverse()) {
    if (!garde(r.subject?.name)) continue;
    for (const c of (r.contents ?? []) as any[]) {
      const titre = extrait(c.title, 120);
      const corps = extrait(c.description);
      if (!titre && !corps) continue;
      cours.push(
        `- ${jour(r.startDate)} · ${r.subject?.name ?? "?"} — ${titre}${corps ? ` : ${corps}` : ""}`
      );
      if (cours.length >= MAX_COURS) break;
    }
    if (cours.length >= MAX_COURS) break;
  }
  if (cours.length) blocs.push(`CONTENU DES COURS (du plus récent au plus ancien)\n${cours.join("\n")}`);

  // --- Compétences évaluées --------------------------------------------
  const evals = data.evaluations
    .filter((e) => garde(e.subject?.name))
    .slice(0, 6)
    .map((e) => {
      const niveaux = (e.skills ?? [])
        .map((s: any) => s.level?.short ?? s.level?.long)
        .filter(Boolean)
        .join(", ");
      return `- ${jour(e.date)} · ${e.subject.name} — ${e.name}${niveaux ? ` : ${niveaux}` : ""}`;
    });
  if (evals.length) blocs.push(`COMPÉTENCES ÉVALUÉES\n${evals.join("\n")}`);

  // --- Vie scolaire ----------------------------------------------------
  const nb = data.notebookData;
  if (nb && !subjectFilter) {
    const lignes: string[] = [];
    if (nb.absences?.length) lignes.push(`- ${nb.absences.length} absence(s) enregistrée(s)`);
    if (nb.delays?.length) lignes.push(`- ${nb.delays.length} retard(s)`);
    if (nb.punishments?.length) lignes.push(`- ${nb.punishments.length} punition(s)`);
    for (const o of (nb.observations ?? []).slice(0, 4)) {
      lignes.push(`- ${jour(o.date)} · ${o.subject?.name ?? "Vie scolaire"} : ${extrait(o.name, 120)}`);
    }
    if (lignes.length) blocs.push(`VIE SCOLAIRE\n${lignes.join("\n")}`);
  }

  return blocs.join("\n\n");
}

/**
 * Consignes permanentes données à Gemini.
 *
 * Le point le plus important est l'interdiction d'inventer : le reste de
 * l'app s'astreint à n'afficher que des chiffres vrais, une IA qui broderait
 * sur des notes ou un contenu de cours absent ruinerait cette confiance.
 */
export const SYSTEM_PROMPT = `Tu es l'assistant de révision intégré à Carnet, une application scolaire française utilisée par un ou une élève du collège ou du lycée.

Ce que tu reçois : un résumé des données Pronote de cette personne (moyennes, notes, devoirs, contenu des cours écrit par les professeurs, vie scolaire). Ces données sont réelles.

Règles :
- Réponds en français, en tutoyant, dans un ton direct et encourageant, jamais infantilisant.
- Ne JAMAIS inventer une note, une moyenne, une date ou un contenu de cours. Si l'information n'est pas dans le résumé, dis simplement qu'elle n'y est pas.
- Quand tu t'appuies sur un chiffre, cite-le tel qu'il est dans le résumé.
- Le contenu des cours est parfois très court (une ligne écrite par le prof). Tu peux compléter avec tes connaissances du programme, mais dis clairement quand tu le fais : « d'après le programme » plutôt que de le présenter comme le cours de la personne.
- Pour une fiche de révision : titres courts, listes à puces, définitions et formules mises en avant, pas de longs paragraphes.
- Pour des questions d'entraînement : numérote-les, et mets les réponses à la fin sous un titre « Corrigé », jamais à côté de la question.
- Sois concis. Pas de préambule, pas de « bien sûr ! ». Tu vas droit au but.`;
