import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { genererFiche, type FicheGeneree } from "../lib/fiches";

// Les trois modes correspondent aux trois extensions demandées. Elles
// partagent le même moteur d'extraction (src/lib/fiches.ts) mais n'affichent
// pas la même sortie : c'est le mode qui décide de ce qu'on montre.
export type FicheMode = "fiche" | "resume" | "points";

export type ExtensionId = FicheMode | "simulateur" | "flashcards" | "controles";

export const EXTENSIONS: {
  id: ExtensionId;
  titre: string;
  sousTitre: string;
  icone: "sparkle" | "text" | "target" | "notes" | "book" | "clock";
}[] = [
  {
    id: "fiche",
    titre: "Fiches de révision",
    sousTitre: "Une fiche complète pour un contrôle ou une leçon",
    icone: "sparkle",
  },
  {
    id: "resume",
    titre: "Résumés de leçon",
    sousTitre: "L'essentiel d'une leçon en quelques phrases",
    icone: "text",
  },
  {
    id: "points",
    titre: "Points importants",
    sousTitre: "Ce qu'il faut retenir, en puces",
    icone: "target",
  },
  {
    id: "flashcards",
    titre: "Flashcards",
    sousTitre: "Réviser tes fiches en cartes recto-verso",
    icone: "book",
  },
  {
    id: "controles",
    titre: "Contrôles à venir",
    sousTitre: "Le compte à rebours, et où tu en es dans tes fiches",
    icone: "clock",
  },
  {
    id: "simulateur",
    titre: "Simulateur de moyenne",
    sousTitre: "« Si j'ai 15 au prochain contrôle… »",
    icone: "notes",
  },
];

export type Fiche = {
  id: string;
  mode: FicheMode;
  titre: string;
  matiere: string;
  texteSource: string;
  genere: FicheGeneree;
  /** Ce que la personne ajoute ou corrige à la main — jamais écrasé par une régénération. */
  notesPerso: string;
  createdAt: number;
  updatedAt: number;
};

function nouvelId(): string {
  return `f${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

type FichesState = {
  /** Extensions activées. Tout est activé au premier lancement. */
  actives: Record<ExtensionId, boolean>;
  fiches: Fiche[];
  toggleExtension: (id: ExtensionId) => void;
  creerFiche: (input: { mode: FicheMode; titre: string; matiere: string; texteSource: string }) => Fiche;
  regenerer: (id: string) => void;
  setNotesPerso: (id: string, notes: string) => void;
  supprimer: (id: string) => void;
};

const TOUT_ACTIF: Record<ExtensionId, boolean> = {
  fiche: true,
  resume: true,
  points: true,
  flashcards: true,
  controles: true,
  simulateur: true,
};

export const useFichesStore = create<FichesState>()(
  persist(
    (set, get) => ({
      actives: TOUT_ACTIF,
      fiches: [],

      toggleExtension: (id) =>
        set((s) => ({ actives: { ...s.actives, [id]: !s.actives[id] } })),

      creerFiche: ({ mode, titre, matiere, texteSource }) => {
        const now = Date.now();
        const fiche: Fiche = {
          id: nouvelId(),
          mode,
          titre: titre.trim() || "Sans titre",
          matiere,
          texteSource,
          genere: genererFiche(texteSource),
          notesPerso: "",
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ fiches: [fiche, ...s.fiches] }));
        return fiche;
      },

      regenerer: (id) =>
        set((s) => ({
          fiches: s.fiches.map((f) =>
            f.id === id ? { ...f, genere: genererFiche(f.texteSource), updatedAt: Date.now() } : f
          ),
        })),

      setNotesPerso: (id, notes) =>
        set((s) => ({
          fiches: s.fiches.map((f) => (f.id === id ? { ...f, notesPerso: notes, updatedAt: Date.now() } : f)),
        })),

      supprimer: (id) => set((s) => ({ fiches: s.fiches.filter((f) => f.id !== id) })),
    }),
    {
      name: "carnet-fiches",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // Une version persistée plus ancienne peut ne pas connaître une extension
      // ajoutée depuis : on complète avec les valeurs par défaut plutôt que de
      // laisser un `undefined` qui la ferait disparaître de la liste.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<FichesState>;
        return {
          ...current,
          ...p,
          actives: { ...TOUT_ACTIF, ...(p.actives ?? {}) },
          fiches: p.fiches ?? [],
        };
      },
    }
  )
);
