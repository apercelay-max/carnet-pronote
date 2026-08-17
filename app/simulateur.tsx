import React, { useMemo, useState } from "react";
import { View, Pressable, TextInput, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { GradeKind } from "pawnote";
import { useTheme } from "../src/theme/ThemeProvider";
import { useDataStore } from "../src/store/useDataStore";
import { usePreferencesStore } from "../src/store/usePreferencesStore";
import { Screen } from "../src/components/ui/Screen";
import { T } from "../src/components/ui/Text";
import { Card } from "../src/components/ui/Card";
import { Icon } from "../src/components/ui/Icon";
import { Eyebrow, BigStat, StatTile, StatRow } from "../src/components/ui/Stats";
import { colorForSubject, hexToRgba } from "../src/theme/palette";
import { gradeOn20 } from "../src/lib/format";

export default function SimulateurScreen() {
  const theme = useTheme();
  const router = useRouter();
  const grades = useDataStore((s) => s.grades);
  const subjectColors = usePreferencesStore((s) => s.subjectColors);

  const [matiere, setMatiere] = useState<string | null>(null);
  const [note, setNote] = useState("15");
  const [coef, setCoef] = useState("1");

  const matieres = useMemo(
    () => (grades?.subjectsAverages ?? []).map((s) => s.subject.name),
    [grades]
  );

  const choisie = matiere ?? matieres[0] ?? null;

  // On recalcule la moyenne de la matière à partir de SES notes plutôt que de
  // partir de la moyenne affichée par Pronote : c'est le seul moyen d'y
  // ajouter une note hypothétique. L'écart entre les deux est affiché plus
  // bas, honnêtement — Pronote applique parfois des règles qu'on ne voit pas.
  const calc = useMemo(() => {
    if (!choisie || !grades) return null;

    const notes = (grades.grades ?? []).filter((g) => g.subject.name === choisie);
    let somme = 0;
    let poids = 0;
    notes.forEach((g) => {
      const v = gradeOn20(g.value, g.outOf);
      if (v === null) return;
      const c = g.coefficient || 1;
      somme += v * c;
      poids += c;
    });

    if (poids === 0) return { notes: notes.length, actuelle: null, simulee: null, pronote: null, delta: null };

    const actuelle = somme / poids;

    const nNote = parseFloat(note.replace(",", "."));
    const nCoef = parseFloat(coef.replace(",", ".")) || 1;
    const valide = Number.isFinite(nNote) && nNote >= 0 && nNote <= 20 && nCoef > 0;
    const simulee = valide ? (somme + nNote * nCoef) / (poids + nCoef) : null;

    const sa = grades.subjectsAverages?.find((s) => s.subject.name === choisie);
    const pronote = sa?.student && sa.student.kind === GradeKind.Grade ? sa.student.points : null;

    return {
      notes: notes.length,
      actuelle,
      simulee,
      pronote,
      delta: simulee !== null ? simulee - actuelle : null,
    };
  }, [choisie, grades, note, coef]);

  // Impact estimé sur la moyenne générale : si la générale est la moyenne des
  // moyennes de matières, bouger une matière de X la bouge de X / nb matières.
  const impactGeneral = useMemo(() => {
    if (!calc?.delta || matieres.length === 0) return null;
    return calc.delta / matieres.length;
  }, [calc, matieres]);

  const color = choisie ? colorForSubject(choisie, subjectColors) : theme.colors.accent;
  const fmt = (n: number | null | undefined) =>
    n === null || n === undefined ? "—" : n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing(5) }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: theme.spacing(3) }}>
          <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <T variant="hero">Simulateur</T>
      </View>

      {matieres.length === 0 ? (
        <Card>
          <T variant="body" tone="secondary">
            Pas encore de moyennes récupérées : connecte-toi ou rafraîchis l'onglet Notes.
          </T>
        </Card>
      ) : (
        <>
          <View style={{ marginBottom: theme.spacing(3) }}>
            <Eyebrow>Matière</Eyebrow>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: theme.spacing(5) }}
            contentContainerStyle={{ gap: 6, paddingRight: 8 }}
          >
            {matieres.map((m) => {
              const c = colorForSubject(m, subjectColors);
              const on = m === choisie;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMatiere(m)}
                  style={{
                    paddingHorizontal: 11,
                    paddingVertical: 7,
                    borderRadius: 9,
                    borderWidth: 1,
                    borderColor: on ? c : theme.colors.border,
                    backgroundColor: on ? hexToRgba(c, 0.14) : "transparent",
                  }}
                >
                  <T
                    variant="caption"
                    weight={on ? "semibold" : "regular"}
                    style={{ color: on ? c : theme.colors.textSecondary }}
                  >
                    {m}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={{ flexDirection: "row", gap: theme.spacing(3), marginBottom: theme.spacing(5) }}>
            <View style={{ flex: 2, gap: 6 }}>
              <Eyebrow>Note visée</Eyebrow>
              <TextInput
                value={note}
                onChangeText={setNote}
                keyboardType="decimal-pad"
                placeholder="15"
                placeholderTextColor={theme.colors.textTertiary}
                style={champ(theme)}
              />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Eyebrow>Coeff.</Eyebrow>
              <TextInput
                value={coef}
                onChangeText={setCoef}
                keyboardType="decimal-pad"
                placeholder="1"
                placeholderTextColor={theme.colors.textTertiary}
                style={champ(theme)}
              />
            </View>
          </View>

          <Card elevated style={{ marginBottom: theme.spacing(4) }}>
            <Eyebrow color={color}>{`${choisie ?? ""} après cette note`}</Eyebrow>
            <View style={{ marginTop: 8, marginBottom: 14 }}>
              <BigStat
                value={fmt(calc?.simulee ?? calc?.actuelle)}
                unit="/ 20"
                delta={calc?.delta ?? null}
                deltaLabel="dans la matière"
              />
            </View>
            <StatRow>
              <StatTile label="Avant" value={fmt(calc?.actuelle)} color={color} />
              <StatTile
                label="Général"
                value={
                  impactGeneral === null
                    ? "—"
                    : `${impactGeneral >= 0 ? "+" : ""}${impactGeneral.toLocaleString("fr-FR", {
                        maximumFractionDigits: 2,
                      })}`
                }
                color={
                  impactGeneral === null || Math.abs(impactGeneral) < 0.005
                    ? theme.colors.textTertiary
                    : impactGeneral > 0
                    ? theme.colors.success
                    : theme.colors.danger
                }
              />
              <StatTile label="Notes" value={String(calc?.notes ?? 0)} />
            </StatRow>
          </Card>

          <Card>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Icon name="warning" size={18} color={theme.colors.warning} />
              <View style={{ flex: 1, gap: 6 }}>
                <T variant="caption" tone="secondary" style={{ lineHeight: 18 }}>
                  C'est une estimation. Le calcul part de tes notes et de leurs coefficients ; Pronote
                  applique parfois des règles qu'il ne montre pas (coefficients de matière, options,
                  notes neutralisées).
                </T>
                {calc?.pronote !== null && calc?.actuelle != null && (
                  <T variant="caption" tone="tertiary">
                    Recalculé : {fmt(calc.actuelle)} · affiché par Pronote : {fmt(calc.pronote)}
                    {Math.abs((calc.pronote ?? 0) - calc.actuelle) > 0.3
                      ? " — l'écart est notable, prends la simulation avec des pincettes."
                      : ""}
                  </T>
                )}
              </View>
            </View>
          </Card>
        </>
      )}
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
