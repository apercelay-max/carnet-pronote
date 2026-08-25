import React, { forwardRef } from "react";
import { Pressable, View, PressableProps, GestureResponderEvent } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { Icon, IconName } from "./Icon";
import { T } from "./Text";
import { useRevisionPreferencesStore } from "../../store/useRevisionPreferencesStore";

type Props = PressableProps & {
  isFocused?: boolean;
  icon: IconName;
  label: string;
};

// Même esprit que TabButton.tsx (traitement liquid-glass), mais avec un vrai
// rebond physique (Reanimated withSpring) et un retour haptique au lieu de
// l'approximation CSS de PPL — carnet a ces outils nativement, PPL (web) ne
// les a pas. Comme TabButton, pas de tracé d'icône "plein" séparé : on
// approche la bascule contour→plein de PPL avec un trait plus épais + la
// couleur d'accent.
export const RevisionTabButton = forwardRef<View, Props>(
  ({ isFocused, icon, label, onPress, onPressIn, onPressOut, ...rest }, ref) => {
    const theme = useTheme();
    const animationsEnabled = useRevisionPreferencesStore((s) => s.animationsEnabled);
    const scale = useSharedValue(1);
    const activeColor = theme.colors.accent;
    const inactiveColor = theme.colors.textTertiary;

    const bounceStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePressIn = (e: GestureResponderEvent) => {
      if (animationsEnabled) scale.value = withSpring(0.88, { damping: 14, stiffness: 320 });
      onPressIn?.(e);
    };
    const handlePressOut = (e: GestureResponderEvent) => {
      if (animationsEnabled) scale.value = withSpring(1, { damping: 12, stiffness: 260 });
      onPressOut?.(e);
    };
    const handlePress = (e: GestureResponderEvent) => {
      if (animationsEnabled) Haptics.selectionAsync().catch(() => {});
      onPress?.(e);
    };

    return (
      <Pressable
        ref={ref as any}
        {...rest}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 8,
          gap: 3,
        }}
      >
        <Animated.View style={bounceStyle}>
          <Icon
            name={icon}
            size={19}
            color={isFocused ? activeColor : inactiveColor}
            strokeWidth={isFocused ? 2.2 : 1.7}
          />
        </Animated.View>
        {/* 9px : même taille que le libellé liquid-glass de TabButton.tsx,
            reprise de PPL (tabLabel dans NavBar.tsx). */}
        <T
          variant="caption"
          weight={isFocused ? "semibold" : "regular"}
          numberOfLines={1}
          style={{ color: isFocused ? activeColor : inactiveColor, fontSize: 9, maxWidth: "100%" }}
        >
          {label}
        </T>
      </Pressable>
    );
  }
);
