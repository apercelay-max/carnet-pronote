import React from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../theme/ThemeProvider";
import { T } from "./Text";

type Props = {
  value: number; // 0..1
  size?: number;
  strokeWidth?: number;
  label?: string;
  centerText: string;
  color?: string;
};

export function ProgressRing({ value, size = 108, strokeWidth = 10, label, centerText, color }: Props) {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  const offset = circumference * (1 - clamped);
  const ringColor = color ?? theme.colors.accent;

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.borderSoft}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          fill="none"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        <T variant="title" weight="bold">
          {centerText}
        </T>
        {label ? (
          <T variant="caption" tone="secondary">
            {label}
          </T>
        ) : null}
      </View>
    </View>
  );
}
