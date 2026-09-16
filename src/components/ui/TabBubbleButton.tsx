import React from "react";
import { Pressable, ViewStyle, StyleProp } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { FORGE_GRADIENT } from "../../theme/styles";
import { usePreferencesStore, TAB_BUBBLE_ACTIONS } from "../../store/usePreferencesStore";
import { Icon } from "./Icon";

// Bulle colorée détachée de la barre du bas — reprise du bouton « lancer la
// séance » de PPL Tracker (startBtn dans NavBar.tsx) : rond plein en dégradé
// de marque, ombre colorée, reflet en haut. Positionnée par _layout.tsx juste
// à droite de la capsule, à la même hauteur qu'elle.
export function TabBubbleButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const router = useRouter();
  const actionId = usePreferencesStore((s) => s.tabBubbleAction);
  const action = TAB_BUBBLE_ACTIONS[actionId];
  const accent = theme.colors.accent;
  // Forge garde son dégradé rouge → violet de PPL ; les autres styles
  // prennent la couleur d'accent choisie, pleine (le reflet fait le relief).
  const colors: [string, string] = theme.styleId === "forge" ? FORGE_GRADIENT : [accent, accent];

  const scale = useSharedValue(1);
  const bounce = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        {
          shadowColor: accent,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.45,
          shadowRadius: 18,
          elevation: 12,
          borderRadius: 999,
        },
        style,
        bounce,
      ]}
    >
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          router.push(action.href as any);
        }}
        onPressIn={() => {
          scale.value = withSpring(0.9, { damping: 16, stiffness: 340 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 11, stiffness: 240 });
        }}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        style={{ flex: 1, borderRadius: 999, overflow: "hidden" }}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          {/* Reflet du haut, l'équivalent de l'inset box-shadow blanc de PPL. */}
          <LinearGradient
            colors={["rgba(255,255,255,0.32)", "rgba(255,255,255,0)"]}
            style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%" }}
            pointerEvents="none"
          />
          <Icon name={action.icon} size={22} color="#FFFFFF" strokeWidth={2.2} />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
