import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AccentKey } from "../theme/palette";
import { IconName } from "../components/ui/Icon";

export type ThemeMode = "system" | "dark" | "light";
export type FontScaleKey = "sm" | "md" | "lg";

export type WidgetId =
  | "prochainCours"
  | "moyenneGenerale"
  | "devoirsAVenir"
  | "dernieresNotes"
  | "vieScolaire";

export const WIDGET_LABELS: Record<WidgetId, string> = {
  prochainCours: "Prochain cours",
  moyenneGenerale: "Moyenne générale",
  devoirsAVenir: "Devoirs à venir",
  dernieresNotes: "Dernières notes",
  vieScolaire: "Vie scolaire",
};

const DEFAULT_WIDGET_ORDER: WidgetId[] = [
  "prochainCours",
  "moyenneGenerale",
  "devoirsAVenir",
  "dernieresNotes",
  "vieScolaire",
];

// Les 5 catégories de la barre du bas correspondent chacune à un vrai écran
// (fichier de route) : on ne peut pas en créer de nouvelles à la volée, mais
// on peut entièrement personnaliser celles qui existent — nom, icône, ordre,
// visibilité. "reglages" reste toujours accessible pour ne pas s'enfermer
// dehors des réglages en le masquant par erreur.
export type TabId = "index" | "notes" | "emploi-du-temps" | "devoirs" | "reglages";

export type TabDefaults = { href: string; label: string; icon: IconName };

export const TAB_DEFAULTS: Record<TabId, TabDefaults> = {
  index: { href: "/", label: "Accueil", icon: "dashboard" },
  notes: { href: "/notes", label: "Notes", icon: "notes" },
  "emploi-du-temps": { href: "/emploi-du-temps", label: "Emploi du temps", icon: "timetable" },
  devoirs: { href: "/devoirs", label: "Devoirs", icon: "homework" },
  reglages: { href: "/reglages", label: "Réglages", icon: "settings" },
};

export const DEFAULT_TAB_ORDER: TabId[] = ["index", "notes", "emploi-du-temps", "devoirs", "reglages"];

// Choix d'icônes proposés pour personnaliser un onglet.
export const TAB_ICON_CHOICES: IconName[] = [
  "dashboard",
  "notes",
  "timetable",
  "homework",
  "settings",
  "book",
  "clock",
  "pin",
  "sparkle",
  "school",
  "bell",
  "checkCircle",
];

const NON_HIDEABLE_TAB: TabId = "reglages";

type PreferencesState = {
  themeMode: ThemeMode;
  accent: AccentKey;
  fontScale: FontScaleKey;
  subjectColors: Record<string, string>;
  widgetOrder: WidgetId[];
  hiddenWidgets: WidgetId[];
  tabOrder: TabId[];
  hiddenTabs: TabId[];
  tabLabels: Partial<Record<TabId, string>>;
  tabIcons: Partial<Record<TabId, IconName>>;
  setThemeMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentKey) => void;
  setFontScale: (scale: FontScaleKey) => void;
  setSubjectColor: (subject: string, color: string) => void;
  resetSubjectColor: (subject: string) => void;
  toggleWidget: (id: WidgetId) => void;
  reorderWidgets: (order: WidgetId[]) => void;
  reorderTabs: (order: TabId[]) => void;
  toggleTab: (id: TabId) => void;
  setTabLabel: (id: TabId, label: string) => void;
  resetTabLabel: (id: TabId) => void;
  setTabIcon: (id: TabId, icon: IconName) => void;
  resetTabIcon: (id: TabId) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      themeMode: "system",
      accent: "ciel",
      fontScale: "md",
      subjectColors: {},
      widgetOrder: DEFAULT_WIDGET_ORDER,
      hiddenWidgets: [],
      tabOrder: DEFAULT_TAB_ORDER,
      hiddenTabs: [],
      tabLabels: {},
      tabIcons: {},
      setThemeMode: (themeMode) => set({ themeMode }),
      setAccent: (accent) => set({ accent }),
      setFontScale: (fontScale) => set({ fontScale }),
      setSubjectColor: (subject, color) =>
        set((s) => ({ subjectColors: { ...s.subjectColors, [subject]: color } })),
      resetSubjectColor: (subject) =>
        set((s) => {
          const next = { ...s.subjectColors };
          delete next[subject];
          return { subjectColors: next };
        }),
      toggleWidget: (id) =>
        set((s) => {
          const hidden = s.hiddenWidgets.includes(id);
          return {
            hiddenWidgets: hidden
              ? s.hiddenWidgets.filter((w) => w !== id)
              : [...s.hiddenWidgets, id],
          };
        }),
      reorderWidgets: (order) => set({ widgetOrder: order }),
      reorderTabs: (order) => set({ tabOrder: order }),
      toggleTab: (id) =>
        set((s) => {
          if (id === NON_HIDEABLE_TAB) return s;
          const hidden = s.hiddenTabs.includes(id);
          return {
            hiddenTabs: hidden ? s.hiddenTabs.filter((t) => t !== id) : [...s.hiddenTabs, id],
          };
        }),
      setTabLabel: (id, label) =>
        set((s) => ({ tabLabels: { ...s.tabLabels, [id]: label } })),
      resetTabLabel: (id) =>
        set((s) => {
          const next = { ...s.tabLabels };
          delete next[id];
          return { tabLabels: next };
        }),
      setTabIcon: (id, icon) =>
        set((s) => ({ tabIcons: { ...s.tabIcons, [id]: icon } })),
      resetTabIcon: (id) =>
        set((s) => {
          const next = { ...s.tabIcons };
          delete next[id];
          return { tabIcons: next };
        }),
    }),
    {
      name: "carnet-preferences",
      storage: createJSONStorage(() => AsyncStorage),
      // Les personnes qui avaient déjà l'app avant l'ajout des onglets
      // personnalisables n'ont pas tabOrder/hiddenTabs/etc. dans leur storage
      // persistant -> on les complète avec les valeurs par défaut au lieu de
      // planter ou de perdre la barre du bas.
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as object),
        tabOrder: (persisted as any)?.tabOrder ?? current.tabOrder,
        hiddenTabs: (persisted as any)?.hiddenTabs ?? current.hiddenTabs,
        tabLabels: (persisted as any)?.tabLabels ?? current.tabLabels,
        tabIcons: (persisted as any)?.tabIcons ?? current.tabIcons,
      }),
    }
  )
);
