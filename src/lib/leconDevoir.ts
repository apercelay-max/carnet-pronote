// Retrouver la leçon dont parle un devoir : le contenu du cahier de textes de
// la même matière (déjà chargé par la synchro), et la fiche de révision si la
// personne en a une. Rien n'est inventé : sans correspondance, on ne montre rien.

import type { Resource } from "pawnote";
import type { Fiche } from "../store/useFichesStore";
import { contenusDepuisRessources, type ContenuCours } from "./contenusCours";
import { normaliser } from "./devoirsIntelligents";

/**
 * Contenu de cours le plus pertinent : même matière, déjà donné (pas dans le
 * futur), et si le devoir cite une leçon (« leçon 4 », « les fonctions »), de
 * préférence celui qui en parle. À défaut, le dernier cours de la matière.
 */
export function trouverLecon(
  matiere: string | undefined,
  leconCitee: string | null,
  resources: Resource[],
  maintenant = new Date()
): ContenuCours | null {
  if (!matiere) return null;
  const cible = normaliser(matiere);
  const candidats = contenusDepuisRessources(resources)
    .filter((c) => normaliser(c.matiere) === cible && c.date <= maintenant && (c.texte || c.titre))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  if (candidats.length === 0) return null;
  if (leconCitee) {
    const mot = normaliser(leconCitee);
    const precis = candidats.find((c) => normaliser(`${c.titre} ${c.texte}`).includes(mot));
    if (precis) return precis;
  }
  return candidats[0];
}

/** Fiche de révision de la même matière (la plus récente), de préférence celle qui cite la leçon. */
export function ficheLiee(matiere: string | undefined, leconCitee: string | null, fiches: Fiche[]): Fiche | null {
  if (!matiere) return null;
  const cible = normaliser(matiere);
  const memeMatiere = fiches
    .filter((f) => normaliser(f.matiere) === cible)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  if (memeMatiere.length === 0) return null;
  if (leconCitee) {
    const mot = normaliser(leconCitee);
    const precise = memeMatiere.find((f) => normaliser(f.titre).includes(mot));
    if (precise) return precise;
  }
  return memeMatiere[0];
}
