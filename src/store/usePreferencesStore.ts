import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AccentKey } from "../theme/palette";

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

type PreferencesState = {
  themeMode: ThemeMode;
  accent: AccentKey;
  fontScale: FontScaleKey;
  subjectColors: Record<string, string>;
  widgetOrder: WidgetId[];
  hiddenWidgets: WidgetId[];
  setThemeMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentKey) => void;
  setFontScale: (scale: FontScaleKey) => void;
  setSubjectColor: (subject: string, color: string) => void;
  resetSubjectColor: (subject: string) => void;
  toggleWidget: (id: WidgetId) => void;
  reorderWidgets: (order: WidgetId[]) => void;
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
    }),
    {
      name: "carnet-preferences",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
