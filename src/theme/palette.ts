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

export const DARK_NEUTRALS = {
  background: "#0B0D12",
  backgroundElevated: "#0F1218",
  surface: "#14171F",
  surfaceElevated: "#1C202B",
  border: "#262B38",
  borderSoft: "#1B1F29",
  textPrimary: "#F5F6FA",
  textSecondary: "#9AA0AE",
  textTertiary: "#5C6270",
  danger: "#FF5B5B",
  success: "#2DD4A7",
  warning: "#FFB020",
};

export const LIGHT_NEUTRALS = {
  background: "#F4F5F8",
  backgroundElevated: "#EDEFF4",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  border: "#E4E6EC",
  borderSoft: "#ECEEF3",
  textPrimary: "#14171F",
  textSecondary: "#666C7A",
  textTertiary: "#9AA0AE",
  danger: "#E0433A",
  success: "#1FA987",
  warning: "#C97D0A",
};
