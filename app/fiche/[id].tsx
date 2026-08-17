import React, { useState } from "react";
import { View, Pressable, TextInput } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../src/theme/ThemeProvider";
import { usePreferencesStore } from "../../src/store/usePreferencesStore";
import { Screen } from "../../src/components/ui/Screen";
import { T } from "../../src/components/ui/Text";
import { Card } from "../../src/components/ui/Card";
import { Icon } from "../../src/components/ui/Icon";
import { Eyebrow, Chip } from "../../src/components/ui/Stats";
import { colorForSubject, hexToRgba } from "../../src/theme/palette";
import { useFichesStore } from "../../src/store/useFichesStore";

export default function FicheScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const fiche = useFichesStore((s) => s.fiches.find((f) => f.id === id));
  const setNotesPerso = useFichesStore((s) => s.setNotesPerso);
  const supprimer = useFichesStore((s) => s.supprimer);
  const subjectColors = usePreferencesStore((s) => s.subjectColors);

  const [confirmSuppr, setConfirmSuppr] = useState(false);

  if (!fiche) {
    return (
      <Screen>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing(5) }}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: theme.spacing(3) }}>
            <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
          </Pressable>
          <T variant="hero">Fiche</T>
        </View>
        <Card>
          <T variant="body" tone="secondary">
            Cette fiche n'existe plus.
          </T>
        </Card>
      </Screen>
    );
  }

  const color = colorForSubject(fiche.matiere, subjectColors);
  const g = fiche.genere;

  // Chaque mode ne montre que ce qui le concerne — c'est la différence entre
  // les trois extensions, qui partagent pourtant le même moteur.
  const montrerResume = fiche.mode === "fiche" || fiche.mode === "resume";
  const montrerPoints = fiche.mode === "fiche" || fiche.mode === "points";

  // En mode « fiche » les deux sections coexistent : le moteur les calcule
  // indépendamment, donc les mêmes phrases ressortent souvent des deux côtés.
  // On enlève les doublons côté affichage plutôt que dans le moteur, pour que
  // les modes « résumé » et « points » seuls restent complets.
  const resumeNormalise = new Set(g.resume.map((p) => p.slice(0, 60)));
  const points = montrerResume ? g.points.filter((p) => !resumeNormalise.has(p.slice(0, 60))) : g.points;
  const montrerDefs = fiche.mode === "fiche" && g.definitions.length > 0;
  const montrerMots = fiche.mode === "fiche" && g.motsCles.length > 0;

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: theme.spacing(4) }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: theme.spacing(3), marginTop: 6 }}>
          <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Eyebrow color={color}>{fiche.matiere}</Eyebrow>
          <T variant="hero" style={{ marginTop: 2 }}>
            {fiche.titre}
          </T>
        </View>
      </View>

      {g.phrasesTrouvees < 4 && (
        <Card style={{ marginBottom: theme.spacing(4) }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Icon name="warning" size={18} color={theme.colors.warning} />
            <T variant="caption" tone="secondary" style={{ flex: 1, lineHeight: 18 }}>
              Le texte de départ était court ({g.phrasesTrouvees} phrase
              {g.phrasesTrouvees > 1 ? "s" : ""} exploitable{g.phrasesTrouvees > 1 ? "s" : ""}), donc
              cette fiche reste maigre. Ajoute du cours et régénère pour un meilleur résultat.
            </T>
          </View>
        </Card>
      )}

      {montrerResume && (
        <Section titre="Résumé" color={color}>
          {g.resume.length === 0 ? (
            <T variant="body" tone="secondary">
              Rien à résumer dans ce texte.
            </T>
          ) : (
            <View style={{ gap: 10 }}>
              {g.resume.map((p, i) => (
                <T key={i} variant="body" style={{ lineHeight: 22 }}>
                  {p}
                </T>
              ))}
            </View>
          )}
        </Section>
      )}

      {montrerPoints && (
        <Section titre="À retenir" color={color}>
          {points.length === 0 ? (
            <T variant="body" tone="secondary">
              {montrerResume ? "Rien de plus que le résumé ci-dessus." : "Aucun point saillant repéré."}
            </T>
          ) : (
            <View style={{ gap: 12 }}>
              {points.map((p, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 10 }}>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      marginTop: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: hexToRgba(color, 0.14),
                    }}
                  >
                    <T style={{ color, fontSize: 11, fontWeight: "800" }}>{i + 1}</T>
                  </View>
                  <T variant="body" style={{ flex: 1, lineHeight: 22 }}>
                    {p}
                  </T>
                </View>
              ))}
            </View>
          )}
        </Section>
      )}

      {montrerDefs && (
        <Section titre="Définitions" color={color}>
          <View style={{ gap: 12 }}>
            {g.definitions.map((d, i) => (
              <View key={i} style={{ gap: 3 }}>
                <T variant="body" weight="semibold" style={{ color }}>
                  {d.terme}
                </T>
                <T variant="caption" tone="secondary" style={{ lineHeight: 19 }}>
                  {d.sens}
                </T>
              </View>
            ))}
          </View>
        </Section>
      )}

      {montrerMots && (
        <Section titre="Mots-clés" color={color}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {g.motsCles.map((m) => (
              <Chip key={m} color={color} label={m} />
            ))}
          </View>
        </Section>
      )}

      <Section titre="Mes notes" color={color}>
        <TextInput
          value={fiche.notesPerso}
          onChangeText={(v) => setNotesPerso(fiche.id, v)}
          placeholder="Ajoute ce que l'app a raté, tes exemples, tes formules…"
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          textAlignVertical="top"
          style={{
            minHeight: 110,
            color: theme.colors.textPrimary,
            fontSize: theme.type.body,
            lineHeight: 21,
          }}
        />
      </Section>

      <Pressable
        onPress={() => {
          if (!confirmSuppr) {
            setConfirmSuppr(true);
            return;
          }
          supprimer(fiche.id);
          router.back();
        }}
        style={{
          marginTop: theme.spacing(2),
          paddingVertical: 12,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: hexToRgba(theme.colors.danger, 0.3),
          alignItems: "center",
        }}
      >
        <T variant="caption" weight="semibold" tone="danger">
          {confirmSuppr ? "Appuie encore pour confirmer" : "Supprimer cette fiche"}
        </T>
      </Pressable>
    </Screen>
  );
}

function Section({ titre, color, children }: { titre: string; color: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing(5) }}>
      <View style={{ marginBottom: theme.spacing(2) }}>
        <Eyebrow color={color}>{titre}</Eyebrow>
      </View>
      <Card>{children}</Card>
    </View>
  );
}
