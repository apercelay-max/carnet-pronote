import React from "react";
import { Pressable, ActivityIndicator, ViewStyle, StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../theme/ThemeProvider";
import { FORGE_GRADIENT } from "../../theme/styles";
import { T } from "./Text";
import { Icon, IconName } from "./Icon";

type Variant = "primary" | "secondary" | "ghost";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = "primary", disabled, loading, icon, style }: Props) {
  const theme = useTheme();

  // Forge reprend le dégradé de marque de PPL sur le bouton principal. Les
  // autres styles gardent l'accent plein choisi par la personne : un dégradé
  // rouge/violet imposé jurerait avec Métro, Pop ou Ardoise.
  const useGradient = variant === "primary" && theme.styleId === "forge";

  const bg =
    variant === "primary" ? theme.colors.accent : variant === "secondary" ? theme.colors.surfaceElevated : "transparent";
  // Texte blanc sur le dégradé : le gris très sombre habituel devient
  // illisible sur du rouge saturé.
  const textColor = useGradient ? "#FFFFFF" : variant === "primary" ? "#0B0D12" : theme.colors.textPrimary;
  const borderColor = variant === "secondary" ? theme.colors.border : "transparent";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: useGradient ? "transparent" : bg,
          overflow: "hidden",
          borderRadius: theme.radius.md,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor,
          paddingVertical: theme.spacing(3.5),
          paddingHorizontal: theme.spacing(5),
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {useGradient ? (
        <LinearGradient
          colors={FORGE_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={textColor} /> : null}
          <T variant="body" weight="semibold" style={{ color: textColor }}>
            {label}
          </T>
        </>
      )}
    </Pressable>
  );
}
