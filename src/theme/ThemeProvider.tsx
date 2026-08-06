import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { ACCENTS, DARK_NEUTRALS, LIGHT_NEUTRALS } from "./palette";
import { usePreferencesStore } from "../store/usePreferencesStore";

export type Theme = {
  isDark: boolean;
  colors: typeof DARK_NEUTRALS & { accent: string; accentSoft: string };
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
  const accentKey = usePreferencesStore((s) => s.accent);
  const fontScaleKey = usePreferencesStore((s) => s.fontScale);

  const isDark = themeMode === "system" ? system !== "light" : themeMode === "dark";

  const theme = useMemo<Theme>(() => {
    const neutrals = isDark ? DARK_NEUTRALS : LIGHT_NEUTRALS;
    const accent = ACCENTS[accentKey];
    const scale = fontScaleKey === "sm" ? 0.92 : fontScaleKey === "lg" ? 1.12 : 1;

    return {
      isDark,
      colors: { ...neutrals, accent: accent.value, accentSoft: accent.soft },
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
  }, [isDark, accentKey, fontScaleKey]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme doit être utilisé sous <ThemeProvider>");
  return ctx;
}
