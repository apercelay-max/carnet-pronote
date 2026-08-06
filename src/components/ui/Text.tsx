import React from "react";
import { Text as RNText, TextProps, StyleProp, TextStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

type Variant = "hero" | "title" | "subtitle" | "body" | "caption";
type Tone = "primary" | "secondary" | "tertiary" | "accent" | "danger" | "success";

type Props = TextProps & {
  variant?: Variant;
  tone?: Tone;
  weight?: "regular" | "medium" | "semibold" | "bold";
  style?: StyleProp<TextStyle>;
};

const WEIGHT_MAP: Record<string, TextStyle["fontWeight"]> = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
};

export function T({ variant = "body", tone = "primary", weight, style, ...rest }: Props) {
  const theme = useTheme();

  const toneColor =
    tone === "accent"
      ? theme.colors.accent
      : tone === "danger"
      ? theme.colors.danger
      : tone === "success"
      ? theme.colors.success
      : tone === "secondary"
      ? theme.colors.textSecondary
      : tone === "tertiary"
      ? theme.colors.textTertiary
      : theme.colors.textPrimary;

  const defaultWeight =
    weight ?? (variant === "hero" ? "bold" : variant === "title" ? "semibold" : variant === "subtitle" ? "semibold" : "regular");

  return (
    <RNText
      style={[
        {
          color: toneColor,
          fontSize: theme.type[variant],
          fontWeight: WEIGHT_MAP[defaultWeight],
          letterSpacing: variant === "hero" ? -0.5 : 0,
        },
        style,
      ]}
      {...rest}
    />
  );
}
