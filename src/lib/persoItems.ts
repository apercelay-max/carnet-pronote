// Adaptateurs : transforment les éléments perso (useLocalItemsStore) en objets
// qui ont la même forme que les données Pronote, pour pouvoir les afficher
// dans les mêmes listes (onglet Devoirs, Emploi du temps) sans réécrire ces
// écrans. Le drapeau `perso: true` permet de les repérer (puce « Perso »,
// action « cocher » routée vers le bon store, etc.).
import type { DevoirManuel, CreneauPerso } from "../store/useLocalItemsStore";

/** "AAAA-MM-JJ" -> Date locale à midi (évite les décalages de fuseau). */
export function dateFromISODay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

/** Date + "HH:MM" -> Date locale. */
function withTime(day: Date, hhmm: string): Date {
  const [h, min] = hhmm.split(":").map(Number);
  const out = new Date(day);
  out.setHours(h ?? 0, min ?? 0, 0, 0);
  return out;
}

export type PersoAssignment = {
  id: string;
  perso: true;
  deadline: Date;
  subject: { name: string };
  description: string;
  done: boolean;
  difficulty: null;
  length: number | null;
};

export function devoirManuelToAssignment(d: DevoirManuel): PersoAssignment {
  return {
    id: d.id,
    perso: true,
    deadline: dateFromISODay(d.date),
    subject: { name: d.matiere.trim() || "Perso" },
    description: d.note.trim() ? `${d.titre}\n${d.note.trim()}` : d.titre,
    done: d.fait,
    difficulty: null,
    length: d.duree,
  };
}

export type PersoClass = {
  id: string;
  perso: true;
  is: "activity";
  title: string;
  startDate: Date;
  endDate: Date;
  classrooms: string[];
  couleur: string | null;
  matiere: string;
  canceled: false;
};

// lundi = 0 … dimanche = 6 (comme le reste de l'app).
function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** Occurrences d'un créneau perso pour un jour donné (0 ou 1). */
export function creneauForDay(c: CreneauPerso, day: Date): PersoClass | null {
  let matches = false;
  if (c.recurrence === "hebdo") {
    matches = c.jour != null && weekdayIndex(day) === c.jour;
  } else {
    matches = c.date != null && dateFromISODay(c.date).toDateString() === day.toDateString();
  }
  if (!matches) return null;
  return {
    id: c.id,
    perso: true,
    is: "activity",
    title: c.titre,
    startDate: withTime(day, c.debut),
    endDate: withTime(day, c.fin),
    classrooms: c.lieu.trim() ? [c.lieu.trim()] : [],
    couleur: c.couleur,
    matiere: c.matiere,
    canceled: false,
  };
}

export const JOURS_SEMAINE = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

/** "AAAA-MM-JJ" du jour même, pour pré-remplir un champ date. */
export function todayISODay(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
