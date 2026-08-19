import React, { forwardRef } from "react";
import { Pressable, View, PressableProps, ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Icon, IconName } from "./Icon";
import { T } from "./Text";

type Props = PressableProps & {
  isFocused?: boolean;
  icon: IconName;
  label: string;
};

// L'indicateur d'onglet actif change de forme selon le style choisi (pastille
// pour Aurora, point lumineux pour Cockpit, bloc plein pour Editorial, trait
// façon règle pour Carnet) mais garde toujours la couleur d'accent choisie
// par la personne — le style change la forme, pas la personnalisation.
export const TabButton = forwardRef<View, Props>(({ isFocused, icon, label, ...rest }, ref) => {
  const theme = useTheme();
  const treatment = theme.structure.tabBar.treatment;
  const activeColor = theme.colors.accent;
  const inactiveColor = theme.colors.textTertiary;

  let iconBoxStyle: ViewStyle = {
    width: 42,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  };
  let iconColor = isFocused ? activeColor : inactiveColor;
  let topMark: React.ReactNode = null;
  let bottomMark: React.ReactNode = null;
  let textColor = isFocused ? activeColor : inactiveColor;
  // Sur PPL, l'icône passe de contour à "pleine" (SF Symbols) quand l'onglet
  // est actif. On n'a pas de tracé rempli séparé pour chaque icône ici, donc
  // on approche cette bascule avec un trait plus épais + la couleur d'accent
  // — même esprit, sans dupliquer tout le set d'icônes.
  let iconStrokeWidth = 1.8;

  if (treatment === "liquid-glass") {
    iconBoxStyle.backgroundColor = "transparent";
    iconStrokeWidth = isFocused ? 2.2 : 1.7;
  } else if (treatment === "floating-pill") {
    iconBoxStyle.backgroundColor = isFocused ? theme.colors.accentGlass : "transparent";
  } else if (treatment === "bordered-panel") {
    iconBoxStyle.backgroundColor = "transparent";
    if (isFocused) {
      topMark = (
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: activeColor,
            shadowColor: activeColor,
            shadowOpacity: 0.9,
            shadowRadius: 5,
            shadowOffset: { width: 0, height: 0 },
            marginBottom: 3,
          }}
        />
      );
    }
  } else if (treatment === "solid-block") {
    iconBoxStyle = {
      width: 30,
      height: 30,
      borderRadius: 4,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isFocused ? theme.colors.accent : "transparent",
    };
    iconColor = isFocused ? theme.colors.surface : inactiveColor;
  } else if (treatment === "tabbed-ruler") {
    iconBoxStyle.backgroundColor = "transparent";
    if (isFocused) {
      bottomMark = (
        <View
          style={{ width: 22, height: 2, borderRadius: 1, backgroundColor: activeColor, marginTop: 3 }}
        />
      );
    }
  }

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
      {topMark}
      <View style={iconBoxStyle}>
        <Icon name={icon} size={19} color={iconColor} strokeWidth={iconStrokeWidth} />
      </View>
      {bottomMark}
      {/* Une seule ligne : avec 6 onglets, un libellé long comme « Emploi du
          temps » passait sur deux lignes et décalait toute la barre. */}
      <T
        variant="caption"
        weight={isFocused ? "semibold" : "regular"}
        numberOfLines={1}
        style={{
          color: textColor,
          // PPL affiche son libellé en 9px sous chaque icône (voir
          // tabLabel dans NavBar.tsx) : on reprend la même taille pour ce
          // traitement précis, un peu plus petite que les autres barres.
          fontSize: treatment === "liquid-glass" ? 9 : 10.5,
          maxWidth: "100%",
        }}
      >
        {label}
      </T>
    </Pressable>
  );
});
