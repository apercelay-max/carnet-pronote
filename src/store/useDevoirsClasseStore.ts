import { create } from "zustand";
import { useAccountStore } from "./useAccountStore";
import {
  listerMesGroupes,
  chargerDevoirs,
  marquerDevoirFait,
  messageErreurGroupe,
  jourISO,
  type DevoirGroupe,
} from "../lib/groupes";

// Devoirs collectifs de TOUS mes groupes, pour l'onglet Devoirs.
//
// Le store des groupes (useGroupesStore) ne connaît que le groupe ouvert à
// l'écran. Or l'onglet Devoirs doit montrer les devoirs de la classe sans
// qu'on ait à ouvrir chaque groupe : d'où ce petit store à part, non persisté
// (les données vivent sur Supabase, on les recharge à chaque passage).

export type DevoirClasse = { devoir: DevoirGroupe; groupeId: string; groupeNom: string };

type DevoirsClasseState = {
  items: DevoirClasse[];
  chargement: boolean;
  erreur: string | null;
  charger: () => Promise<void>;
  basculer: (devoirId: string) => Promise<void>;
};

export const useDevoirsClasseStore = create<DevoirsClasseState>()((set, get) => ({
  items: [],
  chargement: false,
  erreur: null,

  charger: async () => {
    const userId = useAccountStore.getState().userId;
    if (!userId) {
      set({ items: [], erreur: null });
      return;
    }
    set({ chargement: true, erreur: null });
    try {
      const groupes = await listerMesGroupes(userId);
      // allSettled : un groupe qui échoue ne doit pas vider la liste des autres.
      const resultats = await Promise.allSettled(groupes.map((g) => chargerDevoirs(g.id)));
      // Les devoirs dont l'échéance est passée n'ont plus rien à faire dans la
      // liste « à rendre » — comme côté Pronote, qui ne charge que l'avenir.
      const aujourdhui = jourISO(new Date());
      const items: DevoirClasse[] = [];
      resultats.forEach((r, i) => {
        if (r.status !== "fulfilled") return;
        r.value
          .filter((d) => d.echeance >= aujourdhui)
          .forEach((devoir) => items.push({ devoir, groupeId: groupes[i].id, groupeNom: groupes[i].nom }));
      });
      set({ items, chargement: false });
    } catch (err) {
      set({ chargement: false, erreur: messageErreurGroupe(err) });
    }
  },

  basculer: async (devoirId) => {
    const userId = useAccountStore.getState().userId;
    const item = get().items.find((x) => x.devoir.id === devoirId);
    if (!userId || !item) return;

    const avant = item.devoir.faits;
    const fait = !avant.some((f) => f.userId === userId && f.fait);
    const appliquer = (faits: DevoirGroupe["faits"]) =>
      set((s) => ({
        items: s.items.map((x) => (x.devoir.id === devoirId ? { ...x, devoir: { ...x.devoir, faits } } : x)),
      }));

    // Optimiste, comme dans l'écran du groupe : cocher doit réagir tout de suite.
    appliquer([...avant.filter((f) => f.userId !== userId), { userId, fait }]);
    try {
      await marquerDevoirFait(devoirId, item.groupeId, userId, fait);
    } catch (err) {
      appliquer(avant);
      set({ erreur: messageErreurGroupe(err) });
    }
  },
}));
