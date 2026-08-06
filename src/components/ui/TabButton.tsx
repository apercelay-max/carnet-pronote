import React, { forwardRef } from "react";
import { Pressable, View, PressableProps } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Icon, IconName } from "./Icon";
import { T } from "./Text";

type Props = PressableProps & {
  isFocused?: boolean;
  icon: IconName;
  label: string;
};

export const TabButton = forwardRef<View, Props>(({ isFocused, icon, label, ...rest }, ref) => {
  const theme = useTheme();

  return (
    <Pressable
      ref={ref as any}
      {...rest}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        gap: 3,
      }}
    >
      <View
        style={{
          width: 40,
          height: 26,
          borderRadius: 13,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isFocused ? theme.colors.accentSoft : "transparent",
        }}
      >
        <Icon name={icon} size={19} color={isFocused ? theme.colors.accent : theme.colors.textTertiary} />
      </View>
      <T
        variant="caption"
        weight={isFocused ? "semibold" : "regular"}
        style={{ color: isFocused ? theme.colors.accent : theme.colors.textTertiary, fontSize: 10.5 }}
      >
        {label}
      </T>
    </Pressable>
  );
});
