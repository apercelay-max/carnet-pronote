// Palette de base — pensée dark-first (comme UniTools) mais avec un vrai mode clair.
// Tout le système de personnalisation (thème, accent, couleurs de matières) part de ce fichier.

// Préréglages repris de PPL : 6 couleurs classiques + les couleurs officielles
// de plusieurs enseignes de sport (relevées sur leurs sites).
export const ACCENTS = {
  rouge: { label: "Rouge", value: "#E03030" },
  bleu: { label: "Bleu", value: "#2563EB" },
  vert: { label: "Vert", value: "#16A34A" },
  orange: { label: "Orange", value: "#EA580C" },
  violet: { label: "Violet", value: "#9333EA" },
  cyan: { label: "Cyan", value: "#0891B2" },
  "gym-basicfit": { label: "Basic-Fit", value: "#FF8712" },
  "gym-fitnesspark": { label: "Fitness Park", value: "#FFD600" },
  "gym-orangebleue": { label: "L'Orange Bleue", value: "#F36C21" },
  "gym-keepcool": { label: "Keepcool", value: "#66CC99" },
  "gym-neoness": { label: "Neoness", value: "#D71730" },
  "gym-libertygym": { label: "Liberty GYM", value: "#83BE00" },
  "gym-johnreed": { label: "John Reed", value: "#F0077B" },
  "gym-gigafit": { label: "GIGAFIT", value: "#C9A227" },
  "gym-magicform": { label: "Magic Form", value: "#CE2329" },
} as const;

export type AccentKey = keyof typeof ACCENTS;

export const ACCENT_ORDER = Object.keys(ACCENTS) as AccentKey[];

export const DEFAULT_ACCENT: AccentKey = "bleu";

// Ancien identifiant persisté (ciel, indigo…) → on retombe sur le défaut.
export function resolveAccent(key: string): AccentKey {
  return key in ACCENTS ? (key as AccentKey) : DEFAULT_ACCENT;
}

// Teinte sombre de l'accent, pour les fonds "sélectionné".
export function accentSoft(hex: string, isDark: boolean): string {
  const { r, g, b } = rgb(hex);
  const base = isDark ? 20 : 255;
  const t = isDark ? 0.22 : 0.14;
  const mix = (c: number) => Math.round(base + (c - base) * t);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

// Couleur de texte lisible posée sur l'accent plein.
export function onAccent(hex: string): string {
  const { r, g, b } = rgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0B0D12" : "#FFFFFF";
}

function rgb(hex: string) {
  const clean = hex.replace("#", "");
  const v = parseInt(clean, 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

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
