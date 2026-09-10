import React, { useMemo } from "react";
import { Linking, Text as RNText } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { T } from "./Text";
import { stripHtml, linkify } from "../../lib/html";

type Props = React.ComponentProps<typeof T> & {
  /** Texte tel que Pronote le renvoie — peut contenir du HTML. */
  children?: string | null;
  /** Rendre les URL cliquables (désactivé dans les aperçus d'une ligne). */
  links?: boolean;
};

/**
 * Affiche une description venue de Pronote.
 *
 * Toujours passer par ce composant plutôt que par `<T>{a.description}</T>` :
 * Pronote renvoie souvent du HTML et `<T>` l'afficherait littéralement
 * (`<div style="font-family: Arial">…`), ce qui rendait les devoirs
 * illisibles. Voir src/lib/html.ts.
 */
export function RichText({ children, links = true, ...rest }: Props) {
  const theme = useTheme();
  const texte = useMemo(() => stripHtml(children ?? ""), [children]);

  if (!texte) return null;
  if (!links || !texte.includes("http")) return <T {...rest}>{texte}</T>;

  const segments = linkify(texte);
  return (
    <T {...rest}>
      {segments.map((seg, i) =>
        seg.url ? (
          <RNText
            key={i}
            style={{ color: theme.colors.accent, textDecorationLine: "underline" }}
            onPress={() => Linking.openURL(seg.url!)}
          >
            {seg.text}
          </RNText>
        ) : (
          <RNText key={i}>{seg.text}</RNText>
        )
      )}
    </T>
  );
}

/** Version courte pour les aperçus sur une ligne (widgets d'accueil). */
export function plainText(input?: string | null): string {
  return stripHtml(input ?? "").replace(/\n+/g, " · ");
}
