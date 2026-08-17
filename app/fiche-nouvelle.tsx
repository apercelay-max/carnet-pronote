import React, { useMemo, useState } from "react";
import { View, Pressable, TextInput, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../src/theme/ThemeProvider";
import { useDataStore } from "../src/store/useDataStore";
import { usePreferencesStore } from "../src/store/usePreferencesStore";
import { Screen } from "../src/components/ui/Screen";
import { T } from "../src/components/ui/Text";
import { Card } from "../src/components/ui/Card";
import { Icon } from "../src/components/ui/Icon";
import { Button } from "../src/components/ui/Button";
import { Eyebrow, Chip } from "../src/components/ui/Stats";
import { colorForSubject, hexToRgba } from "../src/theme/palette";
import { stripHtml } from "../src/lib/fiches";
import { useFichesStore, type FicheMode } from "../src/store/useFichesStore";
import { formatDayLabel } from "../src/lib/format";

const TITRES: Record<FicheMode, string> = {
  fiche: "Nouvelle fiche",
  resume: "Nouveau résumé",
  points: "Points importants",
};

export default function FicheNouvelleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: FicheMode =
    params.mode === "resume" || params.mode === "points" ? params.mode : "fiche";

  const resources = useDataStore((s) => s.resources);
  const subjectColors = usePreferencesStore((s) => s.subjectColors);
  const creerFiche = useFichesStore((s) => s.creerFiche);

  const [titre, setTitre] = useState("");
  const [matiere, setMatiere] = useState("");
  const [texte, setTexte] = useState("");

  // Contenus de cours récupérés depuis Pronote (cahier de textes). On les
  // propose comme point de départ, mais ils sont souvent courts : d'où la
  // grande zone de texte en dessous, où on colle son vrai cours.
  const contenus = useMemo(() => {
    return (resources ?? [])
      .flatMap((r) =>
        (r.contents ?? []).map((c) => ({
          id: c.id,
          matiere: r.subject?.name ?? "Cours",
          titre: c.title || r.subject?.name || "Contenu de cours",
          texte: stripHtml(`${c.title ?? ""}\n${c.description ?? ""}`),
          date: r.startDate,
        }))
      )
      .filter((c) => c.texte.length > 0)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 12);
  }, [resources]);

  const matieres = useMemo(() => {
    const set = new Set<string>();
    (resources ?? []).forEach((r) => r.subject?.name && set.add(r.subject.name));
    return [...set].sort();
  }, [resources]);

  const assezDeTexte = stripHtml(texte).length >= 80;

  const generer = () => {
    const fiche = creerFiche({
      mode,
      titre: titre || contenus.find((c) => c.texte === texte)?.titre || "Sans titre",
      matiere: matiere || "Général",
      texteSource: texte,
    });
    router.replace(`/fiche/${fiche.id}`);
  };

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing(5) }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: theme.spacing(3) }}>
          <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <T variant="hero">{TITRES[mode]}</T>
      </View>

      {/* Message d'honnêteté : l'app n'invente rien, elle sélectionne. */}
      <Card style={{ marginBottom: theme.spacing(5) }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Icon name="warning" size={18} color={theme.colors.warning} />
          <T variant="caption" tone="secondary" style={{ flex: 1, lineHeight: 18 }}>
            Tout se calcule sur ton téléphone, sans IA et sans connexion. L'app repère et
            réorganise les phrases de ton cours — elle n'en invente aucune. Plus le texte que tu
            colles est complet, meilleure sera la fiche.
          </T>
        </View>
      </Card>

      {contenus.length > 0 && (
        <>
          <View style={{ marginBottom: theme.spacing(3) }}>
            <Eyebrow>Depuis le cahier de textes</Eyebrow>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: theme.spacing(5) }}
            contentContainerStyle={{ gap: 8, paddingRight: 8 }}
          >
            {contenus.map((c) => {
              const color = colorForSubject(c.matiere, subjectColors);
              const choisi = texte === c.texte;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setTexte(c.texte);
                    setTitre(c.titre);
                    setMatiere(c.matiere);
                  }}
                  style={{
                    width: 190,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: choisi ? color : theme.colors.border,
                    backgroundColor: choisi
                      ? hexToRgba(color, theme.isDark ? 0.12 : 0.08)
                      : theme.colors.surface,
                    gap: 6,
                  }}
                >
                  <Chip color={color} label={c.matiere} />
                  <T variant="caption" weight="semibold" numberOfLines={2}>
                    {c.titre}
                  </T>
                  <T variant="caption" tone="tertiary" numberOfLines={1}>
                    {formatDayLabel(c.date)}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      <View style={{ gap: theme.spacing(4), marginBottom: theme.spacing(5) }}>
        <View style={{ gap: 6 }}>
          <Eyebrow>Titre</Eyebrow>
          <TextInput
            value={titre}
            onChangeText={setTitre}
            placeholder="Ex. Les fonctions affines"
            placeholderTextColor={theme.colors.textTertiary}
            style={champ(theme)}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Eyebrow>Matière</Eyebrow>
          {matieres.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingVertical: 2, paddingRight: 8 }}
            >
              {matieres.map((m) => {
                const color = colorForSubject(m, subjectColors);
                const on = matiere === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMatiere(on ? "" : m)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: on ? color : theme.colors.border,
                      backgroundColor: on ? hexToRgba(color, 0.14) : "transparent",
                    }}
                  >
                    <T variant="caption" weight={on ? "semibold" : "regular"} style={{ color: on ? color : theme.colors.textSecondary }}>
                      {m}
                    </T>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <TextInput
            value={matiere}
            onChangeText={setMatiere}
            placeholder="Ou tape une matière"
            placeholderTextColor={theme.colors.textTertiary}
            style={champ(theme)}
          />
        </View>

        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Eyebrow>Ton cours</Eyebrow>
            <T variant="caption" tone="tertiary">
              {stripHtml(texte).length} caractères
            </T>
          </View>
          <TextInput
            value={texte}
            onChangeText={setTexte}
            placeholder="Colle ici le texte de ta leçon, ou écris-le."
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            textAlignVertical="top"
            style={[champ(theme), { minHeight: 190, lineHeight: 21 }]}
          />
          {!assezDeTexte && texte.length > 0 && (
            <T variant="caption" tone="tertiary">
              C'est encore court : en dessous d'environ 80 caractères, il n'y a pas assez de
              matière pour sortir quelque chose d'utile.
            </T>
          )}
        </View>
      </View>

      <Button label="Générer" icon="sparkle" onPress={generer} disabled={!assezDeTexte} />
    </Screen>
  );
}

function champ(theme: ReturnType<typeof useTheme>) {
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
