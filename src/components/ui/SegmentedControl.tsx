import React from "react";
import { View, Pressable } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { T } from "./Text";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.borderSoft,
        padding: 4,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable key={opt.value} style={{ flex: 1 }} onPress={() => onChange(opt.value)}>
            <View
              style={{
                paddingVertical: 8,
                borderRadius: theme.radius.sm,
                alignItems: "center",
                backgroundColor: active ? theme.colors.accentSoft : "transparent",
              }}
            >
              <T variant="caption" weight="semibold" style={{ color: active ? theme.colors.accent : theme.colors.textSecondary }}>
                {opt.label}
              </T>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
