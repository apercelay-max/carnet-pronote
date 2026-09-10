import React from "react";
import { Animated, Pressable, View, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { useMotionStore } from "../../store/useMotionStore";
import { Reveal, usePressMotion, useStaggerIndex } from "./Motion";

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevated?: boolean;
  // Aurora uniquement : couleur de la barre en haut de carte. Par défaut,
  // l'accent choisi par la personne — on peut la varier au cas par cas
  // (ex. tableau de bord) sans que ce soit obligatoire ailleurs.
  tint?: string;
  // Rang forcé dans la cascade d'apparition. Par défaut, la carte prend son
  // rang toute seule (ordre de montage dans l'écran) — voir Motion.tsx.
  motionIndex?: number;
  // À false, la carte n'est pas animée : utile pour un aperçu qui doit rester
  // stable pendant qu'on règle justement l'animation.
  animate?: boolean;
};

// Carte 100% opaque : le traitement visuel dépend entièrement du style
// choisi (theme.structure.card.treatment). Aucun flou, aucune transparence
// de fond — on a eu une régression de contraste avec des surfaces
// translucides plus tôt dans le projet, on ne revient pas dessus.
export function Card({
  children,
  onPress,
  style,
  padded = true,
  elevated = false,
  tint,
  motionIndex,
  animate = true,
}: Props) {
  const theme = useTheme();
  const cardsOn = useMotionStore((s) => s.cards);
  const index = useStaggerIndex(motionIndex);
  const press = usePressMotion(!!onPress);
  const { card } = theme.structure;
  const c = theme.colors;
  const isPaper = card.treatment === "paper-margin";
  const isLineBadge = card.treatment === "line-badge";

  const base: ViewStyle = {
    backgroundColor: c.surface,
    borderRadius: card.radius,
    // `overflow: hidden` découperait l'ombre dure décalée du style Pop, qui
    // déborde volontairement de la carte. On ne le garde que pour les
    // traitements dont la décoration doit être rognée aux coins arrondis.
    overflow: card.treatment === "hard-shadow" ? "visible" : "hidden",
  };

  let extra: ViewStyle = {};
  let decoration: React.ReactNode = null;

  if (card.treatment === "accent-bar") {
    extra = {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: elevated ? 12 : 5 },
      shadowOpacity: card.shadowOpacity,
      shadowRadius: elevated ? 24 : 14,
      elevation: elevated ? 8 : 3,
    };
    decoration = (
      <View
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, backgroundColor: tint ?? c.accent }}
      />
    );
  } else if (card.treatment === "bordered-glow") {
    extra = {
      borderWidth: card.borderWidth,
      borderColor: c.border,
      shadowColor: theme.signal,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: elevated ? 0.4 : 0.22,
      shadowRadius: elevated ? 18 : 10,
      elevation: elevated ? 6 : 2,
    };
    decoration = (
      <View
        style={{
          position: "absolute",
          top: 10,
          right: 12,
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: theme.signal,
        }}
      />
    );
  } else if (card.treatment === "flat-fill") {
    // Forge : surface pleine, bordure discrète, aucune ombre ni décoration.
    // Toute la hiérarchie vient du contenu (chiffres, puces teintées), pas du
    // contour de la carte.
    extra = {
      borderWidth: card.borderWidth,
      borderColor: c.borderSoft,
      backgroundColor: elevated ? c.surfaceElevated : c.surface,
    };
  } else if (card.treatment === "line-badge") {
    // Métro : gros bandeau de couleur à gauche, comme une ligne de transport.
    // Le `tint` passé par l'écran (couleur de la matière) prime sur le signal
    // du style, pour que chaque matière garde bien "sa" ligne.
    extra = { borderWidth: 0 };
    decoration = (
      <View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: 6,
          backgroundColor: tint ?? theme.signal,
        }}
      />
    );
  } else if (card.treatment === "hard-shadow") {
    // Pop : bordure franche + ombre pleine décalée, sans flou du tout.
    extra = {
      borderWidth: card.borderWidth,
      borderColor: c.textPrimary,
      shadowColor: c.textPrimary,
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: card.shadowOpacity,
      shadowRadius: 0,
      elevation: 0,
    };
  } else if (card.treatment === "bold-border") {
    extra = { borderWidth: card.borderWidth, borderColor: c.textPrimary };
  } else if (card.treatment === "paper-margin") {
    extra = {
      borderWidth: card.borderWidth,
      borderColor: c.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: card.shadowOpacity,
      shadowRadius: 10,
      elevation: 2,
    };
    decoration = (
      <View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 14,
          width: 2,
          backgroundColor: theme.signal,
          opacity: 0.55,
        }}
      />
    );
  }

  const innerPadding = padded
    ? {
        paddingVertical: theme.spacing(4),
        paddingRight: theme.spacing(4),
        paddingLeft: isPaper ? theme.spacing(4) + 12 : isLineBadge ? theme.spacing(4) + 8 : theme.spacing(4),
      }
    : { padding: 0 };

  const surface = (
    <View style={[base, extra, style]}>
      {decoration}
      <View style={innerPadding}>{children}</View>
    </View>
  );

  // Toutes les cartes de l'app passent par ici : c'est ce qui fait que
  // l'animation choisie dans les Réglages s'applique partout, sans que chaque
  // écran ait quoi que ce soit à faire.
  const content = (
    <Reveal active={cardsOn && animate} index={index}>
      {surface}
    </Reveal>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={({ pressed }) => [{ opacity: pressed && !press.active ? 0.85 : 1 }]}
    >
      <Animated.View style={press.style}>{content}</Animated.View>
    </Pressable>
  );
}
