import React, { forwardRef } from "react";
import { Pressable, View, PressableProps, GestureResponderEvent } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { Icon, IconName } from "./Icon";
import { T } from "./Text";

type Props = PressableProps & {
  isFocused?: boolean;
  icon: IconName;
  label: string;
};

// Bouton d'onglet épinglé du traitement liquid-glass. Même rendu que
// l'ancienne branche "liquid-glass" de TabButton.tsx (icône qui passe de
// contour à "pleine" + libellé 9px), avec en plus le rebond au clic de PPL
// (NavBar.tsx : la capsule scale 0.98 -> 1 au clic) — ici reproduit avec
// Reanimated (déjà la convention du projet pour ce genre d'animation, voir
// RevisionTabButton.tsx) plutôt que l'approximation CSS de PPL (transition
// + state React), et complété par le retour haptique déjà utilisé là-bas.
export const GlassTabButton = forwardRef<View, Props>(
  ({ isFocused, icon, label, onPress, onPressIn, onPressOut, ...rest }, ref) => {
    const theme = useTheme();
    const scale = useSharedValue(1);
    const activeColor = theme.colors.accent;
    const inactiveColor = theme.colors.textTertiary;

    const bounceStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePressIn = (e: GestureResponderEvent) => {
      scale.value = withSpring(0.93, { damping: 16, stiffness: 340 });
      onPressIn?.(e);
    };
    const handlePressOut = (e: GestureResponderEvent) => {
      scale.value = withSpring(1, { damping: 13, stiffness: 260 });
      onPressOut?.(e);
    };
    const handlePress = (e: GestureResponderEvent) => {
      Haptics.selectionAsync().catch(() => {});
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
          paddingVertical: 5,
        }}
      >
        <Animated.View style={[{ alignItems: "center", gap: 2 }, bounceStyle]}>
          <Icon
            name={icon}
            size={22}
            color={isFocused ? activeColor : inactiveColor}
            strokeWidth={isFocused ? 2.2 : 1.7}
          />
          {/* 9px : taille reprise de PPL (tabLabel dans NavBar.tsx). */}
          <T
            variant="caption"
            weight={isFocused ? "semibold" : "medium"}
            numberOfLines={1}
            style={{ color: isFocused ? activeColor : inactiveColor, fontSize: 9, maxWidth: "100%" }}
          >
            {label}
          </T>
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              marginTop: 1,
              backgroundColor: isFocused ? activeColor : "transparent",
            }}
          />
        </Animated.View>
      </Pressable>
    );
  }
);
