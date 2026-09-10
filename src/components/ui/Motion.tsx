import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Platform, View, StyleProp, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { useMotionStore } from "../../store/useMotionStore";
import {
  INTENSITY_FACTOR,
  MOTIONS,
  SPEED_MS,
  staggerDelay,
  type MotionId,
} from "../../lib/motion";

// react-native-web ne sait pas piloter les animations depuis le thread natif :
// passer `useNativeDriver: true` y déclencherait un avertissement à chaque
// carte affichée.
const NATIVE_DRIVER = Platform.OS !== "web";
const IS_WEB = Platform.OS === "web";

// Grille de l'animation Pixels. Volontairement fixe et exprimée en
// pourcentages : une grille calculée d'après la taille mesurée du bloc obligeait
// à attendre un onLayout avant de pouvoir dessiner quoi que ce soit — et quand
// cet onLayout n'arrivait pas, le contenu restait invisible pour de bon. Une
// grille fixe s'adapte à n'importe quelle taille sans rien mesurer.
const PIXEL_COLS = 8;
const PIXEL_ROWS = 6;

// --- Cascade automatique -----------------------------------------------
//
// Pour que les cartes s'animent l'une après l'autre, chacune doit connaître
// son rang. Plutôt que de faire passer un `index` à la main dans les ~40
// endroits qui affichent une Card, chaque carte demande son rang à l'écran qui
// la contient au moment où elle se monte. Un écran = une suite, remise à zéro
// à chaque arrivée sur l'onglet.

type Sequence = { next: () => number; replayKey: string | number };

const SequenceContext = React.createContext<Sequence | null>(null);

export function MotionSequence({
  children,
  resetKey,
}: {
  children: React.ReactNode;
  resetKey?: string | number;
}) {
  const value = useMemo<Sequence>(() => {
    let n = 0;
    return { next: () => n++, replayKey: resetKey ?? 0 };
  }, [resetKey]);
  return <SequenceContext.Provider value={value}>{children}</SequenceContext.Provider>;
}

/** Rang de l'élément dans l'écran courant (0 pour le premier monté). */
export function useStaggerIndex(explicit?: number): number {
  const ctx = React.useContext(SequenceContext);
  // useState avec initialiseur : le rang est tiré UNE fois, au montage, et ne
  // bouge plus quand le composant se re-rend.
  const [index] = useState(() => (explicit != null ? explicit : ctx ? ctx.next() : 0));
  return explicit != null ? explicit : index;
}

type RevealProps = {
  children: React.ReactNode;
  /** Rang de l'élément à l'écran — sert au décalage en cascade. */
  index?: number;
  /** Force une animation précise (aperçu des Réglages). Sinon : celle choisie. */
  motionId?: MotionId;
  /** À false, le contenu s'affiche sans animation du tout. */
  active?: boolean;
  /** Rejoue l'animation quand cette valeur change (retour sur un onglet). */
  replayKey?: string | number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Joue l'animation d'arrivée choisie dans les Réglages autour de n'importe
 * quel contenu.
 *
 * Utilisé à deux endroits qui couvrent toute l'app : `Screen` (l'écran
 * entier, à chaque arrivée sur un onglet) et `Card` (chaque carte, en
 * cascade). Un écran n'a donc rien à faire pour être animé.
 */
export function Reveal({ children, index = 0, motionId, active = true, replayKey, style }: RevealProps) {
  const theme = useTheme();
  // Sans clé explicite, on suit celle de l'écran : revenir sur un onglet
  // rejoue l'animation au lieu d'afficher un écran figé pendant que les
  // autres s'animent.
  const sequence = React.useContext(SequenceContext);
  const replay = replayKey ?? sequence?.replayKey ?? 0;
  const storeId = useMotionStore((s) => s.motionId);
  const speed = useMotionStore((s) => s.speed);
  const intensity = useMotionStore((s) => s.intensity);

  const id = motionId ?? storeId;
  const spec = MOTIONS[id] ?? MOTIONS.fondu;
  const duration = SPEED_MS[speed];
  const factor = INTENSITY_FACTOR[intensity];
  const delay = staggerDelay(index, duration, true);
  const off = !active || id === "aucune";

  const [finished, setFinished] = useState(off);
  const [sharp, setSharp] = useState(off || !spec.blur);

  const progress = useRef(new Animated.Value(off ? 1 : 0)).current;
  const jitter = useRef(new Animated.Value(0)).current;

  const ready = !off;

  useEffect(() => {
    if (off) {
      progress.setValue(1);
      setFinished(true);
      return;
    }
    // Rejoue depuis le début quand on revient sur l'onglet.
    progress.setValue(0);
    setFinished(false);
    setSharp(!spec.blur);
  }, [replay, id, off]);

  useEffect(() => {
    if (!ready) return;
    const anim = spec.spring
      ? Animated.spring(progress, {
          toValue: 1,
          delay,
          friction: 7,
          tension: 70,
          useNativeDriver: NATIVE_DRIVER,
        })
      : Animated.timing(progress, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: NATIVE_DRIVER,
        });

    const running: Animated.CompositeAnimation[] = [anim];

    if (spec.jitter) {
      const amp = 9 * factor;
      running.push(
        Animated.sequence([
          Animated.delay(delay),
          ...[amp, -amp * 0.8, amp * 0.55, -amp * 0.3, 0].map((to) =>
            Animated.timing(jitter, {
              toValue: to,
              duration: Math.max(40, duration / 7),
              easing: Easing.linear,
              useNativeDriver: NATIVE_DRIVER,
            })
          ),
        ])
      );
    }

    const all = Animated.parallel(running);
    all.start(() => setFinished(true));
    return () => all.stop();
  }, [ready, replay, id, duration, delay, factor]);

  // Flou : impossible à interpoler avec Animated (c'est un filtre CSS), donc
  // on bascule d'un état à l'autre après la première image et on laisse la
  // transition CSS faire le trajet. Web uniquement — ailleurs, l'échelle et
  // l'opacité de la même animation suffisent.
  useEffect(() => {
    if (off || !spec.blur || !IS_WEB || sharp) return;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setSharp(true)));
    return () => cancelAnimationFrame(raf);
  }, [off, id, replay, sharp]);

  const animatedStyle = useMemo(() => {
    if (off) return null;

    const transform: any[] = [];
    if (spec.rotateXFrom) transform.push({ perspective: 800 });

    if (spec.translateY) {
      transform.push({
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [spec.translateY * factor, 0],
        }),
      });
    }
    if (spec.translateX) {
      transform.push({
        translateX: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [spec.translateX * factor, 0],
        }),
      });
    }
    if (spec.jitter) transform.push({ translateX: jitter });

    if (spec.scaleFrom) {
      const from = 1 + (spec.scaleFrom - 1) * factor;
      transform.push({
        scale: progress.interpolate({ inputRange: [0, 1], outputRange: [from, 1] }),
      });
    }
    if (spec.scaleYFrom) {
      const from = 1 + (spec.scaleYFrom - 1) * factor;
      transform.push({
        scaleY: progress.interpolate({ inputRange: [0, 1], outputRange: [from, 1] }),
      });
    }
    if (spec.rotateXFrom) {
      transform.push({
        rotateX: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [`${spec.rotateXFrom * factor}deg`, "0deg"],
        }),
      });
    }
    if (spec.rotateZFrom) {
      transform.push({
        rotate: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [`${spec.rotateZFrom * factor}deg`, "0deg"],
        }),
      });
    }

    const opacity =
      spec.opacityFrom >= 1
        ? undefined
        : progress.interpolate({ inputRange: [0, 0.65, 1], outputRange: [spec.opacityFrom, 1, 1] });

    return { opacity, transform: transform.length ? transform : undefined };
  }, [off, id, factor]);

  if (off) return <View style={style}>{children}</View>;

  const webBlur =
    IS_WEB && spec.blur
      ? ({
          filter: sharp ? "blur(0px)" : `blur(${spec.blur * factor}px)`,
          transitionProperty: "filter",
          transitionDuration: `${duration}ms`,
          transitionDelay: `${delay}ms`,
        } as any)
      : null;

  return (
    <Animated.View
      style={[
        style,
        animatedStyle as any,
        webBlur,
        // Le dépliage part du haut (comme une carte qu'on ouvre) plutôt que du
        // centre. Propriété web uniquement, ignorée sur mobile.
        IS_WEB && spec.scaleYFrom ? ({ transformOrigin: "top" } as any) : null,
        // Le rideau du balayage traverse le bloc : sans découpe il déborderait
        // sur les cartes voisines.
        spec.wipe ? { overflow: "hidden" as const } : null,
      ]}
    >
      {children}
      {/* Les décors s'enlèvent du rendu une fois l'animation finie : ils ne
          coûtent rien pendant tout le reste de la vie de l'écran. */}
      {spec.pixels && !finished ? (
        <PixelCurtain progress={progress} color={theme.colors.background} />
      ) : null}
      {spec.wipe && !finished ? (
        <WipeCurtain progress={progress} color={theme.colors.background} />
      ) : null}
    </Animated.View>
  );
}

/**
 * Grille de carrés couleur fond qui se dissolvent dans un ordre aléatoire :
 * l'effet "image qui se dépixellise" des vieux jeux.
 *
 * Chaque carré tire son opacité de la MÊME valeur animée (une seule animation
 * pilote toute la grille) — sinon on créerait des dizaines d'animations par
 * carte, ce qui ferait ramer les longues listes de devoirs.
 */
function PixelCurtain({ progress, color }: { progress: Animated.Value; color: string }) {
  // Chaque carré part à un moment différent, tiré une fois pour toutes : c'est
  // ce désordre qui donne l'impression d'une image qui se dépixellise, plutôt
  // que d'un damier qui s'efface ligne par ligne.
  const cells = useMemo(
    () =>
      Array.from({ length: PIXEL_COLS * PIXEL_ROWS }, (_, i) => ({
        key: i,
        start: Math.random() * 0.6,
      })),
    []
  );

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: "row",
        flexWrap: "wrap",
      }}
    >
      {cells.map((cell) => (
        <Animated.View
          key={cell.key}
          style={{
            width: `${100 / PIXEL_COLS}%`,
            height: `${100 / PIXEL_ROWS}%`,
            backgroundColor: color,
            opacity: progress.interpolate({
              inputRange: [cell.start, Math.min(1, cell.start + 0.4)],
              outputRange: [1, 0],
              extrapolate: "clamp",
            }),
          }}
        />
      ))}
    </View>
  );
}

/** Rideau plein qui glisse vers la droite et découvre le contenu. */
function WipeCurtain({ progress, color }: { progress: Animated.Value; color: string }) {
  // On fait voyager le rideau de la largeur de l'écran plutôt que de celle du
  // bloc : c'est toujours au moins assez (une carte ne dépasse jamais l'écran),
  // et ça évite d'avoir à mesurer quoi que ce soit avant de pouvoir animer.
  const travel = Dimensions.get("window").width;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: color,
        transform: [
          { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }) },
        ],
      }}
    />
  );
}

/**
 * Enfoncement + vibration quand on appuie. Branché sur les cartes cliquables
 * et les boutons, pilotable depuis les Réglages ("Retour au toucher").
 */
export function usePressMotion(enabled = true) {
  const press = useMotionStore((s) => s.press);
  const scale = useRef(new Animated.Value(1)).current;
  const on = enabled && press;

  const to = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      friction: 8,
      tension: 180,
      useNativeDriver: NATIVE_DRIVER,
    }).start();

  return {
    active: on,
    onPressIn: () => {
      if (!on) return;
      if (!IS_WEB) Haptics.selectionAsync().catch(() => {});
      to(0.97);
    },
    onPressOut: () => {
      if (!on) return;
      to(1);
    },
    style: on ? { transform: [{ scale }] } : undefined,
  };
}
