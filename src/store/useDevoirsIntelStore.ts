import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mémoire des « devoirs intelligents », propre à l'appareil :
//  - les sous-tâches cochées d'un devoir (« Exercice 3 » fait, « Exercice 5 » pas encore) ;
//  - les dates où l'on a déjà vu un devoir du même genre, pour repérer ceux qui
//    reviennent chaque semaine (Pronote ne montre que 3 semaines, il faut donc
//    garder une trace au fil des synchros).

type State = {
  /** devoirId -> sous-tâches cochées. */
  sousTachesFaites: Record<string, string[]>;
  /** clé de récurrence -> dates d'échéance vues, "AAAA-MM-JJ". */
  vus: Record<string, string[]>;
  basculerSousTache: (devoirId: string, sousTache: string) => void;
  noterVus: (releves: { cle: string; date: string }[]) => void;
};

const MAX_DATES = 12;
const MAX_CLES = 300;

export const useDevoirsIntelStore = create<State>()(
  persist(
    (set) => ({
      sousTachesFaites: {},
      vus: {},
      basculerSousTache: (devoirId, sousTache) =>
        set((s) => {
          const actuel = s.sousTachesFaites[devoirId] ?? [];
          const suivant = actuel.includes(sousTache)
            ? actuel.filter((t) => t !== sousTache)
            : [...actuel, sousTache];
          return { sousTachesFaites: { ...s.sousTachesFaites, [devoirId]: suivant } };
        }),
      noterVus: (releves) =>
        set((s) => {
          let change = false;
          const vus = { ...s.vus };
          for (const { cle, date } of releves) {
            const dates = vus[cle] ?? [];
            if (dates.includes(date)) continue;
            vus[cle] = [...dates, date].sort().slice(-MAX_DATES);
            change = true;
          }
          if (!change) return s;
          // Borne la taille : on garde les clés les plus récemment vues.
          const cles = Object.keys(vus);
          if (cles.length > MAX_CLES) {
            cles
              .sort((a, b) => (vus[a][vus[a].length - 1] < vus[b][vus[b].length - 1] ? -1 : 1))
              .slice(0, cles.length - MAX_CLES)
              .forEach((c) => delete vus[c]);
          }
          return { vus };
        }),
    }),
    {
      name: "carnet-devoirs-intel",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
