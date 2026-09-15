// Contrôle blanc : Gemini écrit un vrai sujet à partir d'une fiche, l'élève
// répond, Gemini corrige avec un barème sur 20.
//
// Deux appels séparés plutôt qu'un : le sujet est affiché SANS les éléments
// de réponse attendus (sinon l'élève les verrait), et la correction reçoit le
// sujet complet avec ces attendus pour noter de façon cohérente.

import { askGemini } from "./gemini";
import type { Fiche } from "../store/useFichesStore";

export type QuestionBlanc = { question: string; points: number; attendu: string };
export type SujetBlanc = { consigne: string; questions: QuestionBlanc[] };
export type CorrectionBlanc = {
  note: number;
  appreciation: string;
  parQuestion: { points: number; commentaire: string; correction: string }[];
  aRevoir: string[];
};

const SYSTEM = `Tu es un professeur français de collège/lycée. Tu écris et corriges des évaluations réalistes, au niveau du programme, en français clair.
Tu réponds UNIQUEMENT avec un objet JSON valide.`;

function parser(brut: string): any {
  try {
    return JSON.parse(brut.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, ""));
  } catch {
    throw new Error("Gemini a renvoyé une réponse illisible. Réessaie.");
  }
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Contenu de la fiche à donner à Gemini : la version approfondie si elle existe. */
function contenuFiche(f: Fiche): string {
  if (f.ia) {
    const ia = f.ia;
    return [
      ...ia.resume,
      ...ia.plan.flatMap((p) => [`# ${p.titre}`, ...p.points]),
      ...ia.definitions.map((d) => `${d.terme} : ${d.sens}`),
      ...ia.aRetenirParCoeur.map((d) => `${d.intitule} : ${d.detail}`),
      ...ia.methodes.flatMap((m) => [m.titre, ...m.etapes]),
    ].join("\n");
  }
  return f.texteSource.slice(0, 20000);
}

export async function genererSujet(fiche: Fiche, apiKey: string | null): Promise<SujetBlanc> {
  const o = parser(
    await askGemini(
      `Matière : ${fiche.matiere}
Chapitre : ${fiche.titre}

Contenu du chapitre :
"""
${contenuFiche(fiche)}
"""

Écris un contrôle blanc réaliste de 30 minutes sur ce chapitre, noté sur 20, au format JSON :
{
  "consigne": "consigne générale courte",
  "questions": [{"question": "énoncé", "points": 3, "attendu": "éléments de réponse attendus pour avoir tous les points"}]
}
5 à 7 questions qui mélangent : restitution (définitions, dates, formules), compréhension (expliquer, justifier) et application (exercice, analyse de document décrit dans l'énoncé). La somme des points doit faire exactement 20.`,
      { apiKey, system: SYSTEM, generation: { temperature: 0.6, maxOutputTokens: 8192, responseMimeType: "application/json" } }
    )
  );

  let questions: QuestionBlanc[] = (Array.isArray(o?.questions) ? o.questions : [])
    .map((q: any) => ({ question: str(q?.question), points: Number(q?.points) || 0, attendu: str(q?.attendu) }))
    .filter((q: QuestionBlanc) => q.question && q.points > 0);
  if (questions.length === 0) throw new Error("Gemini n'a pas réussi à écrire le sujet. Réessaie.");

  // Barème ramené à 20 si Gemini s'est trompé dans l'addition : la note
  // finale doit rester lisible « sur 20 ».
  const somme = questions.reduce((a, q) => a + q.points, 0);
  if (Math.abs(somme - 20) > 0.01) {
    questions = questions.map((q) => ({ ...q, points: Math.round((q.points / somme) * 20 * 2) / 2 }));
  }
  return { consigne: str(o?.consigne), questions };
}

export async function corrigerCopie(
  fiche: Fiche,
  sujet: SujetBlanc,
  reponses: string[],
  apiKey: string | null
): Promise<CorrectionBlanc> {
  const copie = sujet.questions
    .map(
      (q, i) =>
        `Question ${i + 1} (${q.points} pts) : ${q.question}\nÉléments attendus : ${q.attendu}\nRéponse de l'élève : ${reponses[i]?.trim() || "(pas de réponse)"}`
    )
    .join("\n\n");

  const o = parser(
    await askGemini(
      `Matière : ${fiche.matiere} — ${fiche.titre}

Corrige cette copie de contrôle blanc comme un professeur exigeant mais bienveillant. Accorde des points partiels quand la réponse est incomplète ; ne donne pas de points pour une réponse vide ou hors sujet.

${copie}

Réponds au format JSON :
{
  "parQuestion": [{"points": 2.5, "commentaire": "ce qui est juste / ce qui manque, en s'adressant à l'élève", "correction": "la réponse modèle, courte"}],
  "appreciation": "appréciation générale en 2 phrases",
  "aRevoir": ["notion précise à revoir"]
}
"parQuestion" contient exactement ${sujet.questions.length} éléments, dans l'ordre.`,
      { apiKey, system: SYSTEM, generation: { temperature: 0.2, maxOutputTokens: 8192, responseMimeType: "application/json" } }
    )
  );

  const parQuestion = sujet.questions.map((q, i) => {
    const c = Array.isArray(o?.parQuestion) ? o.parQuestion[i] : null;
    // Points bornés au barème de la question : Gemini ne doit pas pouvoir
    // donner 5 points sur une question à 3.
    const points = Math.max(0, Math.min(q.points, Number(c?.points) || 0));
    return { points, commentaire: str(c?.commentaire), correction: str(c?.correction) || q.attendu };
  });
  const note = Math.round(parQuestion.reduce((a, q) => a + q.points, 0) * 2) / 2;
  return {
    note,
    appreciation: str(o?.appreciation),
    parQuestion,
    aRevoir: Array.isArray(o?.aRevoir) ? o.aRevoir.map(str).filter(Boolean) : [],
  };
}
