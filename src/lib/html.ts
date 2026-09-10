// Nettoyage du HTML que Pronote renvoie dans les descriptions.
//
// Pourquoi ce fichier existe : Pronote ne renvoie PAS du texte brut. Selon la
// façon dont le prof a saisi son devoir (copier-coller depuis Word, éditeur
// riche de Pronote…), `assignment.description` peut arriver sous la forme
//   <div style="font-family: Arial; font-size: 13px;">N°17 et 19* p. 22.</div>
//   <div style="font-family: Arial; font-size: 13px;">&nbsp;</div>
// React Native affiche une chaîne telle quelle : la personne lisait donc les
// balises à l'écran au lieu de son devoir. On nettoie donc AVANT affichage,
// partout où une description Pronote est rendue.

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  rsquo: "'",
  lsquo: "'",
  ldquo: '"',
  rdquo: '"',
  hellip: "…",
  eacute: "é",
  egrave: "è",
  ecirc: "ê",
  euml: "ë",
  agrave: "à",
  acirc: "â",
  ccedil: "ç",
  ugrave: "ù",
  ucirc: "û",
  icirc: "î",
  iuml: "ï",
  ocirc: "ô",
  oelig: "œ",
  deg: "°",
  euro: "€",
  laquo: "«",
  raquo: "»",
  ndash: "–",
  mdash: "—",
  bull: "•",
};

/** `&eacute;` / `&#233;` / `&#xE9;` -> le vrai caractère. */
function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (whole, name) => NAMED_ENTITIES[name.toLowerCase()] ?? whole);
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

/**
 * Enlève le HTML en gardant les retours à la ligne et les liens.
 *
 * Les `<a href="…">` sont conservés sous forme d'URL en clair : un devoir qui
 * renvoie vers une vidéo explicative perdrait tout son intérêt si le lien
 * disparaissait avec la balise. `linkify()` les rend ensuite cliquables.
 */
export function stripHtml(input: string): string {
  if (!input) return "";
  return decodeEntities(
    input
      // <a href="URL">texte</a> -> "texte (URL)", ou juste l'URL si le texte
      // du lien EST déjà l'URL (cas le plus fréquent dans Pronote).
      .replace(
        /<\s*a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\s*\/\s*a\s*>/gi,
        (_, href: string, label: string) => {
          const texte = label.replace(/<[^>]+>/g, "").trim();
          if (!texte || texte === href) return ` ${href} `;
          return ` ${texte} (${href}) `;
        }
      )
      .replace(/<\s*(script|style)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\s*\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, "\n")
      .replace(/<\s*li[^>]*>/gi, "\n• ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type TextSegment = { text: string; url?: string };

const URL_RE = /(https?:\/\/[^\s<>()"']+)/gi;

/**
 * Découpe un texte déjà nettoyé en segments texte / lien, pour pouvoir rendre
 * les URL en cliquable sans avoir à interpréter du HTML côté affichage.
 */
export function linkify(input: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  URL_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = URL_RE.exec(input)) !== null) {
    if (match.index > last) segments.push({ text: input.slice(last, match.index) });
    // La ponctuation finale colle souvent à l'URL dans un texte écrit à la
    // main ("…watch?v=abc." ) — on la rend au texte plutôt qu'au lien.
    let url = match[0];
    const trailing = url.match(/[.,;:!?)]+$/);
    if (trailing) url = url.slice(0, url.length - trailing[0].length);
    segments.push({ text: url, url });
    if (trailing) segments.push({ text: trailing[0] });
    last = match.index + match[0].length;
  }
  if (last < input.length) segments.push({ text: input.slice(last) });
  return segments;
}
