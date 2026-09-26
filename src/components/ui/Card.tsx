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
  // Sport pro uniquement : couleur du filet à gauche de la carte. Par défaut,
  // l'accent choisi par la personne (ex. couleur de matière sur les listes).
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
  const isBar = card.treatment === "left-bar";
  const isHairline = card.treatment === "hairline";

  const base: ViewStyle = {
    backgroundColor: c.surface,
    borderRadius: card.radius,
    overflow: "hidden",
  };

  let extra: ViewStyle = {};
  let decoration: React.ReactNode = null;

  if (card.treatment === "flat-fill") {
    // Surface pleine, bordure discrète, aucune ombre ni décoration. Toute la
    // hiérarchie vient du contenu (chiffres, puces teintées).
    extra = {
      borderWidth: card.borderWidth,
      borderColor: c.borderSoft,
      backgroundColor: elevated ? c.surfaceElevated : c.surface,
    };
  } else if (card.treatment === "left-bar") {
    // Sport pro : filet d'accent à gauche, comme le bandeau de la séance du
    // jour dans PPL. Le `tint` de l'écran (couleur de matière) prime.
    extra = { borderWidth: card.borderWidth, borderColor: c.borderSoft };
    decoration = (
      <View
        style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 3, backgroundColor: tint ?? c.accent }}
      />
    );
  } else if (card.treatment === "hairline") {
    // Épuré : pas de carte, un filet au-dessus du bloc et de l'air.
    extra = {
      backgroundColor: "transparent",
      borderTopWidth: card.borderWidth,
      borderColor: c.border,
    };
  }

  const innerPadding = padded
    ? {
        paddingVertical: theme.spacing(4),
        paddingRight: isHairline ? 0 : theme.spacing(4),
        paddingLeft: isHairline ? 0 : isBar ? theme.spacing(4) + 4 : theme.spacing(4),
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
