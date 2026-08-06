// Fonction serverless Vercel — relaie les requêtes vers Pronote côté serveur.
// Nécessaire uniquement pour la version WEB de l'app : les serveurs Pronote
// n'acceptent pas les requêtes envoyées directement depuis un navigateur (CORS).
// L'app mobile (Expo Go / build native) n'utilise pas ce fichier du tout.
//
// Sécurité : n'autorise que les domaines index-education.net/.com pour éviter
// que ce endpoint serve de proxy ouvert vers n'importe quel site.

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { url, method, content, headers, redirect } = body;

    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "url manquante" });
      return;
    }

    let target;
    try {
      target = new URL(url);
    } catch {
      res.status(400).json({ error: "url invalide" });
      return;
    }

    const allowedHost = /(^|\.)index-education\.(net|com)$/i.test(target.hostname);
    if (!allowedHost) {
      res.status(400).json({ error: "Domaine non autorisé par ce proxy" });
      return;
    }

    const upstream = await fetch(target.toString(), {
      method: method || "GET",
      headers: headers || {},
      body: content,
      redirect: redirect || "follow",
    });

    const text = await upstream.text();
    const outHeaders = {};
    upstream.headers.forEach((value, key) => {
      outHeaders[key] = value;
    });

    res.status(200).json({
      status: upstream.status,
      content: text,
      headers: outHeaders,
    });
  } catch (err) {
    res.status(502).json({ error: "Erreur proxy : " + (err && err.message ? err.message : String(err)) });
  }
};
