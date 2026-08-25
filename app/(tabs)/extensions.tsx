import React, { useMemo } from "react";
import { View, Pressable, Switch } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Screen } from "../../src/components/ui/Screen";
import { T } from "../../src/components/ui/Text";
import { Card } from "../../src/components/ui/Card";
import { Icon } from "../../src/components/ui/Icon";
import { Eyebrow, StatTile, StatRow } from "../../src/components/ui/Stats";
import { hexToRgba } from "../../src/theme/palette";
import { EXTENSIONS, useFichesStore, type ExtensionId } from "../../src/store/useFichesStore";

export default function ExtensionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const actives = useFichesStore((s) => s.actives);
  const fiches = useFichesStore((s) => s.fiches);
  const toggleExtension = useFichesStore((s) => s.toggleExtension);

  const parMode = useMemo(() => {
    const c: Record<string, number> = { fiche: 0, resume: 0, points: 0 };
    fiches.forEach((f) => (c[f.mode] = (c[f.mode] ?? 0) + 1));
    return c;
  }, [fiches]);

  const ouvrir = (id: ExtensionId) => {
    if (id === "simulateur") router.push("/simulateur");
    else if (id === "flashcards") router.push("/revision/flashcards");
    else if (id === "controles") router.push("/revision/controles");
    else router.push(`/fiche-nouvelle?mode=${id}`);
  };

  // Seules les 3 extensions de fiches créent quelque chose ; les autres
  // ouvrent simplement un écran.
  const estCreation = (id: ExtensionId) => id === "fiche" || id === "resume" || id === "points";

  return (
    <Screen>
      <View style={{ marginBottom: theme.spacing(5) }}>
        <Eyebrow color={theme.colors.accent}>Modules</Eyebrow>
        <T variant="hero" style={{ marginTop: 2 }}>
          Extensions
        </T>
        <T variant="caption" tone="tertiary" style={{ marginTop: 6 }}>
          Des outils en plus, que tu actives ou désactives comme tu veux.
        </T>
      </View>

      {fiches.length > 0 && (
        <View style={{ marginBottom: theme.spacing(5) }}>
          <StatRow>
            <StatTile label="Fiches" value={String(parMode.fiche ?? 0)} />
            <StatTile label="Résumés" value={String(parMode.resume ?? 0)} />
            <StatTile label="Points clés" value={String(parMode.points ?? 0)} />
          </StatRow>
        </View>
      )}

      {/* Porte d'entrée vers l'espace révision dédié (barre du bas, fiches,
          flashcards, contrôles, réglages propres à la section) — les
          interrupteurs ci-dessous restent le réglage fin, ce CTA est le
          chemin principal. */}
      <Pressable
        onPress={() => router.push("/revision")}
        style={{ marginBottom: theme.spacing(6) }}
      >
        <Card padded tint={theme.colors.accent}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: hexToRgba(theme.colors.accent, theme.isDark ? 0.14 : 0.1),
              }}
            >
              <Icon name="school" size={19} color={theme.colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <T variant="body" weight="semibold">
                Ouvrir l'espace révision
              </T>
              <T variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
                Fiches, flashcards et contrôles, dans leur propre interface
              </T>
            </View>
            <Icon name="chevronRight" size={16} color={theme.colors.textTertiary} />
          </View>
        </Card>
      </Pressable>

      <View style={{ marginBottom: theme.spacing(3) }}>
        <Eyebrow>Disponibles</Eyebrow>
      </View>

      <View style={{ gap: theme.spacing(3), marginBottom: theme.spacing(6) }}>
        {EXTENSIONS.map((ext) => {
          const on = actives[ext.id] !== false;
          return (
            <Card key={ext.id} padded>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: hexToRgba(theme.colors.accent, theme.isDark ? 0.14 : 0.1),
                  }}
                >
                  <Icon name={ext.icone} size={19} color={theme.colors.accent} />
                </View>

                <Pressable
                  style={{ flex: 1 }}
                  disabled={!on}
                  onPress={() => ouvrir(ext.id)}
                >
                  <T variant="body" weight="semibold" style={{ opacity: on ? 1 : 0.45 }}>
                    {ext.titre}
                  </T>
                  <T variant="caption" tone="tertiary" style={{ marginTop: 2, opacity: on ? 1 : 0.45 }}>
                    {ext.sousTitre}
                  </T>
                </Pressable>

                <Switch
                  value={on}
                  onValueChange={() => toggleExtension(ext.id)}
                  trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {on && (
                <Pressable
                  onPress={() => ouvrir(ext.id)}
                  style={{
                    marginTop: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    paddingVertical: 9,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: hexToRgba(theme.colors.accent, 0.25),
                    backgroundColor: hexToRgba(theme.colors.accent, theme.isDark ? 0.1 : 0.07),
                  }}
                >
                  <Icon
                    name={estCreation(ext.id) ? "plus" : "chevronRight"}
                    size={15}
                    color={theme.colors.accent}
                  />
                  <T variant="caption" weight="semibold" style={{ color: theme.colors.accent }}>
                    {estCreation(ext.id) ? "Créer" : "Ouvrir"}
                  </T>
                </Pressable>
              )}
            </Card>
          );
        })}
      </View>

    </Screen>
  );
}
