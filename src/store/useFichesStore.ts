import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { genererFiche, type FicheGeneree } from "../lib/fiches";
import type { FicheIA } from "../lib/ficheGemini";

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
  /** Version approfondie par Gemini, absente tant qu'on ne l'a pas demandée ou si elle a échoué. */
  ia?: FicheIA;
  /** "AAAA-MM-JJ" quand la fiche prépare un contrôle précis : Gemini y ajoute un plan jour par jour. */
  dateControle?: string;
  /** "pronote" quand le texte vient du cahier de textes (préparation d'un contrôle). */
  source?: "pronote";
  /** Id de la fiche partagée d'origine quand elle vient de la bibliothèque d'un groupe. */
  partageeId?: string;
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
  creerFiche: (input: {
    mode: FicheMode;
    titre: string;
    matiere: string;
    texteSource: string;
    dateControle?: string;
    source?: "pronote";
  }) => Fiche;
  regenerer: (id: string) => void;
  setNotesPerso: (id: string, notes: string) => void;
  setIA: (id: string, ia: FicheIA) => void;
  importerFiche: (input: { partageeId: string; titre: string; matiere: string; genere: FicheGeneree; ia?: FicheIA }) => Fiche;
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

      creerFiche: ({ mode, titre, matiere, texteSource, dateControle, source }) => {
        const now = Date.now();
        const fiche: Fiche = {
          id: nouvelId(),
          mode,
          titre: titre.trim() || "Sans titre",
          matiere,
          texteSource,
          genere: genererFiche(texteSource),
          ...(dateControle ? { dateControle } : {}),
          ...(source ? { source } : {}),
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

      importerFiche: ({ partageeId, titre, matiere, genere, ia }) => {
        const deja = get().fiches.find((f) => f.partageeId === partageeId);
        if (deja) return deja;
        const now = Date.now();
        // Pas de cours source pour une fiche reçue : on reconstitue un texte à
        // partir de son contenu, pour que « Refaire avec Gemini » ait quelque
        // chose à relire au lieu d'échouer sur un texte vide.
        const texteSource = ia
          ? [...ia.resume, ...ia.plan.flatMap((p) => [p.titre, ...p.points]), ...ia.definitions.map((d) => `${d.terme} : ${d.sens}`)].join("\n")
          : [...genere.resume, ...genere.points, ...genere.definitions.map((d) => `${d.terme} : ${d.sens}`)].join("\n");
        const fiche: Fiche = {
          id: nouvelId(),
          mode: "fiche",
          titre,
          matiere,
          texteSource,
          genere,
          ...(ia ? { ia } : {}),
          partageeId,
          notesPerso: "",
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ fiches: [fiche, ...s.fiches] }));
        return fiche;
      },

      setIA: (id, ia) =>
        set((s) => ({
          fiches: s.fiches.map((f) => (f.id === id ? { ...f, ia, updatedAt: Date.now() } : f)),
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
