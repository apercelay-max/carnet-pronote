// Fetcher utilisé UNIQUEMENT sur le web : les serveurs Pronote refusent les
// requêtes envoyées directement depuis un navigateur (CORS — même souci que
// n'importe quelle API non publique). Sur mobile, l'app native n'est pas
// concernée et utilise le fetch normal de pawnote.
//
// Ici, on relaie chaque requête vers /api/pronote-proxy, une fonction
// serverless Vercel qui fait la vraie requête côté serveur (donc sans CORS)
// et renvoie le résultat tel quel.

function headersToObject(h?: Record<string, string> | Headers): Record<string, string> {
  if (!h) return {};
  if (typeof Headers !== "undefined" && h instanceof Headers) {
    const out: Record<string, string> = {};
    h.forEach((value, key) => (out[key] = value));
    return out;
  }
  return h as Record<string, string>;
}

export async function webProxyFetcher(req: {
  url: URL | string;
  method?: string;
  content?: string;
  headers?: Record<string, string> | Headers;
  redirect?: "follow" | "manual";
}) {
  const res = await fetch("/api/pronote-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: req.url.toString(),
      method: req.method ?? "GET",
      content: req.content,
      headers: headersToObject(req.headers),
      redirect: req.redirect ?? "follow",
    }),
  });

  if (!res.ok) {
    throw new Error(`Proxy Pronote indisponible (HTTP ${res.status})`);
  }

  const data = await res.json();
  return {
    status: data.status as number,
    content: data.content as string,
    headers: (data.headers ?? {}) as Record<string, string>,
  };
}
