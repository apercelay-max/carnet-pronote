// Fonction serverless Vercel — relaie les requêtes vers l'API Gemini de Google.
//
// Pourquoi passer par le serveur : l'API Gemini exige une clé, et une clé
// écrite dans le code de l'app serait lisible par n'importe qui (le bundle web
// est public). Elle vit donc uniquement dans la variable d'environnement
// GEMINI_API_KEY du projet Vercel.
//
// Une personne qui préfère utiliser SA propre clé n'a pas besoin de ce
// fichier : l'app appelle alors Google directement depuis l'appareil (voir
// src/lib/gemini.ts). Ce endpoint n'est que le chemin "sans rien à
// configurer".

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    // 501 et pas 500 : ce n'est pas une panne, c'est une fonctionnalité non
    // configurée. L'app s'en sert pour proposer de coller sa propre clé plutôt
    // que d'afficher une erreur incompréhensible.
    res.status(501).json({ error: "Aucune clé Gemini configurée sur le serveur." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { model, contents, systemInstruction, generationConfig } = body;

    if (!Array.isArray(contents) || contents.length === 0) {
      res.status(400).json({ error: "contents manquant" });
      return;
    }

    // Le modèle vient de l'app mais n'est pas recopié tel quel dans l'URL :
    // sans cette liste, ce endpoint laisserait appeler n'importe quel chemin de
    // l'API Google avec la clé du serveur.
    const ALLOWED = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"];
    const chosen = ALLOWED.includes(model) ? model : ALLOWED[0];

    const upstream = await fetch(`${ENDPOINT}/${chosen}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents, systemInstruction, generationConfig }),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(text);
  } catch (err) {
    res.status(502).json({ error: `Gemini injoignable : ${err?.message ?? err}` });
  }
};
