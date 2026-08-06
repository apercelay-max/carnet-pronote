import React from "react";
import { Pressable, ActivityIndicator, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
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

  const bg =
    variant === "primary" ? theme.colors.accent : variant === "secondary" ? theme.colors.surfaceElevated : "transparent";
  const textColor = variant === "primary" ? "#0B0D12" : theme.colors.textPrimary;
  const borderColor = variant === "secondary" ? theme.colors.border : "transparent";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
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
