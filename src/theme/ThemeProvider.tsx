import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { ACCENTS, hexToRgba } from "./palette";
import { STYLE_PALETTES, STYLE_STRUCTURE, StyleId, StyleNeutrals, StyleStructure } from "./styles";
import { usePreferencesStore } from "../store/usePreferencesStore";

export type Theme = {
  isDark: boolean;
  styleId: StyleId;
  colors: StyleNeutrals & { accent: string; accentSoft: string; accentGlass: string };
  // Jetons structurels du style choisi (traitement des cartes, de la barre du
  // bas, typo, couleur "signal" décorative) — voir src/theme/styles.ts.
  structure: StyleStructure;
  signal: string;
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
  spacing: (n: number) => number;
  fontScale: number;
  type: {
    hero: number;
    title: number;
    subtitle: number;
    body: number;
    caption: number;
  };
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const themeMode = usePreferencesStore((s) => s.themeMode);
  const styleId = usePreferencesStore((s) => s.styleId);
  const accentKey = usePreferencesStore((s) => s.accent);
  const fontScaleKey = usePreferencesStore((s) => s.fontScale);

  const isDark = themeMode === "system" ? system !== "light" : themeMode === "dark";

  const theme = useMemo<Theme>(() => {
    const palette = STYLE_PALETTES[styleId];
    const neutrals = isDark ? palette.dark : palette.light;
    const structure = STYLE_STRUCTURE[styleId];
    const accent = ACCENTS[accentKey];
    const scale = fontScaleKey === "sm" ? 0.92 : fontScaleKey === "lg" ? 1.12 : 1;

    return {
      isDark,
      styleId,
      colors: {
        ...neutrals,
        accent: accent.value,
        accentSoft: accent.soft,
        accentGlass: hexToRgba(accent.value, isDark ? 0.22 : 0.16),
      },
      structure,
      signal: isDark ? structure.signal.dark : structure.signal.light,
      radius: { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 },
      spacing: (n: number) => n * 4,
      fontScale: scale,
      type: {
        hero: 32 * scale,
        title: 22 * scale,
        subtitle: 17 * scale,
        body: 15 * scale,
        caption: 12.5 * scale,
      },
    };
  }, [isDark, styleId, accentKey, fontScaleKey]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme doit être utilisé sous <ThemeProvider>");
  return ctx;
}
