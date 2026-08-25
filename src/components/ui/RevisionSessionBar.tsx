import React, { useEffect } from "react";
import { View, Pressable, ScrollView, ViewStyle, StyleProp } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "./Icon";
import { T } from "./Text";
import { useRevisionSessionStore } from "../../store/useRevisionSessionStore";
import { useRevisionPreferencesStore } from "../../store/useRevisionPreferencesStore";

// Remplace la barre à onglets pendant une session de flashcards : bouton
// retour + pastilles numérotées 1..N — inspiré de SessionTabBar.tsx dans PPL
// Tracker, qui fait la même bascule pendant une séance de sport active.
// Reçoit `style` en prop plutôt que de le recalculer : c'est exactement le
// même gabarit (position, marges, ombre) que la barre à onglets normale,
// pour que les deux occupent rigoureusement le même espace en bas d'écran.
export function RevisionSessionBar({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const total = useRevisionSessionStore((s) => s.total);
  const index = useRevisionSessionStore((s) => s.index);
  const onJump = useRevisionSessionStore((s) => s.onJump);
  const onBack = useRevisionSessionStore((s) => s.onBack);
  const animationsEnabled = useRevisionPreferencesStore((s) => s.animationsEnabled);

  const progress = useSharedValue(animationsEnabled ? 0 : 1);
  useEffect(() => {
    progress.value = animationsEnabled ? withTiming(1, { duration: 220 }) : 1;
    // Volontairement sans dépendances : ne joue qu'à l'apparition de la
    // barre (au montage), pas à chaque changement de carte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const entrance = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 14 }],
  }));

  return (
    <Animated.View style={[style, entrance]}>
      <BlurView
        intensity={38}
        tint={theme.isDark ? "dark" : "light"}
        style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 6, gap: 2 }}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]}
          style={{
            position: "absolute",
            top: 0,
            left: "8%",
            right: "8%",
            height: "46%",
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
          }}
          pointerEvents="none"
        />

        <Pressable onPress={onBack} hitSlop={10} style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
          <Icon name="chevronLeft" size={20} color={theme.colors.textPrimary} />
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 }}
        >
          {Array.from({ length: total }).map((_, i) => {
            const active = i === index;
            return (
              <Pressable
                key={i}
                onPress={() => onJump(i)}
                hitSlop={4}
                style={{
                  minWidth: active ? 26 : 20,
                  height: active ? 26 : 20,
                  paddingHorizontal: active ? 4 : 0,
                  borderRadius: 13,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active ? theme.colors.accent : "transparent",
                  borderWidth: active ? 0 : 1,
                  borderColor: theme.colors.textTertiary,
                }}
              >
                <T style={{ fontSize: 10, fontWeight: "700", color: active ? "#FFFFFF" : theme.colors.textTertiary }}>
                  {i + 1}
                </T>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 10 }}>
          <T variant="caption" tone="tertiary" style={{ fontSize: 10 }}>
            {index + 1}/{total}
          </T>
        </View>
      </BlurView>
    </Animated.View>
  );
}
