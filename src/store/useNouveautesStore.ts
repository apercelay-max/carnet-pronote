import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DERNIERE_NOUVEAUTE } from "../lib/nouveautes";

type State = {
  /** Id de la dernière nouveauté que la personne a vue et fermée. */
  derniereVue: string | null;
  /** Ouverture manuelle depuis les Réglages. */
  ouvertManuelle: boolean;
  marquerVues: () => void;
  ouvrirManuellement: () => void;
  fermerManuelle: () => void;
};

export const useNouveautesStore = create<State>()(
  persist(
    (set) => ({
      derniereVue: null,
      ouvertManuelle: false,
      marquerVues: () => set({ derniereVue: DERNIERE_NOUVEAUTE }),
      ouvrirManuellement: () => set({ ouvertManuelle: true }),
      fermerManuelle: () => set({ ouvertManuelle: false }),
    }),
    {
      name: "carnet-nouveautes",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ derniereVue: s.derniereVue }),
    }
  )
);
