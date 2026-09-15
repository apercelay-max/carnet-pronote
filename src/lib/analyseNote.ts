// « Explique-moi ma note » : Gemini lit une note Pronote dans son contexte
// (moyenne de la classe, min/max, autres notes de la matière, cours récents)
// et dit concrètement quoi retravailler.
//
// Même principe que les fiches : JSON exigé et validé champ par champ, et on
// dit à Gemini ce qu'il ne sait PAS (il ne voit pas la copie) pour qu'il ne
// prétende pas savoir quelles questions ont été ratées.

import type { Grade, GradesOverview, Resource } from "pawnote";
import { GradeKind } from "pawnote";
import { askGemini } from "./gemini";
import { gradeOn20, formatDayLabel } from "./format";
import { stripHtml } from "./html";

export type AnalyseNote = {
  bilan: string;
  pointsForts: string[];
  aRetravailler: { notion: string; pourquoi: string; exercice: string }[];
  conseils: string[];
  chapitreProbable: string;
};

const SYSTEM = `Tu es un professeur principal bienveillant et direct qui aide un ou une élève de collège ou lycée français à comprendre une note.
Tu ne vois PAS la copie : tu déduis seulement à partir des chiffres, de l'intitulé de l'évaluation et des cours récents. Ne prétends jamais savoir quelles questions ont été ratées ; parle de ce qui est PROBABLE et formule-le comme tel.
Ton ton est encourageant mais honnête, sans blabla. Tu réponds UNIQUEMENT avec un objet JSON valide.`;

const sur20 = (v?: number | null) => (v == null ? "?" : v.toLocaleString("fr-FR", { maximumFractionDigits: 1 }));

function valeur(g?: { kind: number; points: number }): number | null {
  return g && g.kind === GradeKind.Grade ? g.points : null;
}

export function contexteNote(grade: Grade, grades: GradesOverview | null, resources: Resource[]): string {
  const matiere = grade.subject.name;
  const bareme = valeur(grade.outOf) ?? 20;
  const lignes: string[] = [
    `Matière : ${matiere}`,
    `Évaluation : ${grade.comment || "sans intitulé"} (${formatDayLabel(grade.date)}), coefficient ${grade.coefficient}`,
    `Note : ${valeur(grade.value) ?? "non notée"} / ${bareme} (soit ${sur20(gradeOn20(grade.value, grade.outOf))}/20)`,
    `Classe sur cette évaluation : moyenne ${valeur(grade.average) ?? "?"}, note la plus basse ${valeur(grade.min) ?? "?"}, la plus haute ${valeur(grade.max) ?? "?"} (sur ${bareme})`,
  ];
  if (grade.commentaireSurNote) lignes.push(`Commentaire du prof : ${grade.commentaireSurNote}`);

  const moy = grades?.subjectsAverages?.find((s) => s.subject.name === matiere);
  if (moy) lignes.push(`Moyenne de l'élève en ${matiere} : ${sur20(valeur(moy.student))}/20 (classe : ${sur20(valeur(moy.class_average))}/20)`);

  const autres = (grades?.grades ?? [])
    .filter((g) => g.subject.name === matiere && g.id !== grade.id)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((g) => `- ${formatDayLabel(g.date)} · ${g.comment || "évaluation"} : ${sur20(gradeOn20(g.value, g.outOf))}/20`);
  if (autres.length) lignes.push(`Autres notes de la matière (chronologique) :\n${autres.join("\n")}`);

  // Cours des 4 semaines précédant l'évaluation : c'est probablement ce qui
  // était au programme du contrôle.
  const avant = grade.date.getTime();
  const cours = resources
    .filter((r) => r.subject?.name === matiere && r.startDate.getTime() <= avant && avant - r.startDate.getTime() < 28 * 86400000)
    .flatMap((r) => (r.contents ?? []).map((c) => `- ${formatDayLabel(r.startDate)} : ${c.title ?? ""} ${stripHtml(c.description ?? "").slice(0, 200)}`.trim()));
  if (cours.length) lignes.push(`Cours vus avant l'évaluation (cahier de textes) :\n${cours.slice(0, 12).join("\n")}`);

  return lignes.join("\n");
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strs = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

export async function analyserNote(contexte: string, apiKey: string | null): Promise<AnalyseNote> {
  const brut = await askGemini(
    `${contexte}

Analyse cette note au format JSON exact :
{
  "bilan": "2-3 phrases : où se situe l'élève par rapport à la classe et à ses autres notes, et ce que ça veut dire",
  "pointsForts": ["ce qui va bien, s'il y a des indices (sinon tableau vide)"],
  "aRetravailler": [{"notion": "notion probablement en cause", "pourquoi": "l'indice qui le suggère", "exercice": "un exercice concret de 15-20 min pour la travailler"}],
  "conseils": ["conseil de méthode concret pour la prochaine évaluation"],
  "chapitreProbable": "le chapitre évalué, en quelques mots"
}
2 à 4 éléments dans "aRetravailler", 2 à 3 "conseils". Si la note est très bonne, "aRetravailler" sert à consolider pour aller plus loin.`,
    {
      apiKey,
      system: SYSTEM,
      generation: { temperature: 0.4, maxOutputTokens: 8192, responseMimeType: "application/json" },
    }
  );

  let o: any;
  try {
    o = JSON.parse(brut.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, ""));
  } catch {
    throw new Error("Gemini a renvoyé une analyse illisible. Réessaie.");
  }
  const analyse: AnalyseNote = {
    bilan: str(o?.bilan),
    pointsForts: strs(o?.pointsForts),
    aRetravailler: (Array.isArray(o?.aRetravailler) ? o.aRetravailler : [])
      .map((x: any) => ({ notion: str(x?.notion), pourquoi: str(x?.pourquoi), exercice: str(x?.exercice) }))
      .filter((x: any) => x.notion),
    conseils: strs(o?.conseils),
    chapitreProbable: str(o?.chapitreProbable),
  };
  if (!analyse.bilan) throw new Error("Gemini n'a pas réussi à analyser cette note. Réessaie.");
  return analyse;
}
