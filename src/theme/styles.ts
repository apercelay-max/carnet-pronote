// Système de "styles" : 4 habillages visuels distincts, chacun décliné en
// clair ET sombre (indépendant du choix clair/sombre existant). La couleur
// d'accent reste un réglage à part (le sélecteur existant), commun à tous
// les styles — un style change la STRUCTURE (formes, bordures, cartes,
// barre du bas), pas la couleur choisie par la personne.
//
// Aucune transparence/flou ici : toutes les surfaces sont opaques. On a eu
// une régression de contraste avec un fond "ambiant" translucide plus tôt —
// plus jamais ça. Solide, prévisible, identique partout.

export type StyleId = "nouveau" | "classique" | "sport" | "epure";

export const STYLE_ORDER: StyleId[] = ["nouveau", "classique", "sport", "epure"];

export const STYLE_META: Record<StyleId, { label: string; description: string; swatch: [string, string, string] }> = {
  nouveau: {
    label: "Nouveau",
    description: "Surfaces pleines, gros chiffres",
    swatch: ["#0C0E0D", "#6CCB94", "#ECEFEA"],
  },
  classique: {
    label: "Classique",
    description: "Sombre violacé et dégradé de couleur",
    swatch: ["#131318", "#E03030", "#9B27AF"],
  },
  sport: {
    label: "Sport pro",
    description: "Noir, dense, filets fins",
    swatch: ["#050607", "#3DDC97", "#F2F4F7"],
  },
  epure: {
    label: "Épuré",
    description: "Noir et blanc, sans cadres",
    swatch: ["#FFFFFF", "#111111", "#737373"],
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

// Les quatre habillages reprennent ceux de PPL Tracker (mêmes valeurs que ses
// variables CSS --h-*).
export const STYLE_PALETTES: Record<StyleId, { light: StyleNeutrals; dark: StyleNeutrals }> = {
  nouveau: {
    dark: {
      background: "#0C0E0D",
      backgroundElevated: "#151917",
      surface: "#151917",
      surfaceElevated: "#1C2120",
      border: "#2E3632",
      borderSoft: "#252B28",
      textPrimary: "#ECEFEA",
      textSecondary: "#C3C9C4",
      textTertiary: "#8D958F",
      danger: "#E0533D",
      success: "#6CCB94",
      warning: "#E8A33D",
    },
    light: {
      background: "#F2F3EF",
      backgroundElevated: "#EEF0EB",
      surface: "#FFFFFF",
      surfaceElevated: "#EEF0EB",
      border: "#D2D7CE",
      borderSoft: "#E0E3DC",
      textPrimary: "#131614",
      textSecondary: "#3A413C",
      textTertiary: "#5F6862",
      danger: "#C0392B",
      success: "#23794D",
      warning: "#A8680F",
    },
  },
  classique: {
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
  // Sport pro : sombre quel que soit le thème choisi (c'est un cadran, pas
  // une page) — ThemeProvider force isDark pour ce style.
  sport: {
    dark: {
      background: "#050607",
      backgroundElevated: "#0D0F12",
      surface: "#0D0F12",
      surfaceElevated: "#14171B",
      border: "#2A2F36",
      borderSoft: "#1D2126",
      textPrimary: "#F2F4F7",
      textSecondary: "#B4BAC2",
      textTertiary: "#7A818C",
      danger: "#FF4D5E",
      success: "#3DDC97",
      warning: "#FFB020",
    },
    light: {
      background: "#050607",
      backgroundElevated: "#0D0F12",
      surface: "#0D0F12",
      surfaceElevated: "#14171B",
      border: "#2A2F36",
      borderSoft: "#1D2126",
      textPrimary: "#F2F4F7",
      textSecondary: "#B4BAC2",
      textTertiary: "#7A818C",
      danger: "#FF4D5E",
      success: "#3DDC97",
      warning: "#FFB020",
    },
  },
  epure: {
    light: {
      background: "#FFFFFF",
      backgroundElevated: "#F2F2F2",
      surface: "#FFFFFF",
      surfaceElevated: "#F2F2F2",
      border: "#EBEBEB",
      borderSoft: "#EBEBEB",
      textPrimary: "#111111",
      textSecondary: "#474747",
      textTertiary: "#737373",
      danger: "#C62828",
      success: "#2E7D4F",
      warning: "#A35F00",
    },
    dark: {
      background: "#0C0C0C",
      backgroundElevated: "#1A1A1A",
      surface: "#0C0C0C",
      surfaceElevated: "#1A1A1A",
      border: "#222222",
      borderSoft: "#222222",
      textPrimary: "#EDEDED",
      textSecondary: "#B5B5B5",
      textTertiary: "#8C8C8C",
      danger: "#F06060",
      success: "#5CC98A",
      warning: "#E0A040",
    },
  },
};

export type CardTreatment =
  | "flat-fill" // surface pleine + bordure discrète
  | "left-bar" // surface pleine + filet d'accent à gauche (Sport pro)
  | "hairline"; // pas de carte : un simple filet au-dessus (Épuré)
export type TabBarTreatment =
  | "floating-pill"
  | "bordered-panel"
  | "solid-block"
  | "tabbed-ruler"
  | "liquid-glass";

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
  nouveau: {
    card: { treatment: "flat-fill", radius: 14, borderWidth: 1, shadowOpacity: 0 },
    // "liquid-glass" = barre du bas de PPL Tracker : pilule flottante en verre
    // dépoli (voir _layout.tsx et TabButton.tsx).
    tabBar: { treatment: "liquid-glass", radius: 22 },
    typography: { headingWeight: "800", mono: false },
    signal: { light: "#23794D", dark: "#6CCB94" },
    accentBarColors: [],
  },
  classique: {
    card: { treatment: "flat-fill", radius: 14, borderWidth: 1, shadowOpacity: 0 },
    tabBar: { treatment: "liquid-glass", radius: 22 },
    typography: { headingWeight: "800", mono: false },
    signal: { light: "#C02020", dark: "#E03030" },
    accentBarColors: [],
  },
  sport: {
    card: { treatment: "left-bar", radius: 12, borderWidth: 1, shadowOpacity: 0 },
    tabBar: { treatment: "liquid-glass", radius: 22 },
    typography: { headingWeight: "800", mono: true },
    signal: { light: "#3DDC97", dark: "#3DDC97" },
    accentBarColors: [],
  },
  epure: {
    card: { treatment: "hairline", radius: 0, borderWidth: 1, shadowOpacity: 0 },
    tabBar: { treatment: "liquid-glass", radius: 22 },
    typography: { headingWeight: "700", mono: false },
    signal: { light: "#111111", dark: "#EDEDED" },
    accentBarColors: [],
  },
};

// Dégradé de marque de Classique (repris de PPL) — utilisé pour les boutons
// principaux et la pulsation des records. Les autres styles n'en ont pas :
// on retombe alors sur l'accent plein choisi par la personne.
export const FORGE_GRADIENT: [string, string] = ["#E03030", "#9B27AF"];
