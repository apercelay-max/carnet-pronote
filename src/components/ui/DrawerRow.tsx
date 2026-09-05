import React, { forwardRef } from "react";
import { Pressable, View, PressableProps, GestureResponderEvent } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Icon, IconName } from "./Icon";
import { T } from "./Text";

type Props = PressableProps & {
  isFocused?: boolean;
  icon: IconName;
  label: string;
  hint: string;
  // Ferme le tiroir après avoir navigué — appelé en plus de l'onPress fourni
  // par le TabTrigger englobant (voir TabOverflowDrawer.tsx).
  onCloseAfterPress?: () => void;
};

// Une ligne du tiroir "+" : icône dans une pastille, libellé, description
// courte (TAB_HINTS), coche sur l'onglet actif — même disposition que le
// menu "Plus" de PPL (drawerRow/drawerIconWrap/drawerLabel/drawerHint dans
// NavBar.tsx), en liste plutôt qu'en grille d'icônes pour laisser la place à
// la description. L'entrée en cascade (staggerée) est gérée par l'appelant
// (TabOverflowDrawer.tsx) via un <Animated.View entering={...}> qui enveloppe
// le <TabTrigger> — pas ici, pour que le clonage de props du TabTrigger
// (asChild) tombe bien sur le <Pressable>, pas sur un wrapper d'animation.
export const DrawerRow = forwardRef<View, Props>(
  ({ isFocused, icon, label, hint, onPress, onCloseAfterPress, ...rest }, ref) => {
    const theme = useTheme();
    const c = theme.colors;
    const active = !!isFocused;

    const handlePress = (e: GestureResponderEvent) => {
      onPress?.(e);
      onCloseAfterPress?.();
    };

    return (
      <Pressable
        ref={ref as any}
        {...rest}
        onPress={handlePress}
        accessibilityRole="menuitem"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 9,
          paddingHorizontal: 10,
          borderRadius: 16,
          backgroundColor: active ? theme.colors.accentGlass : "transparent",
        }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: active ? theme.colors.accentGlass : c.surface,
          }}
        >
          <Icon
            name={icon}
            size={19}
            color={active ? theme.colors.accent : c.textSecondary}
            strokeWidth={active ? 2.1 : 1.7}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <T
            variant="body"
            weight="semibold"
            numberOfLines={1}
            style={{ color: active ? theme.colors.accent : c.textPrimary }}
          >
            {label}
          </T>
          <T variant="caption" tone="tertiary" numberOfLines={1}>
            {hint}
          </T>
        </View>
        {active && <Icon name="check" size={16} color={theme.colors.accent} />}
      </Pressable>
    );
  }
);
