// Contenus de cours Pronote (cahier de textes) pour préparer un contrôle.
//
// La synchro principale (useDataStore) ne charge les contenus que de la
// semaine en cours aux 3 semaines à venir : c'est ce qu'il faut pour le sac de
// cours, mais un contrôle porte sur ce qui a été fait AVANT. On va donc
// chercher ici les semaines passées, uniquement quand l'élève ouvre l'écran de
// préparation — pas à chaque synchro, pour ne pas alourdir Pronote pour rien.

import type { Resource, SessionHandle } from "pawnote";
import { fetchResourcesRange } from "./pronote";
import { stripHtml } from "./html";

export type ContenuCours = {
  id: string;
  matiere: string;
  titre: string;
  texte: string;
  date: Date;
};

export function contenusDepuisRessources(resources: Resource[]): ContenuCours[] {
  return resources
    .flatMap((r) =>
      (r.contents ?? []).map((c) => ({
        id: c.id,
        matiere: r.subject?.name ?? "Cours",
        titre: (c.title ?? "").trim() || r.subject?.name || "Contenu de cours",
        texte: stripHtml(c.description ?? "").trim(),
        date: r.startDate,
      }))
    )
    .filter((c) => c.titre || c.texte);
}

/** Semaines passées (par défaut ~10, soit à peu près un trimestre) jusqu'à aujourd'hui inclus. */
export async function chargerContenusPasses(session: SessionHandle, semaines = 10): Promise<ContenuCours[]> {
  const fin = new Date();
  fin.setHours(23, 59, 59, 999);
  const debut = new Date(fin);
  debut.setDate(debut.getDate() - semaines * 7);
  debut.setHours(0, 0, 0, 0);
  return contenusDepuisRessources(await fetchResourcesRange(session, debut, fin));
}

/** Fusionne sans doublon (même id de contenu), du plus récent au plus ancien. */
export function fusionnerContenus(...listes: ContenuCours[][]): ContenuCours[] {
  const vus = new Map<string, ContenuCours>();
  listes.flat().forEach((c) => vus.has(c.id) || vus.set(c.id, c));
  return [...vus.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
}
