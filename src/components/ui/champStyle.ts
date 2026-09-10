import type { useTheme } from "../../theme/ThemeProvider";

// Style commun des champs de saisie (repris de fiche-nouvelle.tsx). Extrait
// ici pour être partagé par les écrans d'ajout d'éléments perso.
export function champStyle(theme: ReturnType<typeof useTheme>) {
  return {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(3),
    color: theme.colors.textPrimary,
    fontSize: theme.type.body,
  } as const;
}
