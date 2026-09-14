// Fiches approfondies par Gemini.
//
// Le moteur local (lib/fiches.ts) ne fait que SÉLECTIONNER des phrases : il
// ne peut ni expliquer, ni donner d'exemple, ni poser une vraie question. Pour
// réviser un contrôle, c'est justement ce qui manque. Cette couche demande à
// Gemini une fiche structurée complète (cours réorganisé, méthodes, pièges,
// quiz…) et la range À CÔTÉ de la fiche locale, sans la remplacer : si Gemini
// est indisponible, la fiche locale reste là et l'app marche hors ligne.
//
// On exige du JSON (responseMimeType) et on le valide champ par champ : un
// modèle renvoie parfois un champ manquant ou d'un mauvais type, et une fiche
// à moitié vide vaut mieux qu'un écran qui plante.

import { askGemini } from "./gemini";
import { stripHtml, cartesDepuisFiche, type Carte, type FicheGeneree } from "./fiches";

export type FicheIA = {
  /** 2 à 4 paragraphes qui expliquent le cours, pas juste des phrases recopiées. */
  resume: string[];
  /** Le cours réorganisé en parties, chacune avec ses points essentiels. */
  plan: { titre: string; points: string[] }[];
  definitions: { terme: string; sens: string }[];
  /** Formules, dates, chiffres, règles : tout ce qui s'apprend par cœur. */
  aRetenirParCoeur: { intitule: string; detail: string }[];
  /** Méthodes et étapes pour réussir les exercices type. */
  methodes: { titre: string; etapes: string[] }[];
  exemples: string[];
  /** Erreurs classiques qui coûtent des points au contrôle. */
  pieges: string[];
  /** Questions ouvertes avec réponse : deviennent des flashcards. */
  questions: { question: string; reponse: string }[];
  qcm: { question: string; choix: string[]; bonne: number; explication: string }[];
  /** Ce qui manquait dans le texte fourni, pour que l'élève complète. */
  aVerifier: string[];
  motsCles: string[];
};

const SYSTEM = `Tu es un professeur français expérimenté qui prépare des fiches de révision pour un ou une élève de collège ou lycée.
Tu écris en français clair, adapté au niveau, sans blabla.
Tu t'appuies d'abord sur le cours fourni. Tu peux compléter avec des connaissances sûres du programme scolaire français (explications, exemples, méthodes), mais tu n'inventes jamais un fait incertain. Si le cours semble incomplet, dis-le dans "aVerifier".
Tu réponds UNIQUEMENT avec un objet JSON valide, sans texte autour.`;

function consigne(input: { titre: string; matiere: string; texte: string }): string {
  return `Matière : ${input.matiere}
Chapitre / titre : ${input.titre}

Cours de l'élève :
"""
${input.texte}
"""

Produis une fiche de révision COMPLÈTE pour préparer un contrôle, au format JSON exact suivant :
{
  "resume": ["2 à 4 paragraphes qui expliquent l'essentiel du chapitre"],
  "plan": [{"titre": "Partie du cours", "points": ["point essentiel expliqué en une phrase"]}],
  "definitions": [{"terme": "...", "sens": "définition précise"}],
  "aRetenirParCoeur": [{"intitule": "formule, date, règle…", "detail": "ce que ça veut dire / quand l'utiliser"}],
  "methodes": [{"titre": "Comment faire…", "etapes": ["étape 1", "étape 2"]}],
  "exemples": ["exemple concret ou exercice résolu court"],
  "pieges": ["erreur fréquente à éviter au contrôle"],
  "questions": [{"question": "question de contrôle", "reponse": "réponse attendue, courte"}],
  "qcm": [{"question": "...", "choix": ["A", "B", "C", "D"], "bonne": 0, "explication": "pourquoi"}],
  "aVerifier": ["notion probablement au programme mais absente du texte fourni"],
  "motsCles": ["mot"]
}
Vise : 3 à 6 parties dans "plan", 8 à 12 "questions", 5 à 8 "qcm" (bonne = index 0-3 de la bonne réponse). Laisse un tableau vide si une rubrique n'a pas de sens pour ce chapitre (ex. pas de formules en histoire).`;
}

// --- Validation -------------------------------------------------------

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);
const objs = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : [];

/** Gemini entoure parfois le JSON de ```json … ``` malgré la consigne. */
function extraireJson(brut: string): unknown {
  const sansBalises = brut.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  try {
    return JSON.parse(sansBalises);
  } catch {
    const debut = sansBalises.indexOf("{");
    const fin = sansBalises.lastIndexOf("}");
    if (debut >= 0 && fin > debut) return JSON.parse(sansBalises.slice(debut, fin + 1));
    throw new Error("Gemini a renvoyé une fiche illisible. Réessaie.");
  }
}

export function validerFicheIA(v: unknown): FicheIA {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    resume: strs(o.resume),
    plan: objs(o.plan)
      .map((p) => ({ titre: str(p.titre), points: strs(p.points) }))
      .filter((p) => p.titre && p.points.length),
    definitions: objs(o.definitions)
      .map((d) => ({ terme: str(d.terme), sens: str(d.sens) }))
      .filter((d) => d.terme && d.sens),
    aRetenirParCoeur: objs(o.aRetenirParCoeur)
      .map((d) => ({ intitule: str(d.intitule), detail: str(d.detail) }))
      .filter((d) => d.intitule),
    methodes: objs(o.methodes)
      .map((m) => ({ titre: str(m.titre), etapes: strs(m.etapes) }))
      .filter((m) => m.titre && m.etapes.length),
    exemples: strs(o.exemples),
    pieges: strs(o.pieges),
    questions: objs(o.questions)
      .map((q) => ({ question: str(q.question), reponse: str(q.reponse) }))
      .filter((q) => q.question && q.reponse),
    qcm: objs(o.qcm)
      .map((q) => ({
        question: str(q.question),
        choix: strs(q.choix),
        bonne: typeof q.bonne === "number" ? Math.round(q.bonne) : -1,
        explication: str(q.explication),
      }))
      // Un QCM dont la bonne réponse ne pointe sur aucun choix apprendrait
      // une erreur : on le jette plutôt que de le montrer.
      .filter((q) => q.question && q.choix.length >= 2 && q.bonne >= 0 && q.bonne < q.choix.length),
    aVerifier: strs(o.aVerifier),
    motsCles: strs(o.motsCles),
  };
}

export async function genererFicheIA(
  input: { titre: string; matiere: string; texteSource: string },
  apiKey: string | null
): Promise<FicheIA> {
  const brut = await askGemini(
    consigne({ titre: input.titre, matiere: input.matiere, texte: stripHtml(input.texteSource) }),
    {
      apiKey,
      system: SYSTEM,
      generation: { temperature: 0.3, maxOutputTokens: 8192, responseMimeType: "application/json" },
    }
  );
  const fiche = validerFicheIA(extraireJson(brut));
  if (!fiche.resume.length && !fiche.plan.length) {
    throw new Error("Gemini n'a pas réussi à construire la fiche. Réessaie ou ajoute du cours.");
  }
  return fiche;
}

/**
 * Cartes d'une fiche : les vraies questions de Gemini d'abord (bien meilleures
 * que des textes à trou), puis ses définitions, puis les cartes locales en
 * repli quand la fiche n'a jamais été approfondie.
 */
export function cartesDeFiche(f: { genere: FicheGeneree; ia?: FicheIA }): Carte[] {
  if (!f.ia) return cartesDepuisFiche(f.genere);
  return [
    ...f.ia.questions.map((q): Carte => ({ recto: q.question, verso: q.reponse, source: "definition" })),
    ...f.ia.definitions.map((d): Carte => ({ recto: d.terme, verso: d.sens, source: "definition" })),
  ];
}
