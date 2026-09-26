// Devoirs intelligents : comprendre CE QUE demande un devoir, à partir de son
// texte, pour le ranger au bon endroit (sac de cours, leçon, planning…).
//
// Tout est calculé sur l'appareil, par mots-clés : deux personnes qui voient le
// même texte obtiennent donc exactement le même classement (rien à synchroniser
// entre les membres d'un groupe). Quand un texte ne ressemble à rien de connu,
// on ne devine pas : le devoir reste « autre » et n'alimente rien.

import { stripHtml } from "./html";

export type TypeDevoir = "lecon" | "exercices" | "apporter" | "redaction" | "expose" | "papier";

export const LIBELLE_TYPE: Record<TypeDevoir, string> = {
  lecon: "Leçon",
  exercices: "Exercices",
  apporter: "À apporter",
  redaction: "Rédaction",
  expose: "Exposé",
  papier: "Papier",
};

export type AnalyseDevoir = {
  types: TypeDevoir[];
  /** Ce qu'il faut mettre dans le sac (« calculatrice », « dictionnaire »…). */
  objets: string[];
  /** Le devoir est-il de type « copier / recopier la leçon » ? */
  copierLecon: boolean;
  /** Le devoir demande-t-il d'apprendre / relire / réviser ? */
  apprendreLecon: boolean;
  /** Numéro ou titre de leçon cité dans le texte, s'il y en a un (« 4 », « les fonctions »). */
  leconCitee: string | null;
  /** Sous-tâches détectées (« Exercice 3 », « Exercice 5 »…). Vide sous 2 éléments. */
  sousTaches: string[];
  /** Durée estimée en minutes, ou null quand rien ne permet d'en donner une. */
  dureeEstimee: number | null;
};

export function normaliser(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Texte brut d'une description Pronote (HTML, entités, espaces). */
export function texteBrut(description: unknown): string {
  return stripHtml(String(description ?? "")).replace(/\s+/g, " ").trim();
}

// --- Détection des types --------------------------------------------------

const RE_COPIER = /\b(copier|recopier|copie|recopie|copiez|recopiez)\b[^.;]*\b(lecon|cours|chapitre|resume|definition|fiche|trace ecrite)/;
const RE_COPIER_COURT = /\b(copier|recopier|copie|recopie|copiez|recopiez)\b/;
const RE_APPRENDRE = /\b(lire (la |le |les )?(lecon|chapitre|cours)|apprendre|apprenez|apprends|relire|relisez|reviser|revisez|revision|savoir|retenir|memoriser|lecon a savoir)\b/;
const RE_EXERCICES = /\b(ex(ercices?|o|os)?\.?|n[°º]|question|probleme|problemes|activite|activites|calculs?)\b\s*(n[°º]\s*)?\d/;
const RE_EXERCICES_MOT = /\b(exercices?|exos?|fiche d'exercices|feuille d'exercices|entrainement)\b/;
const RE_REDACTION = /\b(redaction|rediger|redigez|dissertation|commentaire|paragraphe|compte[- ]rendu|devoir maison|dm|ecrire un|ecrivez un|texte a ecrire|lettre)\b/;
const RE_EXPOSE = /\b(expose|exposes|presentation orale|presenter|preparez un expose|diaporama|powerpoint)\b/;
const RE_PAPIER =
  /\b(signer|signature|faire signer|autorisation|rendre le papier|rapporter le|coupon|carnet de correspondance|justificatif|talon)\b/;
// « apporter », « amener », « ramener », « se munir de », « prévoir »…
const RE_APPORTER =
  /\b(apporter|apportez|apporte|amener|amenez|ramener|ramenez|rapporter|rapportez|prevoir|prevoyez|se munir|munissez[- ]vous|penser a prendre|pensez a prendre|penser a apporter|pensez a apporter|n'oubliez pas d'apporter|avoir avec soi|prendre avec soi)\b/;

/** Ce qui est demandé après « apporter … » : « calculatrice, compas et règle » → 3 objets. */
function extraireObjets(brut: string): string[] {
  const m = brut.match(
    /\b(?:apporter|apportez|apporte|amener|amenez|ramener|ramenez|rapporter|rapportez|prévoir|prévoyez|se munir(?: de| d')?|munissez[- ]vous(?: de| d')?|penser à prendre|pensez à prendre|penser à apporter|pensez à apporter|n'oubliez pas d'apporter|avoir avec soi|prendre avec soi)\s+([^.;!?\n]+)/i
  );
  if (!m) return [];
  const morceau = m[1]
    // On coupe avant les précisions de date : « … pour lundi », « … demain ».
    .replace(/\b(pour|avant|d'ici|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|demain|apres[- ]demain|après[- ]demain|prochain(e)? (cours|seance|séance))\b.*$/i, "")
    .trim();
  return morceau
    .split(/,|;|\bet\b|\bainsi que\b|\+/i)
    .map((o) => o.trim())
    .map((o) => o.replace(/^(votre|ton|ta|tes|vos|son|sa|ses|le|la|les|l'|un|une|des|du|de la|d'|de)\s+/i, "").trim())
    .map((o) => o.replace(/[.\s]+$/g, ""))
    .filter((o) => o.length >= 3 && o.length <= 50)
    .slice(0, 8)
    .map((o) => o.charAt(0).toUpperCase() + o.slice(1));
}

/** « exercices 3, 5 et 7 p.42 », « ex 4 à 6 » → ["Exercice 3", "Exercice 5", …]. */
function extraireSousTaches(brut: string): string[] {
  const n = normaliser(brut);
  const m = n.match(
    /\b(?:exercices?|exos?|ex\.?|questions?|problemes?|activites?|n[°º])\s*(?:n[°º]\s*)?((?:\d+\s*(?:[*]|bis)?\s*(?:,|;|et|&|a|à|-|–)?\s*)+)/
  );
  if (!m) return [];
  const suite = m[1];
  const nums: number[] = [];
  const tokens = suite.match(/\d+|a|à|-|–/g) ?? [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!/^\d+$/.test(t)) continue;
    const v = Number(t);
    const sep = tokens[i + 1];
    const fin = tokens[i + 2];
    if ((sep === "a" || sep === "à" || sep === "-" || sep === "–") && fin && /^\d+$/.test(fin)) {
      const f = Number(fin);
      if (f > v && f - v <= 12) for (let k = v; k <= f; k++) nums.push(k);
      else nums.push(v, f);
      i += 2;
    } else {
      nums.push(v);
    }
  }
  // Un numéro de page (« p.42 ») ne doit pas être pris pour un exercice.
  const uniques = [...new Set(nums)].filter((v) => v > 0 && v < 200);
  const pageApres = n.match(/\bp\.?\s*(\d+)/);
  const sansPage = pageApres ? uniques.filter((v) => v !== Number(pageApres[1]) || uniques.length === 1) : uniques;
  if (sansPage.length < 2) return [];
  return sansPage.slice(0, 12).map((v) => `Exercice ${v}`);
}

function extraireLeconCitee(brut: string): string | null {
  const m =
    brut.match(/\b(?:lecon|leçon|chapitre|cours)\s*(?:n[°º]\s*)?(\d+[a-z]?)\b/i) ??
    brut.match(/\b(?:lecon|leçon|chapitre)\s+(?:sur|:)?\s*[«"“]?\s*([^.;,«»"”\n]{3,40})/i);
  if (!m) return null;
  // On s'arrête avant « pour le contrôle », « dans le cahier »… qui ne font pas partie du titre.
  return m[1].replace(/\s+(pour|avant|dans|sur le cahier|et)\b.*$/i, "").trim() || null;
}

/** Durées types par sous-tâche, en minutes : un ordre de grandeur, pas une promesse. */
const MIN_PAR_EXERCICE = 6;

export function analyserDevoir(description: unknown, dureePronote?: number | null): AnalyseDevoir {
  const brut = texteBrut(description);
  const n = normaliser(brut);

  const copierLecon = RE_COPIER.test(n) || (RE_COPIER_COURT.test(n) && /\b(lecon|cours|chapitre)\b/.test(n));
  const apprendreLecon = RE_APPRENDRE.test(n);
  const sousTaches = extraireSousTaches(brut);
  const objets = RE_APPORTER.test(n) ? extraireObjets(brut) : [];

  const types: TypeDevoir[] = [];
  if (copierLecon || apprendreLecon) types.push("lecon");
  if (sousTaches.length > 0 || RE_EXERCICES.test(n) || RE_EXERCICES_MOT.test(n)) types.push("exercices");
  if (objets.length > 0 || RE_APPORTER.test(n)) types.push("apporter");
  if (RE_REDACTION.test(n)) types.push("redaction");
  if (RE_EXPOSE.test(n)) types.push("expose");
  if (RE_PAPIER.test(n)) types.push("papier");

  // Durée : celle du prof si elle existe (source la plus fiable), sinon une
  // estimation par type, additionnée. Sans type reconnu, pas d'estimation.
  let dureeEstimee: number | null = null;
  if (!(dureePronote && dureePronote > 0) && types.length > 0) {
    let total = 0;
    if (copierLecon) total += 10;
    else if (apprendreLecon) total += 15;
    if (types.includes("exercices")) total += Math.max(1, sousTaches.length || 2) * MIN_PAR_EXERCICE;
    if (types.includes("redaction")) total += 45;
    if (types.includes("expose")) total += 60;
    if (types.includes("papier") || types.includes("apporter")) total += 2;
    dureeEstimee = total > 0 ? total : null;
  }

  return {
    types,
    objets,
    copierLecon,
    apprendreLecon,
    leconCitee: copierLecon || apprendreLecon ? extraireLeconCitee(brut) : null,
    sousTaches,
    dureeEstimee,
  };
}

/** Durée retenue pour un devoir : celle du prof, sinon l'estimation, sinon null. */
export function dureeDevoir(a: { length?: number | null; description?: unknown }): {
  minutes: number | null;
  estimee: boolean;
} {
  if (a.length && a.length > 0) return { minutes: a.length, estimee: false };
  const est = analyserDevoir(a.description).dureeEstimee;
  return { minutes: est, estimee: est != null };
}

// --- Devoirs ↔ contrôles --------------------------------------------------

export type ControleLie = { date: Date; jours: number };

function debutJour(d: Date): number {
  return new Date(d).setHours(0, 0, 0, 0);
}

export function joursEntre(a: Date, b: Date): number {
  return Math.round((debutJour(b) - debutJour(a)) / 86400000);
}

/**
 * Prochain contrôle de la même matière dans les 14 jours (Pronote le marque
 * `test: true` sur le cours). Sert à remonter les « apprendre la leçon » et à
 * proposer de réviser.
 */
export function controleLie(matiere: string | undefined, timetable: any, maintenant = new Date()): ControleLie | null {
  if (!matiere) return null;
  const cible = normaliser(matiere);
  const cours = (timetable?.classes ?? [])
    .filter(
      (c: any) =>
        c.is === "lesson" &&
        c.test &&
        !c.canceled &&
        c.startDate > maintenant &&
        normaliser(c.subject?.name ?? "") === cible
    )
    .sort((a: any, b: any) => a.startDate.getTime() - b.startDate.getTime())[0];
  if (!cours) return null;
  const jours = joursEntre(maintenant, cours.startDate);
  return jours <= 14 ? { date: cours.startDate, jours } : null;
}

// --- Priorité --------------------------------------------------------------

/**
 * Score d'importance : urgence + difficulté + durée (signaux de Pronote) +
 * bonus « intelligents » : un devoir de leçon avant un contrôle proche passe
 * devant, un devoir « à apporter » pour demain aussi (l'oublier se voit tout
 * de suite en classe).
 */
export function scorePriorite(
  a: { deadline: Date; difficulty?: number | null; length?: number | null; description?: unknown; subject?: { name: string } },
  timetable: any,
  maintenant = new Date()
): number {
  const jours = Math.max(0, joursEntre(maintenant, a.deadline));
  const urgence = Math.max(0, 10 - jours);
  const difficulte = (a.difficulty ?? 0) * 3;
  const duree = a.length ? Math.min(3, a.length / 30) : 0;
  let bonus = 0;
  const analyse = analyserDevoir(a.description, a.length);
  if (analyse.types.includes("apporter") && jours <= 1) bonus += 3;
  const controle = controleLie(a.subject?.name, timetable, maintenant);
  if (controle && (analyse.types.includes("lecon") || analyse.types.includes("exercices"))) {
    bonus += Math.max(0, 8 - controle.jours);
  }
  return urgence + difficulte + duree + bonus;
}

// --- Sac de cours -----------------------------------------------------------

export type ObjetSac = { objet: string; matiere: string; devoirId: string };

/**
 * Objets demandés par les profs pour le prochain jour de cours : devoirs non
 * faits de type « apporter » dont l'échéance tombe entre aujourd'hui et ce
 * jour-là, et dont la matière a bien cours ce jour-là (sinon l'objet est
 * demandé pour un autre jour et ne concerne pas ce sac).
 */
export function objetsPourLeSac(
  devoirs: { id: string; done?: boolean; deadline: Date; description?: unknown; subject?: { name: string } }[],
  jour: Date,
  matieresDuJour: string[],
  maintenant = new Date()
): ObjetSac[] {
  const matieres = new Set(matieresDuJour.map(normaliser));
  const res: ObjetSac[] = [];
  const vus = new Set<string>();
  for (const d of devoirs) {
    if (d.done) continue;
    const nom = d.subject?.name ?? "";
    const echeance = joursEntre(maintenant, d.deadline);
    const limite = joursEntre(maintenant, jour);
    if (echeance < 0 || echeance > limite) continue;
    // Un objet demandé pour ce jour précis concerne cette matière ; demandé
    // plus tôt (avant le prochain cours), il concerne le prochain cours de la matière.
    if (!matieres.has(normaliser(nom))) continue;
    for (const objet of analyserDevoir(d.description).objets) {
      const cle = `${normaliser(nom)}|${normaliser(objet)}`;
      if (vus.has(cle)) continue;
      vus.add(cle);
      res.push({ objet, matiere: nom, devoirId: d.id });
    }
  }
  return res;
}

// --- Planning ---------------------------------------------------------------

export type TacheJour = { id: string; titre: string; matiere: string; minutes: number; estimee: boolean; echeance: Date };
export type JourPlanning = { date: Date; taches: TacheJour[]; total: number; capacite: number };

const CAPACITE_SEMAINE = 90; // minutes de travail raisonnables un soir de classe
const CAPACITE_WEEKEND = 150;
const DUREE_PAR_DEFAUT = 20;

/**
 * Répartit les devoirs non faits sur les jours disponibles avant leur échéance,
 * en équilibrant la charge : chaque devoir va sur le jour le moins chargé
 * parmi ceux qui précèdent son échéance. Le plus urgent est placé en premier.
 * Un devoir dû aujourd'hui ou demain reste sur ce soir (on ne peut pas mieux).
 */
export function planifier(
  devoirs: { id: string; done?: boolean; deadline: Date; length?: number | null; description?: unknown; subject?: { name: string } }[],
  maintenant = new Date(),
  horizon = 7
): JourPlanning[] {
  const jours: JourPlanning[] = [];
  for (let i = 0; i <= horizon; i++) {
    const d = new Date(maintenant);
    d.setDate(d.getDate() + i);
    d.setHours(12, 0, 0, 0);
    const we = d.getDay() === 0 || d.getDay() === 6;
    jours.push({ date: d, taches: [], total: 0, capacite: we ? CAPACITE_WEEKEND : CAPACITE_SEMAINE });
  }

  const aFaire = devoirs
    .filter((d) => !d.done && joursEntre(maintenant, d.deadline) >= 0)
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

  for (const d of aFaire) {
    const { minutes, estimee } = dureeDevoir(d);
    const duree = minutes ?? DUREE_PAR_DEFAUT;
    const echeance = joursEntre(maintenant, d.deadline);
    // Dernier jour de travail : la veille de l'échéance (le jour même si c'est aujourd'hui).
    const dernier = Math.min(horizon, Math.max(0, echeance - 1));
    let meilleur = 0;
    for (let i = 0; i <= dernier; i++) {
      if (jours[i].total < jours[meilleur].total) meilleur = i;
    }
    const analyse = analyserDevoir(d.description);
    const nom = d.subject?.name ?? "Devoir";
    const titre =
      analyse.copierLecon && analyse.leconCitee
        ? `Copier la leçon ${analyse.leconCitee}`
        : texteBrut(d.description).slice(0, 60) || nom;
    jours[meilleur].taches.push({
      id: d.id,
      titre,
      matiere: nom,
      minutes: duree,
      estimee: estimee || minutes == null,
      echeance: d.deadline,
    });
    jours[meilleur].total += duree;
  }
  return jours.filter((j) => j.taches.length > 0);
}

// --- Récurrence -------------------------------------------------------------

/** Clé stable d'un devoir « du même genre » : matière + texte sans chiffres ni dates. */
export function cleRecurrence(matiere: string | undefined, description: unknown): string | null {
  const n = normaliser(texteBrut(description))
    .replace(/\d+/g, "")
    .replace(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|demain|pour|le|la|les|de|du|des|un|une|et|p|pp)\b/g, "")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (n.length < 6) return null;
  return `${normaliser(matiere ?? "")}|${n.slice(0, 40)}`;
}

export const JOURS_LONGS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/**
 * Devoir récurrent : on l'a déjà vu à au moins 3 dates différentes, toutes le
 * même jour de la semaine. Renvoie ce jour (0 = dimanche) ou null.
 */
export function jourRecurrent(datesVues: string[] | undefined): number | null {
  if (!datesVues || datesVues.length < 3) return null;
  const parJour = new Map<number, number>();
  for (const iso of datesVues) {
    const [y, m, d] = iso.split("-").map(Number);
    const j = new Date(y, m - 1, d).getDay();
    parJour.set(j, (parJour.get(j) ?? 0) + 1);
  }
  const [jour, nb] = [...parJour.entries()].sort((a, b) => b[1] - a[1])[0];
  return nb >= 3 ? jour : null;
}

export function prochainJourSemaine(jour: number, apres = new Date()): Date {
  const d = new Date(apres);
  d.setHours(12, 0, 0, 0);
  do d.setDate(d.getDate() + 1);
  while (d.getDay() !== jour);
  return d;
}
