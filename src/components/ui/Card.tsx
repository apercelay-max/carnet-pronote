import React from "react";
import { Pressable, View, ViewStyle, StyleProp, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../theme/ThemeProvider";

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevated?: boolean;
};

// Carte "Liquid Glass" : un flou (BlurView, marche aussi sur le web via
// backdrop-filter) + un léger dégradé pour la brillance + une bordure claire
// qui capte la lumière, comme un vrai panneau de verre dépoli.
export function Card({ children, onPress, style, padded = true, elevated = false }: Props) {
  const theme = useTheme();
  const g = theme.glass;

  const content = (
    <View
      style={[
        {
          borderRadius: theme.radius.lg,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: g.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: elevated ? 12 : 5 },
          shadowOpacity: g.shadowOpacity,
          shadowRadius: elevated ? 24 : 14,
          elevation: elevated ? 8 : 3,
        },
        style,
      ]}
    >
      <BlurView intensity={g.intensity} tint={g.tint} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[g.overlayFrom, g.overlayTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ padding: padded ? theme.spacing(4) : 0 }}>{children}</View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      {content}
    </Pressable>
  );
}
