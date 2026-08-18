// Briques de présentation des chiffres, reprises de PPL Tracker : étiquette en
// petites majuscules espacées, chiffre géant serré, puces teintées, tuiles de
// stats, barres fines et mini-courbe.
//
// Volontairement indépendantes du style choisi : elles lisent les couleurs du
// thème, donc elles s'habillent en Forge comme en Carnet. Ce sont les FORMES
// de présentation qui changent par rapport à avant, pas la palette.
import React from "react";
import { View, ViewStyle, StyleProp } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { useTheme } from "../../theme/ThemeProvider";
import { hexToRgba } from "../../theme/palette";
import { T } from "./Text";

/** Étiquette de section : MAJUSCULES, 1.5 d'interlettrage, dans la couleur donnée. */
export function Eyebrow({ children, color }: { children: string; color?: string }) {
  const theme = useTheme();
  return (
    <T
      style={{
        color: color ?? theme.colors.textTertiary,
        fontSize: 9.5 * theme.fontScale,
        fontWeight: "800",
        letterSpacing: 1.5,
        textTransform: "uppercase",
      }}
    >
      {children}
    </T>
  );
}

/** Puce teintée (fond 8% / bordure 20% de la couleur), façon badge PPL. */
export function Chip({
  label,
  color,
  style,
}: {
  label: string;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: hexToRgba(color, 0.1),
          borderWidth: 1,
          borderColor: hexToRgba(color, 0.22),
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 2,
          alignSelf: "flex-start",
        },
        style,
      ]}
    >
      <T style={{ color, fontSize: 10.5 * theme.fontScale, fontWeight: "700" }}>{label}</T>
    </View>
  );
}

/**
 * Chiffre géant + unité, avec une puce d'écart facultative.
 * `delta` est une différence déjà calculée (ex. +0.4) : on ne l'invente jamais,
 * l'écran ne la passe que s'il a réellement une valeur de comparaison.
 */
export function BigStat({
  value,
  unit,
  delta,
  deltaLabel,
}: {
  value: string;
  unit?: string;
  delta?: number | null;
  deltaLabel?: string;
}) {
  const theme = useTheme();
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const up = hasDelta && (delta as number) > 0;
  const flat = hasDelta && Math.abs(delta as number) < 0.05;
  const deltaColor = flat ? theme.colors.textTertiary : up ? theme.colors.success : theme.colors.danger;

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
        <T
          style={{
            fontSize: 46 * theme.fontScale,
            lineHeight: 50 * theme.fontScale,
            fontWeight: "800",
            letterSpacing: -1.5,
            color: theme.colors.textPrimary,
          }}
        >
          {value}
        </T>
        {unit ? (
          <T
            style={{
              fontSize: 16 * theme.fontScale,
              fontWeight: "700",
              marginLeft: 4,
              color: theme.colors.textTertiary,
            }}
          >
            {unit}
          </T>
        ) : null}
      </View>
      {hasDelta ? (
        <Chip
          color={deltaColor}
          label={`${flat ? "=" : up ? "+" : ""}${flat ? "" : (delta as number).toFixed(2).replace(".", ",").replace(/,?0+$/, "")} ${
            deltaLabel ?? ""
          }`.trim()}
        />
      ) : null}
    </View>
  );
}

/** Tuile de stat teintée : petite étiquette au-dessus, valeur grasse en dessous. */
export function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  const theme = useTheme();
  const tint = color ?? theme.colors.accent;
  return (
    <View
      style={{
        flex: 1,
        minWidth: 72,
        backgroundColor: hasTint(tint, theme.isDark),
        borderWidth: 1,
        borderColor: hexToRgba(tint, 0.18),
        borderRadius: 10,
        paddingVertical: 9,
        paddingHorizontal: 10,
        gap: 3,
      }}
    >
      <Eyebrow color={theme.colors.textTertiary}>{label}</Eyebrow>
      <T
        style={{
          fontSize: 17 * theme.fontScale,
          fontWeight: "800",
          letterSpacing: -0.4,
          color: theme.colors.textPrimary,
        }}
        numberOfLines={1}
      >
        {value}
      </T>
    </View>
  );
}

function hasTint(color: string, isDark: boolean) {
  return hexToRgba(color, isDark ? 0.1 : 0.07);
}

/** Rangée de tuiles, qui passe à la ligne si la largeur ne suffit pas. */
export function StatRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;
}

/** Barre fine de progression (0 → 1). */
export function Bar({ value, color, height = 5 }: { value: number; color: string; height?: number }) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: theme.colors.borderSoft,
        overflow: "hidden",
      }}
    >
      <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

/**
 * Barre segmentée (le cycle de 8 semaines de PPL) : segments passés pleins,
 * segment courant blanc et plus épais, segments à venir en gris.
 */
export function SegmentBar({ total, current, color }: { total: number; current: number; color: string }) {
  const theme = useTheme();
  if (total <= 0) return null;
  return (
    <View style={{ flexDirection: "row", gap: 3, alignItems: "flex-end" }}>
      {Array.from({ length: total }).map((_, i) => {
        const n = i + 1;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: n === current ? 6 : 4,
              borderRadius: 3,
              backgroundColor:
                n < current ? color : n === current ? theme.colors.textPrimary : theme.colors.border,
            }}
          />
        );
      })}
    </View>
  );
}

/**
 * Mini-courbe d'évolution. Rend `null` en dessous de 2 points : une courbe à
 * un seul point ne veut rien dire, mieux vaut ne rien afficher qu'un trait plat
 * qui laisserait croire à une stagnation.
 */
export function Sparkline({
  values,
  color,
  width = 64,
  height = 22,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length < 2) return null;

  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min || 1;
  const pad = 2;

  const points = clean
    .map((v, i) => {
      const x = pad + (i / (clean.length - 1)) * (width - pad * 2);
      const y = height - pad - ((v - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Petite barre verticale de couleur devant une ligne (matière, fiche…).
 *
 * Rend `null` quand le style choisi est « Métro » : ce style dessine déjà un
 * gros bandeau de couleur sur le bord gauche de la carte, et garder les deux
 * donnait deux barres côte à côte. Chaque écran passe simplement `tint` à sa
 * <Card> pour que le bandeau prenne la couleur de la matière.
 */
export function BarreMatiere({ color, minHeight = 34 }: { color: string; minHeight?: number }) {
  const theme = useTheme();
  if (theme.structure.card.treatment === "line-badge") return null;
  return <View style={{ width: 4, alignSelf: "stretch", minHeight, borderRadius: 2, backgroundColor: color }} />;
}
