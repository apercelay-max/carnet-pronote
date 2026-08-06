import React, { useState } from "react";
import { TextInput, View, Pressable, TextInputProps } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { T } from "./Text";
import { Icon, IconName } from "./Icon";

type Props = TextInputProps & {
  label: string;
  icon?: IconName;
  isPassword?: boolean;
  error?: string;
};

export function TextField({ label, icon, isPassword, error, ...rest }: Props) {
  const theme = useTheme();
  const [hidden, setHidden] = useState(!!isPassword);
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <T variant="caption" tone="secondary" weight="medium">
        {label}
      </T>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          borderWidth: 1.5,
          borderColor: error ? theme.colors.danger : focused ? theme.colors.accent : theme.colors.border,
          paddingHorizontal: theme.spacing(3),
        }}
      >
        {icon ? (
          <View style={{ marginRight: 8 }}>
            <Icon name={icon} size={18} color={theme.colors.textTertiary} />
          </View>
        ) : null}
        <TextInput
          {...rest}
          secureTextEntry={hidden}
          placeholderTextColor={theme.colors.textTertiary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            paddingVertical: theme.spacing(3.5),
            color: theme.colors.textPrimary,
            fontSize: theme.type.body,
          }}
        />
        {isPassword ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Icon name={hidden ? "eye" : "eyeOff"} size={18} color={theme.colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <T variant="caption" tone="danger">
          {error}
        </T>
      ) : null}
    </View>
  );
}
