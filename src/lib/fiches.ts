// Moteur de fiches de révision — 100% local, AUCUNE IA, aucune clé API,
// aucun appel réseau. Tout se calcule sur l'appareil.
//
// Pourquoi pas d'IA : l'app tourne dans le navigateur (PWA). Le modèle
// on-device d'Apple n'est accessible qu'à une app native compilée sur un
// iPhone récent, et Safari n'expose aucun modèle au JavaScript. Embarquer un
// petit modèle coûterait ~1 Go de téléchargement pour une qualité faible en
// français. On assume donc de l'EXTRACTION, pas de la génération : on
// sélectionne et réorganise les phrases de la leçon, on n'en invente jamais.
//
// Conséquence assumée, à dire clairement dans l'interface : la qualité de la
// fiche dépend entièrement de la qualité du texte fourni.

const STOPWORDS = new Set(
  ("au aux avec ce ces dans de des du elle en et eux il ils je la le les leur lui ma mais me meme mes moi mon ne " +
    "nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous " +
    "c d j l a m n s t y ete etee etees etes etant suis es est sommes etes sont serai seras sera serons serez " +
    "seront avoir avais avait avions aviez avaient eu eue eues eus ai as avons avez ont etais etait etions etiez " +
    "etaient fus fut fumes futes furent aussi alors donc car comme si tout tous toute toutes plus moins tres bien " +
    "peut peuvent doit doivent fait faire cette cet celui celle ceux entre apres avant depuis pendant sans sous " +
    "chaque autre autres meme deux trois lors afin ainsi ici la-bas cela ceci"
  ).split(/\s+/)
);

/** Marqueurs qui signalent une phrase à retenir dans un cours. */
const MARQUEURS = [
  "définition",
  "definition",
  "on appelle",
  "se définit",
  "est défini",
  "théorème",
  "theoreme",
  "propriété",
  "propriete",
  "formule",
  "loi de",
  "principe",
  "règle",
  "regle",
  "il faut retenir",
  "à retenir",
  "a retenir",
  "on retient",
  "attention",
  "important",
  "remarque",
  "conséquence",
  "consequence",
  "donc",
  "ainsi",
  "c'est-à-dire",
  "autrement dit",
  "en résumé",
  "en resume",
  "conclusion",
];

/** Enlève le HTML que Pronote renvoie parfois, en gardant les retours ligne. */
export function stripHtml(input: string): string {
  return input
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "\n• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&(#39|rsquo|apos);/gi, "'")
    .replace(/&(quot|ldquo|rdquo);/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalise(mot: string): string {
  return mot
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9'-]/g, "");
}


/**
 * Coupe une ligne en phrases APRÈS une ponctuation forte.
 * Écrit à la main plutôt qu'avec un lookbehind (`(?<=...)`) : un lookbehind
 * lève une SyntaxError au chargement du module sur les vieux Safari, ce qui
 * donnerait un écran blanc complet au lieu d'une simple fonctionnalité en
 * moins. L'app doit marcher sur tous les iPhones.
 */
function couperEnPhrases(ligne: string): string[] {
  const out: string[] = [];
  let courant = "";
  for (let i = 0; i < ligne.length; i++) {
    const ch = ligne[i];
    courant += ch;
    if (".!?\u2026:".indexOf(ch) === -1) continue;
    const suite = ligne.slice(i + 1);
    const m = suite.match(/^\s+/);
    if (!m) continue;
    const apres = suite[m[0].length];
    if (apres && /[A-Z\u00c0-\u00ff0-9\u00ab"\u2022-]/.test(apres)) {
      out.push(courant);
      courant = "";
      i += m[0].length;
    }
  }
  if (courant) out.push(courant);
  return out;
}

/** Découpe en phrases, en respectant aussi les puces et les retours ligne. */
export function decouperPhrases(texte: string): string[] {
  return texte
    .split(/\n+/)
    .flatMap((ligne) => couperEnPhrases(ligne))
    .map((p) => p.replace(/^[\s•\-–*]+/, "").trim())
    .filter((p) => p.length >= 15)
    // Un fragment court sans ponctuation finale est presque toujours un titre
    // de leçon ou un fragment de tableau. Le garder polluait le résumé avec
    // des entrées comme « La Révolution française » qui n'apprennent rien.
    .filter((p) => p.length >= 45 || /[.!?…:;]$/.test(p));
}

/** Fréquence des mots significatifs (sert au score des phrases et aux mots-clés). */
function frequences(phrases: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  phrases.forEach((p) => {
    p.split(/[\s'’,;()[\]"«»]+/).forEach((brut) => {
      const mot = normalise(brut);
      if (mot.length < 4 || STOPWORDS.has(mot) || /^\d+$/.test(mot)) return;
      freq.set(mot, (freq.get(mot) ?? 0) + 1);
    });
  });
  return freq;
}

function contientMarqueur(phrase: string): boolean {
  const bas = phrase.toLowerCase();
  return MARQUEURS.some((m) => bas.includes(m));
}

/**
 * Score d'une phrase : densité de mots fréquents du texte, plus un bonus pour
 * les marqueurs de cours et les phrases chiffrées (dates, formules, valeurs),
 * moins un malus pour les phrases trop longues qui font de mauvaises puces.
 */
function scorer(phrase: string, freq: Map<string, number>, index: number, total: number): number {
  const mots = phrase.split(/[\s'’,;()[\]"«»]+/).map(normalise).filter((m) => m.length >= 4 && !STOPWORDS.has(m));
  if (mots.length === 0) return 0;

  const densite = mots.reduce((acc, m) => acc + (freq.get(m) ?? 0), 0) / mots.length;
  let score = densite;

  if (contientMarqueur(phrase)) score *= 1.6;
  if (/\d/.test(phrase)) score *= 1.15;
  if (phrase.length > 240) score *= 0.7;
  // Les premières phrases d'une leçon posent en général le sujet.
  if (index < total * 0.15) score *= 1.2;

  return score;
}

function classer(phrases: string[]): { phrase: string; index: number; score: number }[] {
  const freq = frequences(phrases);
  return phrases
    .map((phrase, index) => ({ phrase, index, score: scorer(phrase, freq, index, phrases.length) }))
    .sort((a, b) => b.score - a.score);
}

/** Résumé : les N phrases les mieux notées, remises dans l'ordre du cours. */
export function resumer(texte: string, n = 4): string[] {
  const phrases = decouperPhrases(texte);
  if (phrases.length <= n) return phrases;
  return classer(phrases)
    .slice(0, n)
    .sort((a, b) => a.index - b.index)
    .map((p) => p.phrase);
}

/** Points importants : d'abord les phrases à marqueur, complétées par le score. */
export function pointsImportants(texte: string, n = 6): string[] {
  const phrases = decouperPhrases(texte);
  const notees = classer(phrases);

  const avecMarqueur = notees.filter((p) => contientMarqueur(p.phrase));
  const reste = notees.filter((p) => !contientMarqueur(p.phrase));
  const choisies = [...avecMarqueur, ...reste].slice(0, n);

  return choisies.sort((a, b) => a.index - b.index).map((p) => raccourcir(p.phrase));
}

/**
 * Définitions repérées : « X est ... », « X désigne ... », « X : ... ».
 * On ne garde que ce qui ressemble vraiment à un terme (court, à gauche).
 */
export function definitions(texte: string, n = 6): { terme: string; sens: string }[] {
  const trouvees: { terme: string; sens: string }[] = [];
  const vus = new Set<string>();

  decouperPhrases(texte).forEach((phrase) => {
    const paire = extraireDefinition(phrase);
    if (!paire) return;

    const cle = normalise(paire.terme);
    if (vus.has(cle)) return;

    vus.add(cle);
    trouvees.push(paire);
  });

  return trouvees.slice(0, n);
}

/**
 * Mots qui ANNONCENT une définition sans en être le sujet. Sans ce garde-fou,
 * « Définition : une fonction affine est… » produit le terme « Définition »,
 * ce qui ne veut rien dire dans une fiche. Quand on tombe dessus, on relance
 * l'extraction sur la partie droite pour trouver le vrai terme.
 */
const MOTS_STRUCTURE = new Set([
  "definition",
  "attention",
  "propriete",
  "theoreme",
  "remarque",
  "exemple",
  "exemples",
  "conclusion",
  "important",
  "regle",
  "rappel",
  "note",
  "methode",
  "objectif",
  "resume",
  "consequence",
  "principe",
  "formule",
  "vocabulaire",
  "demonstration",
  "propriétés",
]);

function extraireDefinition(phrase: string, profondeur = 0): { terme: string; sens: string } | null {
  if (profondeur > 1) return null;

  const m =
    phrase.match(/^(.{3,45}?)\s*:\s*(.{15,})$/) ??
    phrase.match(/^(.{3,45}?)\s+(?:est|sont|désigne|designe|se définit comme|se definit comme)\s+(.{15,})$/i);
  if (!m) return null;

  const terme = m[1].replace(/^(le|la|les|un|une|des|l')\s+/i, "").trim();
  if (!terme || terme.split(/\s+/).length > 6) return null;

  // Une proposition conditionnelle ou coordonnée n'est pas un terme :
  // « Si a est positif… » ne doit pas devenir une entrée de lexique.
  if (/^(si|quand|lorsqu|lorsque|donc|alors|car|mais|or|puis|ensuite|enfin|ainsi)\b/i.test(terme)) return null;
  if (terme.includes(",")) return null;

  // Terme purement structurel -> on cherche la vraie définition à droite.
  if (MOTS_STRUCTURE.has(normalise(terme))) return extraireDefinition(m[2].trim(), profondeur + 1);

  return { terme, sens: raccourcir(m[2]) };
}

/**
 * Mots-clés les plus présents — utiles pour se tester de mémoire.
 * On compte sur la forme normalisée (pour regrouper « Élève » et « eleve »)
 * mais on RESTITUE la graphie réelle du texte : afficher « appele » au lieu
 * de « appelé » dans une fiche de révision fait immédiatement bâclé.
 */
export function motsCles(texte: string, n = 8): string[] {
  const phrases = decouperPhrases(texte);
  const compte = new Map<string, number>();
  const graphie = new Map<string, string>();

  phrases.forEach((p) => {
    p.split(/[\s'’,;()[\]"«»]+/).forEach((brut) => {
      const propre = brut.replace(/[.!?…:;]+$/, "");
      const cle = normalise(propre);
      if (cle.length < 4 || STOPWORDS.has(cle) || /^\d+$/.test(cle)) return;
      compte.set(cle, (compte.get(cle) ?? 0) + 1);
      // On garde la première graphie vue en minuscules, accents compris.
      if (!graphie.has(cle)) graphie.set(cle, propre.toLowerCase());
    });
  });

  return [...compte.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([cle]) => graphie.get(cle) ?? cle);
}

function raccourcir(phrase: string, max = 180): string {
  const propre = phrase.trim().replace(/\s+/g, " ");
  if (propre.length <= max) return propre;
  const coupe = propre.slice(0, max);
  const dernierEspace = coupe.lastIndexOf(" ");
  return `${coupe.slice(0, dernierEspace > 0 ? dernierEspace : max)}…`;
}

export type FicheGeneree = {
  resume: string[];
  points: string[];
  definitions: { terme: string; sens: string }[];
  motsCles: string[];
  /** Nombre de phrases exploitables trouvées : sert à prévenir si c'est trop maigre. */
  phrasesTrouvees: number;
};

export function genererFiche(texteBrut: string): FicheGeneree {
  const texte = stripHtml(texteBrut);
  const phrases = decouperPhrases(texte);

  return {
    resume: resumer(texte, 4),
    points: pointsImportants(texte, 6),
    definitions: definitions(texte, 5),
    motsCles: motsCles(texte, 8),
    phrasesTrouvees: phrases.length,
  };
}

// --- Flashcards --------------------------------------------------------

export type Carte = { recto: string; verso: string; source: "definition" | "trou" };

/**
 * Fabrique des cartes recto-verso à partir d'une fiche DÉJÀ générée.
 * Aucune IA ici non plus : deux mécanismes seulement.
 *  1. Chaque définition trouvée devient une carte terme -> sens.
 *  2. Chaque point clé contenant un mot-clé important devient un texte à trou.
 *
 * On ne fabrique JAMAIS de fausse question : si la fiche ne contient ni
 * définition ni mot-clé exploitable, on renvoie une liste vide et l'écran le
 * dit franchement plutôt que d'inventer des questions creuses.
 */
export function cartesDepuisFiche(f: FicheGeneree): Carte[] {
  const cartes: Carte[] = [];
  const vus = new Set<string>();

  f.definitions.forEach((d) => {
    const cle = normalise(d.terme);
    if (vus.has(cle)) return;
    vus.add(cle);
    cartes.push({ recto: d.terme, verso: d.sens, source: "definition" });
  });

  // Textes à trou : on masque le mot-clé le plus significatif de la phrase.
  // On saute les points déjà couverts par une définition, sinon on pose deux
  // fois la même question sous deux formes.
  f.points.forEach((point) => {
    const motCache = f.motsCles.find((m) => {
      const cle = normalise(m);
      return cle.length >= 5 && !vus.has(cle) && contientMot(point, m);
    });
    if (!motCache) return;

    vus.add(normalise(motCache));
    cartes.push({
      recto: masquerMot(point, motCache),
      verso: motCache,
      source: "trou",
    });
  });

  return cartes;
}

/** Le mot apparaît-il dans la phrase, indépendamment des accents et de la casse ? */
function contientMot(phrase: string, mot: string): boolean {
  return phrase
    .split(/[\s'’,;.()[\]"«»:!?]+/)
    .some((brut) => normalise(brut) === normalise(mot));
}

/** Remplace toutes les occurrences du mot par des points de suspension. */
function masquerMot(phrase: string, mot: string): string {
  const cible = normalise(mot);
  return phrase
    .split(/(\s+)/)
    .map((morceau) => {
      if (/^\s+$/.test(morceau)) return morceau;
      // On isole la ponctuation collée au mot pour ne pas l'effacer avec.
      const m = morceau.match(/^([^\wÀ-ÿ]*)(.*?)([^\wÀ-ÿ]*)$/);
      if (!m) return morceau;
      return normalise(m[2]) === cible ? `${m[1]}______${m[3]}` : morceau;
    })
    .join("");
}
