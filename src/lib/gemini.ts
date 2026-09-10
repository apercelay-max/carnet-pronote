// Client Gemini.
//
// Deux chemins, dans cet ordre :
//  1. clé personnelle saisie dans l'app -> appel direct à Google depuis
//     l'appareil (la clé ne transite par aucun serveur intermédiaire) ;
//  2. sinon -> /api/gemini, la fonction serverless qui utilise la clé du
//     projet Vercel. C'est le chemin "rien à configurer", mais tout le monde
//     y partage le même quota.
//
// Si aucun des deux n'est disponible, on lève une erreur explicite plutôt que
// d'afficher un échec générique : l'écran s'en sert pour proposer de coller sa
// propre clé.

import { Platform } from "react-native";

// Google retire les anciens modèles pour les NOUVELLES clés API : une clé
// créée aujourd'hui reçoit « no longer available to new users » sur
// gemini-2.5-flash. Ce nom est donc à re-vérifier si l'assistant se remet à
// répondre une erreur de modèle.
export const GEMINI_MODEL = "gemini-3.6-flash";

const DIRECT_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** Adresse du relais serveur. Sur mobile il faut une URL absolue. */
const PROXY_URL =
  Platform.OS === "web" ? "/api/gemini" : "https://carnet-pronote.vercel.app/api/gemini";

export class GeminiNotConfiguredError extends Error {}
export class GeminiError extends Error {}

export type GeminiTurn = { role: "user" | "model"; text: string };

type AskOptions = {
  /** Clé personnelle. Vide/absente -> passage par le relais serveur. */
  apiKey?: string | null;
  /** Consignes permanentes (rôle, ton, format des réponses). */
  system?: string;
  /** Échange précédent, pour que Gemini garde le fil. */
  history?: GeminiTurn[];
  signal?: AbortSignal;
};

export async function askGemini(question: string, options: AskOptions = {}): Promise<string> {
  const { apiKey, system, history = [], signal } = options;

  const contents = [
    ...history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    { role: "user", parts: [{ text: question }] },
  ];

  const payload: Record<string, unknown> = {
    model: GEMINI_MODEL,
    contents,
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
  };
  if (system) payload.systemInstruction = { parts: [{ text: system }] };

  const cleanKey = apiKey?.trim();
  const res = cleanKey
    ? await fetch(DIRECT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": cleanKey },
        body: JSON.stringify(payload),
        signal,
      })
    : await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      });

  // 501 = le relais existe mais n'a pas de clé. 404 = il n'existe pas du tout
  // (serveur de développement local, ou déploiement sans les fonctions
  // serverless). Dans les deux cas la seule issue côté utilisateur est la même :
  // fournir sa propre clé.
  if (!cleanKey && (res.status === 501 || res.status === 404)) {
    throw new GeminiNotConfiguredError(
      "Aucune clé Gemini n'est configurée côté serveur. Colle la tienne ci-dessous pour activer l'assistant."
    );
  }

  const raw = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(raw);
  } catch {
    /* réponse non-JSON : on garde `raw` pour le message d'erreur */
  }

  if (!res.ok) {
    const message = data?.error?.message ?? data?.error ?? raw.slice(0, 200);
    if (res.status === 400 && /API key/i.test(String(message))) {
      throw new GeminiError("Cette clé Gemini n'est pas valide.");
    }
    if (res.status === 429) {
      throw new GeminiError("Quota Gemini dépassé pour l'instant — réessaie dans un moment.");
    }
    throw new GeminiError(String(message) || `Erreur Gemini (HTTP ${res.status})`);
  }

  const candidate = data?.candidates?.[0];
  const texte = (candidate?.content?.parts ?? [])
    .map((p: any) => p?.text ?? "")
    .join("")
    .trim();

  if (!texte) {
    // Réponse vide = presque toujours un filtre de sécurité côté Google. Le
    // dire franchement vaut mieux qu'afficher une bulle vide.
    const raison = candidate?.finishReason;
    throw new GeminiError(
      raison && raison !== "STOP"
        ? `Gemini n'a pas répondu (${raison}).`
        : "Gemini a renvoyé une réponse vide."
    );
  }

  return texte;
}
