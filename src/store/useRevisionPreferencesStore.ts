import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FontScaleKey } from "./usePreferencesStore";

// Les 3 onglets pilotables de la barre révision — "reglages" reste toujours
// visible (même logique que NON_HIDEABLE_TAB dans usePreferencesStore) pour
// ne jamais s'enfermer dehors de ce réglage en le masquant par erreur.
export type RevisionTabId = "accueil" | "flashcards" | "controles";

const DEFAULT_TABS_ENABLED: Record<RevisionTabId, boolean> = {
  accueil: true,
  flashcards: true,
  controles: true,
};

type RevisionPreferencesState = {
  tabsEnabled: Record<RevisionTabId, boolean>;
  // Un seul interrupteur pour animations visuelles + retour haptique : les
  // deux se lisent comme le même type de "ressenti" pour la plupart des
  // gens, pas la peine de les séparer.
  animationsEnabled: boolean;
  // Taille de texte des fiches, en plus du réglage général de l'appli —
  // justifiée par une lecture quotidienne toute l'année plutôt qu'un réglage
  // ponctuel.
  readingFontScale: FontScaleKey;
  toggleTab: (id: RevisionTabId) => void;
  setAnimationsEnabled: (v: boolean) => void;
  setReadingFontScale: (v: FontScaleKey) => void;
};

export const useRevisionPreferencesStore = create<RevisionPreferencesState>()(
  persist(
    (set) => ({
      tabsEnabled: DEFAULT_TABS_ENABLED,
      animationsEnabled: true,
      readingFontScale: "md",

      toggleTab: (id) =>
        set((s) => ({ tabsEnabled: { ...s.tabsEnabled, [id]: !s.tabsEnabled[id] } })),
      setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),
      setReadingFontScale: (readingFontScale) => set({ readingFontScale }),
    }),
    {
      name: "carnet-revision-preferences",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // Même idiome que useFichesStore/usePreferencesStore : une version
      // persistée plus ancienne peut ne pas connaître un onglet ajouté
      // depuis — on complète avec les valeurs par défaut plutôt que de le
      // faire disparaître silencieusement.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<RevisionPreferencesState>;
        return {
          ...current,
          ...p,
          tabsEnabled: { ...DEFAULT_TABS_ENABLED, ...(p.tabsEnabled ?? {}) },
        };
      },
    }
  )
);
