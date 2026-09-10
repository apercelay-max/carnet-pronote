// Catalogue d'animations de l'app.
//
// Une animation ici décrit UNIQUEMENT un état de départ (d'où le contenu
// arrive) : le reste — durée, décalage entre les cartes, amplitude — vient des
// réglages de la personne (voir useMotionStore). Ça permet d'ajouter une
// animation en ajoutant une ligne au catalogue, sans toucher au composant qui
// les joue (Motion.tsx).

export type MotionId =
  | "aucune"
  | "fondu"
  | "glisse"
  | "ressort"
  | "pixels"
  | "flou"
  | "retournement"
  | "balayage"
  | "glitch"
  | "cascade"
  | "zoom"
  | "depliage";

export type MotionSpec = {
  label: string;
  description: string;
  /** Opacité de départ (1 = le contenu est déjà visible, cas du balayage). */
  opacityFrom: number;
  /** Décalage vertical de départ, en px — multiplié par l'intensité. */
  translateY?: number;
  translateX?: number;
  scaleFrom?: number;
  /** Étirement vertical (dépliage) — l'échelle X reste à 1. */
  scaleYFrom?: number;
  /** Bascule 3D en degrés (nécessite une perspective). */
  rotateXFrom?: number;
  /** Inclinaison à plat, en degrés. */
  rotateZFrom?: number;
  /** Ressort au lieu d'une courbe douce. */
  spring?: boolean;
  /** Grille de carrés qui se dissolvent par-dessus le contenu. */
  pixels?: boolean;
  /** Rideau plein qui glisse vers la droite pour révéler le contenu. */
  wipe?: boolean;
  /** Secousses horizontales façon écran qui décroche. */
  jitter?: boolean;
  /** Flou de départ en px — web uniquement, ignoré ailleurs. */
  blur?: number;
};

export const MOTION_ORDER: MotionId[] = [
  "fondu",
  "glisse",
  "ressort",
  "pixels",
  "flou",
  "retournement",
  "balayage",
  "glitch",
  "cascade",
  "zoom",
  "depliage",
  "aucune",
];

export const MOTIONS: Record<MotionId, MotionSpec> = {
  aucune: {
    label: "Aucune",
    description: "Tout s'affiche d'un coup",
    opacityFrom: 1,
  },
  fondu: {
    label: "Fondu",
    description: "Apparition en douceur",
    opacityFrom: 0,
  },
  glisse: {
    label: "Glissé",
    description: "Le contenu monte depuis le bas",
    opacityFrom: 0,
    translateY: 20,
  },
  ressort: {
    label: "Ressort",
    description: "Petit rebond élastique",
    opacityFrom: 0,
    scaleFrom: 0.88,
    spring: true,
  },
  pixels: {
    label: "Pixels",
    description: "Dissolution 8-bit, comme un vieux jeu",
    opacityFrom: 1,
    pixels: true,
  },
  flou: {
    label: "Flou",
    description: "Devient net progressivement",
    opacityFrom: 0,
    scaleFrom: 1.04,
    blur: 14,
  },
  retournement: {
    label: "Retournement",
    description: "Les cartes basculent vers toi",
    opacityFrom: 0,
    rotateXFrom: -70,
  },
  balayage: {
    label: "Balayage",
    description: "Révélé de gauche à droite",
    opacityFrom: 1,
    wipe: true,
  },
  glitch: {
    label: "Glitch",
    description: "Secousse électrique",
    opacityFrom: 0,
    jitter: true,
  },
  cascade: {
    label: "Cascade",
    description: "Les cartes tombent en pile",
    opacityFrom: 0,
    translateY: -26,
    rotateZFrom: -5,
    spring: true,
  },
  zoom: {
    label: "Zoom",
    description: "Arrivée depuis le fond",
    opacityFrom: 0,
    scaleFrom: 1.2,
  },
  depliage: {
    label: "Dépliage",
    description: "Se déplie comme une carte routière",
    opacityFrom: 0,
    scaleYFrom: 0.25,
  },
};

export type MotionSpeed = "lente" | "normale" | "rapide";
export type MotionIntensity = "discrete" | "normale" | "marquee";

export const SPEED_MS: Record<MotionSpeed, number> = {
  lente: 880,
  normale: 500,
  rapide: 290,
};

export const SPEED_LABELS: Record<MotionSpeed, string> = {
  lente: "Lente",
  normale: "Normale",
  rapide: "Rapide",
};

export const INTENSITY_FACTOR: Record<MotionIntensity, number> = {
  discrete: 0.5,
  normale: 1,
  marquee: 1.75,
};

export const INTENSITY_LABELS: Record<MotionIntensity, string> = {
  discrete: "Discrète",
  normale: "Normale",
  marquee: "Marquée",
};

/**
 * Décalage avant qu'une carte démarre son animation, en ms.
 *
 * Plafonné : sur un écran qui contient 30 devoirs, un décalage non borné
 * ferait attendre plusieurs secondes avant que la dernière carte apparaisse —
 * on aurait l'impression que l'app rame.
 */
export const MAX_STAGGER_STEPS = 7;

export function staggerDelay(index: number, speedMs: number, enabled: boolean): number {
  if (!enabled || index <= 0) return 0;
  return Math.min(index, MAX_STAGGER_STEPS) * Math.round(speedMs * 0.11);
}

/**
 * Traduction de l'animation choisie en transition d'écran du navigateur natif
 * (expo-router / react-native-screens). Ces transitions-là ne sont pas
 * pilotables par Animated : on choisit celle qui ressemble le plus à
 * l'animation retenue, pour que l'ouverture d'une page ait le même caractère
 * que le reste de l'app.
 */
export function stackAnimationFor(id: MotionId): string {
  switch (id) {
    case "aucune":
      return "none";
    case "glisse":
    case "cascade":
    case "ressort":
      return "slide_from_bottom";
    case "retournement":
      return "flip";
    case "balayage":
      return "slide_from_right";
    case "glitch":
    case "depliage":
      return "fade_from_bottom";
    default:
      return "fade";
  }
}
