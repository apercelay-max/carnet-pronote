// Rappels du jour : ce qu'il faut faire AUJOURD'HUI, calculé sur l'appareil.
//
// Trois sources, toutes réelles :
//  - les devoirs (Pronote, perso, classe) à rendre aujourd'hui ou demain ;
//  - les contrôles marqués par le prof dans les 2 prochains jours ;
//  - les tâches du plan de révision Gemini prévues pour aujourd'hui.
// Rien n'est inventé : sans données, pas de rappel.

import type { Fiche } from "../store/useFichesStore";

export type Rappel = {
  id: string;
  type: "devoir" | "controle" | "revision";
  titre: string;
  detail: string;
  lien: string;
  urgent: boolean;
  matiere?: string;
};

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function debutJour(d: Date): number {
  return new Date(d).setHours(0, 0, 0, 0);
}

function joursEntre(a: Date, b: Date): number {
  return Math.round((debutJour(b) - debutJour(a)) / 86400000);
}

function normaliser(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b1er\b/g, "1")
    .replace(/\s+/g, " ");
}

/**
 * Le plan Gemini écrit ses jours en toutes lettres (« mardi 15 septembre »).
 * On compare sur « 15 septembre » : le nom du jour est parfois absent ou
 * abrégé, le quantième + mois est ce qui est fiable.
 */
function estAujourdhui(libelle: string, maintenant: Date): boolean {
  const cle = normaliser(`${maintenant.getDate()} ${MOIS[maintenant.getMonth()]}`);
  return new RegExp(`(^|\\D)${cle}`).test(normaliser(libelle));
}

export function libelleJour(d: Date): string {
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

export function rappelsDuJour(input: {
  assignments: any[];
  timetable: any;
  fiches: Fiche[];
  maintenant?: Date;
}): Rappel[] {
  const maintenant = input.maintenant ?? new Date();
  const rappels: Rappel[] = [];

  input.fiches.forEach((f) => {
    const jour = f.ia?.planRevision?.find((j) => estAujourdhui(j.jour, maintenant));
    if (!jour) return;
    rappels.push({
      id: `revision:${f.id}`,
      type: "revision",
      titre: `Réviser : ${f.titre}`,
      detail: jour.taches.join(" · "),
      lien: `/fiche/${f.id}`,
      urgent: false,
      matiere: f.matiere,
    });
  });

  (input.timetable?.classes ?? [])
    .filter((c: any) => c.is === "lesson" && c.test && !c.canceled && c.startDate > maintenant)
    .forEach((c: any) => {
      const j = joursEntre(maintenant, c.startDate);
      if (j > 2) return;
      rappels.push({
        id: `controle:${c.id}`,
        type: "controle",
        titre: `Contrôle de ${c.subject?.name ?? "cours"}`,
        detail: j === 0 ? "Aujourd'hui" : j === 1 ? "Demain" : "Après-demain",
        lien: "/revision/controles",
        urgent: j <= 1,
        matiere: c.subject?.name,
      });
    });

  input.assignments
    .filter((a) => !a.done)
    .forEach((a) => {
      const j = joursEntre(maintenant, a.deadline);
      if (j < 0 || j > 1) return;
      rappels.push({
        id: `devoir:${a.id}`,
        type: "devoir",
        titre: a.subject?.name ?? "Devoir",
        detail: `${j === 0 ? "Pour aujourd'hui" : "Pour demain"} — ${String(a.description ?? "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 120)}`,
        lien: "/devoirs",
        urgent: true,
        matiere: a.subject?.name,
      });
    });

  const ordre = { controle: 0, devoir: 1, revision: 2 } as const;
  return rappels.sort((a, b) => ordre[a.type] - ordre[b.type]);
}

/** Aperçu des 7 prochains jours, pour le résumé du week-end. */
export function semaineAVenir(input: { assignments: any[]; timetable: any; maintenant?: Date }) {
  const maintenant = input.maintenant ?? new Date();
  const dansLaSemaine = (d: Date) => {
    const j = joursEntre(maintenant, d);
    return j >= 0 && j <= 7;
  };
  const controles: { matiere: string; date: Date }[] = (input.timetable?.classes ?? [])
    .filter((c: any) => c.is === "lesson" && c.test && !c.canceled && dansLaSemaine(c.startDate))
    .sort((a: any, b: any) => a.startDate.getTime() - b.startDate.getTime())
    .map((c: any) => ({ matiere: c.subject?.name ?? "Cours", date: c.startDate as Date }));
  const devoirs = input.assignments.filter((a) => !a.done && dansLaSemaine(a.deadline));
  return { controles, nbDevoirs: devoirs.length };
}
