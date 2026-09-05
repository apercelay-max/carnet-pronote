import React from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "./Icon";
import { T } from "./Text";

type Props = {
  slotCount: number;
  fittingSlots: number;
  bottomOffset: number;
  onTidy: () => void;
  onDismiss: () => void;
};

// Bandeau "barre trop chargée" : n'apparaît que quand les onglets épinglés
// ne tiennent réellement plus dans la largeur mesurée de la capsule (voir le
// calcul fittingSlots/crowded dans _layout.tsx). Même principe que PPL
// (banner/bannerPrimary/bannerGhost dans NavBar.tsx), en opaque comme le
// tiroir (voir TabOverflowDrawer.tsx) — pas de flou hors de la capsule.
export function TabBarCrowdedBanner({ slotCount, fittingSlots, bottomOffset, onTidy, onDismiss }: Props) {
  const theme = useTheme();
  const c = theme.colors;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: bottomOffset,
        alignItems: "center",
        paddingHorizontal: 14,
        zIndex: 3,
      }}
    >
      <Animated.View
        entering={FadeInDown.duration(220)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          width: "100%",
          maxWidth: 460,
          paddingVertical: 10,
          paddingLeft: 14,
          paddingRight: 10,
          borderRadius: theme.radius.lg,
          backgroundColor: c.surfaceElevated,
          borderWidth: 1,
          borderColor: c.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: theme.isDark ? 0.35 : 0.14,
          shadowRadius: 26,
          elevation: 10,
        }}
      >
        <T variant="caption" tone="secondary" style={{ flex: 1, lineHeight: 15 }}>
          La barre est trop chargée pour ton écran ({slotCount} onglets pour {fittingSlots} places).
        </T>
        <Pressable
          onPress={onTidy}
          style={{
            paddingVertical: 7,
            paddingHorizontal: 12,
            borderRadius: 12,
            backgroundColor: theme.colors.accentGlass,
            borderWidth: 1,
            borderColor: theme.colors.accent,
          }}
        >
          <T variant="caption" tone="accent" weight="bold">
            Ranger dans le +
          </T>
        </Pressable>
        <Pressable
          onPress={onDismiss}
          accessibilityLabel="Ignorer"
          hitSlop={6}
          style={{
            width: 28,
            height: 28,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: c.borderSoft,
          }}
        >
          <Icon name="close" size={13} color={c.textTertiary} />
        </Pressable>
      </Animated.View>
    </View>
  );
}
