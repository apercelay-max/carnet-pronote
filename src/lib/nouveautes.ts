// Les nouveautés affichées au démarrage de l'appli. On ajoute une entrée EN
// TÊTE de la liste à chaque mise à jour notable : `id` change -> la fenêtre
// s'ouvre une fois chez tout le monde, puis plus jamais pour cette version.

import type { IconName } from "../components/ui/Icon";

export type PointNouveaute = { icone: IconName; titre: string; texte: string };

export type Nouveaute = {
  id: string;
  date: string;
  titre: string;
  points: PointNouveaute[];
};

export const NOUVEAUTES: Nouveaute[] = [
  {
    id: "2026-09-26",
    date: "26 septembre 2026",
    titre: "Devoirs intelligents",
    points: [
      {
        icone: "backpack",
        titre: "Le sac se remplit tout seul",
        texte:
          "Quand un devoir dit « apporter la calculatrice », l'objet apparaît dans le sac de cours du prochain cours de la matière, et dans un rappel du soir.",
      },
      {
        icone: "book",
        titre: "La leçon sous la main",
        texte:
          "« Copier la leçon 4 » : le contenu du cahier de textes s'affiche dans le devoir et dans Aujourd'hui, avec un accès direct à ta fiche.",
      },
      {
        icone: "target",
        titre: "Types, durées et sous-tâches",
        texte:
          "Chaque devoir est classé (leçon, exercices, rédaction, exposé…), reçoit une durée estimée, et « exercices 3, 5 et 7 » devient trois cases à cocher.",
      },
      {
        icone: "clock",
        titre: "Planning et priorités",
        texte:
          "Un planning répartit ta charge avant chaque échéance. Les leçons à apprendre avant un contrôle passent en priorité, avec un lien vers la révision.",
      },
      {
        icone: "refresh",
        titre: "Devoirs récurrents",
        texte: "Un devoir qui revient chaque semaine est repéré, et tu peux prévoir le prochain en un geste.",
      },
    ],
  },
  {
    id: "2026-09-22",
    date: "22 septembre 2026",
    titre: "Nouveaux styles",
    points: [
      {
        icone: "palette",
        titre: "4 styles et de nouveaux accents",
        texte: "Nouveau, Classique, Sport pro et Épuré : change l'ambiance de l'appli dans Réglages → Style.",
      },
    ],
  },
  {
    id: "2026-09-21",
    date: "21 septembre 2026",
    titre: "Actualités",
    points: [
      {
        icone: "megaphone",
        titre: "Tout marquer comme lu",
        texte: "Un bouton à côté du compteur marque toutes les actualités comme lues d'un seul geste.",
      },
    ],
  },
  {
    id: "2026-09-20",
    date: "20 septembre 2026",
    titre: "Devoirs",
    points: [
      {
        icone: "eyeOff",
        titre: "Masquer les devoirs faits",
        texte: "Un interrupteur cache les devoirs cochés pour ne garder que le reste à faire.",
      },
    ],
  },
];

export const DERNIERE_NOUVEAUTE = NOUVEAUTES[0].id;

/**
 * Ce qu'il y a de nouveau depuis la dernière fois. Première ouverture (rien
 * de mémorisé) : uniquement la plus récente, pas tout l'historique.
 */
export function nouveautesNonVues(derniereVue: string | null): Nouveaute[] {
  if (!derniereVue) return NOUVEAUTES.slice(0, 1);
  const idx = NOUVEAUTES.findIndex((n) => n.id === derniereVue);
  return idx === -1 ? NOUVEAUTES.slice(0, 1) : NOUVEAUTES.slice(0, idx);
}
