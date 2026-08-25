import { create } from "zustand";

// État éphémère (jamais persisté) : signale au _layout de la section
// révision qu'une session de flashcards est en cours, pour qu'il remplace la
// barre à onglets par la barre de progression numérotée (voir
// RevisionSessionBar.tsx). Existe séparément de useRevisionPreferencesStore
// car ce n'est pas un réglage — juste un signal de navigation entre l'écran
// flashcards et son _layout parent, qui vivent dans des fichiers de route
// différents et n'ont pas d'autre lien direct.
type RevisionSessionState = {
  active: boolean;
  total: number;
  index: number; // 0-based
  onJump: (index: number) => void;
  onBack: () => void;
  start: (params: { total: number; onJump: (index: number) => void; onBack: () => void }) => void;
  setIndex: (index: number) => void;
  end: () => void;
};

export const useRevisionSessionStore = create<RevisionSessionState>((set) => ({
  active: false,
  total: 0,
  index: 0,
  onJump: () => {},
  onBack: () => {},

  start: ({ total, onJump, onBack }) => set({ active: true, total, index: 0, onJump, onBack }),
  setIndex: (index) => set({ index }),
  end: () => set({ active: false, total: 0, index: 0, onJump: () => {}, onBack: () => {} }),
}));
