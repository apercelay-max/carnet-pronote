// Petits morceaux d'interface partagés par les écrans des Groupes de classe
// (app/groupes/*) et leurs onglets. Rangés ici et PAS sous app/ : tout
// fichier placé dans app/ devient une route pour expo-router.
import React, { useMemo } from "react";
import { View, Pressable, ScrollView, TextInput, Platform, Share, RefreshControl } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { MAX_CONTENT_WIDTH } from "../ui/Screen";
import { hexToRgba } from "../../theme/palette";
import { T } from "../ui/Text";
import { Icon, type IconName } from "../ui/Icon";
import { Eyebrow } from "../ui/Stats";
import { champStyle } from "../ui/champStyle";
import { formatShortDay } from "../../lib/format";
import { formaterCode, jourISO, lienInvitation, type Membre } from "../../lib/groupes";

export { confirmer } from "../../lib/confirmer";

/**
 * Partage l'invitation d'un groupe. Feuille de partage native si elle existe
 * (iOS, Android, Safari iOS) ; sinon copie du lien, parce qu'un navigateur de
 * bureau n'a souvent pas `navigator.share` et qu'un bouton qui ne fait rien
 * serait pire que pas de bouton.
 * Renvoie un message à afficher, ou null si la feuille de partage s'est ouverte.
 */
export async function partagerInvitation(nom: string, code: string): Promise<string | null> {
  const lien = lienInvitation(code);
  const message = `Rejoins « ${nom} » sur Carnet avec le code ${formaterCode(code)} : ${lien}`;
  const nav: any = typeof navigator !== "undefined" ? navigator : null;
  if (Platform.OS === "web" && !nav?.share) {
    try {
      await nav?.clipboard?.writeText(message);
      return "Invitation copiée : colle-la dans la conversation de ta classe.";
    } catch {
      return `Code à donner : ${formaterCode(code)}`;
    }
  }
  try {
    await Share.share({ message });
    return null;
  } catch {
    return `Code à donner : ${formaterCode(code)}`;
  }
}

export function pseudoDe(membres: Membre[], userId: string | null): string {
  if (!userId) return "Ancien membre";
  return membres.find((m) => m.userId === userId)?.pseudo ?? "Ancien membre";
}

export function Bandeau({ ton, texte }: { ton: "danger" | "ok"; texte: string }) {
  const theme = useTheme();
  const couleur = ton === "danger" ? theme.colors.danger : theme.colors.success;
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
      <Icon name={ton === "danger" ? "warning" : "checkCircle"} size={15} color={couleur} />
      <T variant="caption" style={{ flex: 1, color: couleur, lineHeight: 18 }}>
        {texte}
      </T>
    </View>
  );
}

/** Bouton discret teinté, le même que « Créer / Ouvrir » de l'écran Extensions. */
export function BoutonTeinte({
  label,
  icon,
  onPress,
  color,
  disabled,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const c = color ?? theme.colors.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: hexToRgba(c, 0.25),
        backgroundColor: hexToRgba(c, theme.isDark ? 0.1 : 0.07),
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
      })}
    >
      {icon ? <Icon name={icon} size={15} color={c} /> : null}
      <T variant="caption" weight="semibold" style={{ color: c }}>
        {label}
      </T>
    </Pressable>
  );
}

/** Champ texte simple avec son intitulé, dans le style des écrans perso. */
export function Champ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  maxLength,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Eyebrow>{label}</Eyebrow>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        multiline={multiline}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        textAlignVertical={multiline ? "top" : undefined}
        style={[champStyle(theme), multiline ? { minHeight: 70, lineHeight: 21 } : null]}
      />
    </View>
  );
}

/**
 * Choix d'un jour : une rangée de puces pour les prochains jours (le cas
 * courant, un seul geste) et un champ AAAA-MM-JJ pour tout le reste. Pas de
 * sélecteur de date natif : il n'existe pas en commun web + natif sans
 * dépendance en plus, et les écrans perso font déjà comme ça.
 */
export function ChoixJour({
  label,
  value,
  onChange,
  nbJours = 30,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  nbJours?: number;
}) {
  const theme = useTheme();
  const jours = useMemo(() => {
    const base = new Date();
    base.setHours(12, 0, 0, 0);
    return Array.from({ length: nbJours }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, [nbJours]);

  return (
    <View style={{ gap: 6 }}>
      <Eyebrow>{label}</Eyebrow>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingVertical: 2, paddingRight: 8 }}
      >
        {jours.map((d) => {
          const iso = jourISO(d);
          const on = value === iso;
          return (
            <Pressable
              key={iso}
              onPress={() => onChange(iso)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: on ? theme.colors.accent : theme.colors.border,
                backgroundColor: on ? theme.colors.accentSoft : "transparent",
              }}
            >
              <T
                variant="caption"
                weight={on ? "semibold" : "regular"}
                style={{ color: on ? theme.colors.accent : theme.colors.textSecondary, textTransform: "capitalize" }}
              >
                {formatShortDay(d)}
              </T>
            </Pressable>
          );
        })}
      </ScrollView>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="AAAA-MM-JJ"
        placeholderTextColor={theme.colors.textTertiary}
        style={champStyle(theme)}
      />
    </View>
  );
}

export const ISO_JOUR = /^\d{4}-\d{2}-\d{2}$/;

/** "AAAA-MM-JJ" -> Date locale à midi, comme dateFromISODay de lib/persoItems. */
export function dateDepuisISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

/**
 * Colonne défilante des onglets Événements / Devoirs / Révision. L'écran du
 * groupe garde un en-tête FIXE (nom, onglets) : on ne peut donc pas utiliser
 * <Screen>, qui fait défiler tout l'écran d'un bloc.
 */
export function Colonne({
  children,
  onRefresh,
  refreshing,
}: {
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const theme = useTheme();
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        padding: theme.spacing(4),
        paddingBottom: theme.spacing(16),
        alignItems: "center",
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        ) : undefined
      }
    >
      <View style={{ width: "100%", maxWidth: MAX_CONTENT_WIDTH, gap: theme.spacing(3) }}>{children}</View>
    </ScrollView>
  );
}

/** Carte vide : ce qu'on dit quand un onglet n'a encore rien. */
export function Vide({ texte }: { texte: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        padding: theme.spacing(4),
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: theme.colors.border,
      }}
    >
      <T variant="caption" tone="secondary" style={{ lineHeight: 19, textAlign: "center" }}>
        {texte}
      </T>
    </View>
  );
}
