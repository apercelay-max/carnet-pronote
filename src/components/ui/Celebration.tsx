import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, Platform, View } from "react-native";
import { create } from "zustand";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { useMotionStore } from "../../store/useMotionStore";

const NATIVE_DRIVER = Platform.OS !== "web";
const PARTICLES = 26;
const DURATION = 1500;

// Un compteur suffit : chaque incrément déclenche une volée. Pas besoin de
// gérer une file d'attente — cocher deux devoirs coup sur coup relance
// simplement l'animation depuis le début, ce qui est le comportement attendu.
type CelebrationState = { count: number; fire: () => void };

export const useCelebrationStore = create<CelebrationState>((set) => ({
  count: 0,
  fire: () => set((s) => ({ count: s.count + 1 })),
}));

/** À appeler quand quelque chose de bien vient d'arriver (devoir coché…). */
export function celebrate() {
  const { celebrations } = useMotionStore.getState();
  if (!celebrations) return;
  if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  useCelebrationStore.getState().fire();
}

/**
 * Couche de confettis, montée une seule fois au-dessus de toute l'app (voir
 * app/_layout.tsx). Ne capte jamais les clics et ne rend rien tant qu'aucune
 * volée n'a été déclenchée.
 */
export function CelebrationLayer() {
  const count = useCelebrationStore((s) => s.count);
  if (count === 0) return null;
  return <Burst key={count} />;
}

function Burst() {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const { width } = Dimensions.get("window");

  const colors = useMemo(
    () => [theme.colors.accent, theme.colors.success, theme.colors.warning, theme.signal],
    [theme]
  );

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLES }, (_, i) => ({
        key: i,
        left: Math.random() * width,
        drift: (Math.random() - 0.5) * 140,
        fall: 260 + Math.random() * 260,
        size: 6 + Math.random() * 7,
        spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 540),
        color: colors[i % colors.length],
      })),
    [width, colors]
  );

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.out(Easing.quad),
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, []);

  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {particles.map((p) => (
        <Animated.View
          key={p.key}
          style={{
            position: "absolute",
            top: -20,
            left: p.left,
            width: p.size,
            height: p.size * 1.4,
            borderRadius: 2,
            backgroundColor: p.color,
            opacity: progress.interpolate({
              inputRange: [0, 0.15, 0.75, 1],
              outputRange: [0, 1, 1, 0],
            }),
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, p.fall],
                }),
              },
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, p.drift],
                }),
              },
              {
                rotate: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", `${p.spin}deg`],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}
