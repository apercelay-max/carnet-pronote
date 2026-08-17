// Système de "styles" : 4 habillages visuels distincts, chacun décliné en
// clair ET sombre (indépendant du choix clair/sombre existant). La couleur
// d'accent reste un réglage à part (le sélecteur existant), commun à tous
// les styles — un style change la STRUCTURE (formes, bordures, cartes,
// barre du bas), pas la couleur choisie par la personne.
//
// Aucune transparence/flou ici : toutes les surfaces sont opaques. On a eu
// une régression de contraste avec un fond "ambiant" translucide plus tôt —
// plus jamais ça. Solide, prévisible, identique partout.

export type StyleId = "aurora" | "cockpit" | "editorial" | "carnet" | "forge";

export const STYLE_ORDER: StyleId[] = ["forge", "aurora", "cockpit", "editorial", "carnet"];

export const STYLE_META: Record<StyleId, { label: string; description: string; swatch: [string, string, string] }> = {
  aurora: {
    label: "Aurora",
    description: "Clair et coloré, dégradés doux",
    swatch: ["#F3F4FA", "#6C7BFF", "#34D399"],
  },
  cockpit: {
    label: "Cockpit",
    description: "Sombre et chaud, esprit aviation",
    swatch: ["#0F0C09", "#F5A623", "#6EE7B7"],
  },
  editorial: {
    label: "Editorial",
    description: "Contrasté, bords nets, look magazine",
    swatch: ["#ECEAE4", "#1C1B19", "#C0392B"],
  },
  carnet: {
    label: "Carnet",
    description: "Papier & tableau noir, esprit cahier",
    swatch: ["#F6EFDC", "#B0342A", "#2E2416"],
  },
  forge: {
    label: "Forge",
    description: "Sombre et dense, chiffres en avant",
    swatch: ["#131318", "#E03030", "#9B27AF"],
  },
};

export type StyleNeutrals = {
  background: string;
  backgroundElevated: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderSoft: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  danger: string;
  success: string;
  warning: string;
};

export const STYLE_PALETTES: Record<StyleId, { light: StyleNeutrals; dark: StyleNeutrals }> = {
  aurora: {
    light: {
      background: "#F3F4FA",
      backgroundElevated: "#EBEDF7",
      surface: "#FFFFFF",
      surfaceElevated: "#FFFFFF",
      border: "#E6E8F2",
      borderSoft: "#EEF0F8",
      textPrimary: "#1A1D29",
      textSecondary: "#6B7280",
      textTertiary: "#9AA0AE",
      danger: "#E0433A",
      success: "#1FA987",
      warning: "#C97D0A",
    },
    dark: {
      background: "#14151F",
      backgroundElevated: "#191B27",
      surface: "#1E202E",
      surfaceElevated: "#262939",
      border: "#2E3145",
      borderSoft: "#262A3A",
      textPrimary: "#F3F4FA",
      textSecondary: "#A5A9BE",
      textTertiary: "#6D7186",
      danger: "#FF6B6B",
      success: "#34D399",
      warning: "#FBBF24",
    },
  },
  cockpit: {
    dark: {
      background: "#0F0C09",
      backgroundElevated: "#161109",
      surface: "#1B150E",
      surfaceElevated: "#221A10",
      border: "rgba(245,166,35,0.25)",
      borderSoft: "rgba(245,166,35,0.14)",
      textPrimary: "#F4EFE6",
      textSecondary: "#B9AE99",
      textTertiary: "#8A806C",
      danger: "#FF6B5C",
      success: "#6EE7B7",
      warning: "#F5A623",
    },
    light: {
      background: "#EDE6D3",
      backgroundElevated: "#E5DCC4",
      surface: "#F7F2E4",
      surfaceElevated: "#FBF8F0",
      border: "rgba(120,90,30,0.28)",
      borderSoft: "rgba(120,90,30,0.16)",
      textPrimary: "#2B2113",
      textSecondary: "#6B5A3D",
      textTertiary: "#8F7C57",
      danger: "#B23A2E",
      success: "#2F7A55",
      warning: "#A9660E",
    },
  },
  editorial: {
    light: {
      background: "#ECEAE4",
      backgroundElevated: "#E3E0D8",
      surface: "#FAF9F6",
      surfaceElevated: "#FFFFFF",
      border: "#1C1B19",
      borderSoft: "#D8D5CC",
      textPrimary: "#1C1B19",
      textSecondary: "#57534E",
      textTertiary: "#8C887F",
      danger: "#C0392B",
      success: "#2F7A4F",
      warning: "#A9660E",
    },
    dark: {
      background: "#17161A",
      backgroundElevated: "#1E1D22",
      surface: "#1C1B20",
      surfaceElevated: "#242229",
      border: "#F4F1EA",
      borderSoft: "#3A3840",
      textPrimary: "#F4F1EA",
      textSecondary: "#A8A49B",
      textTertiary: "#84807A",
      danger: "#FF6B5C",
      success: "#6EE7B7",
      warning: "#FBBF24",
    },
  },
  carnet: {
    light: {
      background: "#F6EFDC",
      backgroundElevated: "#EFE6CE",
      surface: "#FBF6E8",
      surfaceElevated: "#FFFDF5",
      border: "rgba(90,60,40,0.18)",
      borderSoft: "rgba(90,60,40,0.09)",
      textPrimary: "#2E2416",
      textSecondary: "#6B5A42",
      textTertiary: "#8C7B60",
      danger: "#B0342A",
      success: "#2E7D4F",
      warning: "#A9720E",
    },
    dark: {
      background: "#16241C",
      backgroundElevated: "#1C2E23",
      surface: "#1F3327",
      surfaceElevated: "#263D2F",
      border: "rgba(240,238,225,0.16)",
      borderSoft: "rgba(240,238,225,0.09)",
      textPrimary: "#F0EEE1",
      textSecondary: "#B9C4B7",
      textTertiary: "#8B978A",
      danger: "#FF8A75",
      success: "#8FE3B0",
      warning: "#F5C563",
    },
  },
  // Forge : repris de PPL Tracker (mêmes valeurs que ses variables CSS), pour
  // que les deux apps se ressemblent vraiment au pixel près.
  forge: {
    dark: {
      background: "#131318",
      backgroundElevated: "#1D1D26",
      surface: "#1D1D26",
      surfaceElevated: "#25252F",
      border: "#363646",
      borderSoft: "#2C2C39",
      textPrimary: "#FFFFFF",
      textSecondary: "#D6D6E6",
      textTertiary: "#9797B0",
      danger: "#FF6B6B",
      success: "#4CAF50",
      warning: "#F5A623",
    },
    light: {
      background: "#F2F2F7",
      backgroundElevated: "#EBEBF2",
      surface: "#FFFFFF",
      surfaceElevated: "#F6F6FB",
      border: "#DDDDE8",
      borderSoft: "#E8E8F0",
      textPrimary: "#0D0D16",
      textSecondary: "#2A2A3C",
      textTertiary: "#777788",
      danger: "#D93A3A",
      success: "#2E7D32",
      warning: "#B26A00",
    },
  },
};

export type CardTreatment = "accent-bar" | "bordered-glow" | "bold-border" | "paper-margin" | "flat-fill";
export type TabBarTreatment = "floating-pill" | "bordered-panel" | "solid-block" | "tabbed-ruler";

export type StyleStructure = {
  card: {
    treatment: CardTreatment;
    radius: number;
    borderWidth: number;
    shadowOpacity: number;
  };
  tabBar: {
    treatment: TabBarTreatment;
    radius: number;
  };
  typography: {
    headingWeight: "700" | "800" | "900";
    mono: boolean; // chiffres (notes, moyenne) en police monospace
  };
  // Touche décorative (pastille Cockpit, filet Carnet...), indépendante de
  // l'accent choisi par la personne.
  signal: { light: string; dark: string };
  // Aurora uniquement : couleurs des barres en haut de carte, en boucle.
  accentBarColors: string[];
};

export const STYLE_STRUCTURE: Record<StyleId, StyleStructure> = {
  aurora: {
    card: { treatment: "accent-bar", radius: 22, borderWidth: 0, shadowOpacity: 0.1 },
    tabBar: { treatment: "floating-pill", radius: 24 },
    typography: { headingWeight: "800", mono: false },
    signal: { light: "#6C7BFF", dark: "#8B96FF" },
    accentBarColors: ["#6C7BFF", "#34D399", "#FB923C", "#FB7185"],
  },
  cockpit: {
    card: { treatment: "bordered-glow", radius: 16, borderWidth: 1, shadowOpacity: 0 },
    tabBar: { treatment: "bordered-panel", radius: 18 },
    typography: { headingWeight: "800", mono: true },
    signal: { light: "#A9660E", dark: "#F5A623" },
    accentBarColors: [],
  },
  editorial: {
    card: { treatment: "bold-border", radius: 6, borderWidth: 2, shadowOpacity: 0 },
    tabBar: { treatment: "solid-block", radius: 4 },
    typography: { headingWeight: "900", mono: false },
    signal: { light: "#C0392B", dark: "#FF6B5C" },
    accentBarColors: [],
  },
  carnet: {
    card: { treatment: "paper-margin", radius: 12, borderWidth: 1, shadowOpacity: 0.08 },
    tabBar: { treatment: "tabbed-ruler", radius: 16 },
    typography: { headingWeight: "800", mono: false },
    signal: { light: "#B0342A", dark: "#F0C36B" },
    accentBarColors: [],
  },
  forge: {
    card: { treatment: "flat-fill", radius: 14, borderWidth: 1, shadowOpacity: 0 },
    tabBar: { treatment: "bordered-panel", radius: 18 },
    typography: { headingWeight: "800", mono: false },
    signal: { light: "#C02020", dark: "#E03030" },
    accentBarColors: [],
  },
};

// Dégradé de marque de Forge (repris de PPL) — utilisé pour les boutons
// principaux et la pulsation des records. Les autres styles n'en ont pas :
// on retombe alors sur l'accent plein choisi par la personne.
export const FORGE_GRADIENT: [string, string] = ["#E03030", "#9B27AF"];
