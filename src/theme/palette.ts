// Palette de base — pensée dark-first (comme UniTools) mais avec un vrai mode clair.
// Tout le système de personnalisation (thème, accent, couleurs de matières) part de ce fichier.

export type AccentKey =
  | "ciel"
  | "indigo"
  | "violet"
  | "rose"
  | "corail"
  | "ambre"
  | "menthe"
  | "graphite";

export const ACCENTS: Record<AccentKey, { label: string; value: string; soft: string }> = {
  ciel: { label: "Ciel", value: "#4FA6FF", soft: "#1B2A3D" },
  indigo: { label: "Indigo", value: "#6C7BFF", soft: "#221F3D" },
  violet: { label: "Violet", value: "#B26CFF", soft: "#291F3D" },
  rose: { label: "Rose", value: "#FF5FA8", soft: "#3A1F2E" },
  corail: { label: "Corail", value: "#FF6B57", soft: "#3A231E" },
  ambre: { label: "Ambre", value: "#FFB020", soft: "#3A2C14" },
  menthe: { label: "Menthe", value: "#2DD4A7", soft: "#14332B" },
  graphite: { label: "Graphite", value: "#9AA0AE", soft: "#22242B" },
};

export const ACCENT_ORDER: AccentKey[] = [
  "ciel",
  "indigo",
  "violet",
  "rose",
  "corail",
  "ambre",
  "menthe",
  "graphite",
];

// Palette déterministe pour les matières (si l'utilisateur ne les recolore pas à la main).
export const SUBJECT_PALETTE = [
  "#4FA6FF",
  "#FF6B57",
  "#2DD4A7",
  "#FFB020",
  "#B26CFF",
  "#FF5FA8",
  "#6C7BFF",
  "#5FD1D1",
  "#E0C34A",
  "#8FBF5F",
];

export function colorForSubject(name: string, overrides: Record<string, string>): string {
  if (overrides[name]) return overrides[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % SUBJECT_PALETTE.length;
  return SUBJECT_PALETTE[index];
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const value = parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
