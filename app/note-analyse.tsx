import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { GradeKind } from "pawnote";
import { useTheme } from "../src/theme/ThemeProvider";
import { useDataStore } from "../src/store/useDataStore";
import { usePreferencesStore } from "../src/store/usePreferencesStore";
import { useGeminiStore } from "../src/store/useGeminiStore";
import { Screen } from "../src/components/ui/Screen";
import { T } from "../src/components/ui/Text";
import { Card } from "../src/components/ui/Card";
import { Icon } from "../src/components/ui/Icon";
import { Button } from "../src/components/ui/Button";
import { Eyebrow, StatTile, StatRow } from "../src/components/ui/Stats";
import { colorForSubject, hexToRgba } from "../src/theme/palette";
import { formatDayLabel, formatGradeValue } from "../src/lib/format";
import { analyserNote, contexteNote, type AnalyseNote } from "../src/lib/analyseNote";
import { GeminiNotConfiguredError } from "../src/lib/gemini";

// Cache en mémoire le temps de la session : revenir sur une note déjà
// analysée ne doit pas relancer (ni refacturer en quota) un appel Gemini.
const cache = new Map<string, AnalyseNote>();

export default function NoteAnalyseScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const revenir = () => (router.canGoBack() ? router.back() : router.replace("/notes" as any));

  const grades = useDataStore((s) => s.grades);
  const resources = useDataStore((s) => s.resources);
  const subjectColors = usePreferencesStore((s) => s.subjectColors);
  const keyLoaded = useGeminiStore((s) => s.keyLoaded);
  const loadKey = useGeminiStore((s) => s.loadKey);

  const grade = grades?.grades.find((g) => g.id === id);
  const [analyse, setAnalyse] = useState<AnalyseNote | null>(id ? cache.get(id) ?? null : null);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!keyLoaded) loadKey();
  }, [keyLoaded, loadKey]);

  const contexte = useMemo(
    () => (grade ? contexteNote(grade, grades, resources ?? []) : ""),
    [grade, grades, resources]
  );

  const lancer = useCallback(async () => {
    if (!grade || busy) return;
    setBusy(true);
    setErreur(null);
    try {
      const a = await analyserNote(contexte, useGeminiStore.getState().apiKey);
      cache.set(grade.id, a);
      setAnalyse(a);
    } catch (err: any) {
      setErreur(
        err instanceof GeminiNotConfiguredError
          ? "Gemini n'est pas configuré. Ajoute ta clé dans l'assistant, puis réessaie."
          : err?.message ?? "Gemini n'a pas pu analyser la note."
      );
    } finally {
      setBusy(false);
    }
  }, [grade, busy, contexte]);

  // Lancée d'office à l'ouverture : on vient ici précisément pour ça.
  useEffect(() => {
    if (keyLoaded && grade && !analyse && !busy && !erreur) lancer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyLoaded, grade?.id]);

  if (!grade) {
    return (
      <Screen>
        <Pressable onPress={revenir} hitSlop={10} style={{ marginBottom: theme.spacing(4) }}>
          <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Card>
          <T variant="body" tone="secondary">
            Cette note n'est plus disponible. Resynchronise l'onglet Notes.
          </T>
        </Card>
      </Screen>
    );
  }

  const color = colorForSubject(grade.subject.name, subjectColors);
  const bareme = grade.outOf && grade.outOf.kind === GradeKind.Grade ? grade.outOf.points : 20;

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: theme.spacing(4) }}>
        <Pressable onPress={revenir} hitSlop={10} style={{ marginRight: theme.spacing(3), marginTop: 6 }}>
          <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Eyebrow color={color}>{grade.subject.name}</Eyebrow>
          <T variant="hero" style={{ marginTop: 2 }} numberOfLines={2}>
            {grade.comment || "Ma note"}
          </T>
          <T variant="caption" tone="tertiary" style={{ marginTop: 4 }}>
            {formatDayLabel(grade.date)}
            {grade.coefficient !== 1 ? ` · coefficient ${grade.coefficient}` : ""}
          </T>
        </View>
      </View>

      <Card elevated style={{ marginBottom: theme.spacing(4) }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, marginBottom: 12 }}>
          <T style={{ fontSize: 44 * theme.fontScale, fontWeight: "800", letterSpacing: -1.5, color }}>
            {formatGradeValue(grade.value)}
          </T>
          <T variant="body" tone="tertiary" style={{ marginBottom: 8 }}>
            / {bareme}
          </T>
        </View>
        <StatRow>
          <StatTile label="Classe" value={formatGradeValue(grade.average)} />
          <StatTile label="Min" value={formatGradeValue(grade.min)} color={theme.colors.danger} />
          <StatTile label="Max" value={formatGradeValue(grade.max)} color={theme.colors.success} />
        </StatRow>
      </Card>

      {busy && (
        <Card style={{ marginBottom: theme.spacing(4) }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <ActivityIndicator color={color} />
            <T variant="caption" tone="secondary" style={{ flex: 1 }}>
              Gemini analyse ta note avec tes autres résultats et tes cours…
            </T>
          </View>
        </Card>
      )}

      {erreur && (
        <Card style={{ marginBottom: theme.spacing(4) }}>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Icon name="warning" size={18} color={theme.colors.warning} />
              <T variant="caption" tone="secondary" style={{ flex: 1, lineHeight: 18 }}>
                {erreur}
              </T>
            </View>
            <Button label="Réessayer" icon="refresh" variant="secondary" onPress={lancer} />
          </View>
        </Card>
      )}

      {analyse && (
        <>
          <Section titre="Le bilan" color={color}>
            <T variant="body" style={{ lineHeight: 22 }}>
              {analyse.bilan}
            </T>
          </Section>

          {analyse.pointsForts.length > 0 && (
            <Section titre="Ce qui va bien" color={theme.colors.success}>
              <View style={{ gap: 8 }}>
                {analyse.pointsForts.map((p, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 10 }}>
                    <Icon name="check" size={16} color={theme.colors.success} />
                    <T variant="body" style={{ flex: 1, lineHeight: 21 }}>
                      {p}
                    </T>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {analyse.aRetravailler.length > 0 && (
            <Section titre="À retravailler" color={color}>
              <View style={{ gap: 16 }}>
                {analyse.aRetravailler.map((x, i) => (
                  <View key={i} style={{ gap: 4 }}>
                    <T variant="body" weight="semibold" style={{ color }}>
                      {i + 1}. {x.notion}
                    </T>
                    {!!x.pourquoi && (
                      <T variant="caption" tone="secondary" style={{ lineHeight: 18 }}>
                        {x.pourquoi}
                      </T>
                    )}
                    {!!x.exercice && (
                      <View
                        style={{
                          marginTop: 4,
                          padding: 10,
                          borderRadius: 10,
                          backgroundColor: hexToRgba(color, theme.isDark ? 0.12 : 0.08),
                        }}
                      >
                        <T variant="caption" style={{ lineHeight: 18 }}>
                          <T variant="caption" weight="semibold">
                            Exercice :{" "}
                          </T>
                          {x.exercice}
                        </T>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </Section>
          )}

          {analyse.conseils.length > 0 && (
            <Section titre="Pour la prochaine fois" color={color}>
              <View style={{ gap: 8 }}>
                {analyse.conseils.map((c, i) => (
                  <T key={i} variant="body" style={{ lineHeight: 21 }}>
                    • {c}
                  </T>
                ))}
              </View>
            </Section>
          )}

          <T variant="caption" tone="tertiary" style={{ marginBottom: theme.spacing(4), lineHeight: 18 }}>
            Gemini ne voit pas ta copie : c'est une lecture des chiffres et de tes cours. La correction
            du prof reste la référence.
          </T>

          <Button
            label={`Faire une fiche${analyse.chapitreProbable ? ` : ${analyse.chapitreProbable}` : ""}`}
            icon="sparkle"
            onPress={() => router.push(`/preparer-controle?matiere=${encodeURIComponent(grade.subject.name)}` as any)}
          />
        </>
      )}
    </Screen>
  );
}

function Section({ titre, color, children }: { titre: string; color: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing(4) }}>
      <View style={{ marginBottom: theme.spacing(2) }}>
        <Eyebrow color={color}>{titre}</Eyebrow>
      </View>
      <Card>{children}</Card>
    </View>
  );
}
