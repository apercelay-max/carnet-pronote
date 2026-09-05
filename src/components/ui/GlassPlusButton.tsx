import React, { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "./Icon";
import { T } from "./Text";

type Props = {
  open: boolean;
  // Un onglet rangé dans le tiroir est actuellement ouvert.
  active: boolean;
  onPress: () => void;
};

// Bouton "+" de la barre liquid-glass : ouvre/ferme le tiroir des onglets
// rangés (TabOverflowDrawer). Contrairement aux onglets épinglés, ce n'est
// PAS un TabTrigger — il ne navigue nulle part, il bascule juste l'état
// d'ouverture du tiroir, comme sur PPL (bouton "Plus", NavBar.tsx) où l'icône
// pivote de 45° à l'ouverture.
export function GlassPlusButton({ open, active, onPress }: Props) {
  const theme = useTheme();
  const highlighted = open || active;
  const color = highlighted ? theme.colors.accent : theme.colors.textTertiary;
  const rotate = useSharedValue(0);

  useEffect(() => {
    rotate.value = withTiming(open ? 1 : 0, { duration: 200 });
  }, [open, rotate]);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value * 45}deg` }],
  }));

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel="Plus d'options"
      accessibilityState={{ expanded: open }}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 5 }}
    >
      <View style={{ alignItems: "center", gap: 2 }}>
        <Animated.View style={rotateStyle}>
          <Icon name="plus" size={22} color={color} strokeWidth={highlighted ? 2.2 : 1.7} />
        </Animated.View>
        <T
          variant="caption"
          weight={highlighted ? "semibold" : "medium"}
          numberOfLines={1}
          style={{ color, fontSize: 9 }}
        >
          Plus
        </T>
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            marginTop: 1,
            backgroundColor: active ? theme.colors.accent : "transparent",
          }}
        />
      </View>
    </Pressable>
  );
}
