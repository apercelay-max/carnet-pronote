import React, { useEffect, useCallback, useMemo } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { GradeKind } from "pawnote";
import { useTheme } from "../../src/theme/ThemeProvider";
import { useSessionStore } from "../../src/store/useSessionStore";
import { useDataStore } from "../../src/store/useDataStore";
import { usePreferencesStore } from "../../src/store/usePreferencesStore";
import { Screen } from "../../src/components/ui/Screen";
import { T } from "../../src/components/ui/Text";
import { Card } from "../../src/components/ui/Card";
import { Icon } from "../../src/components/ui/Icon";
import { Eyebrow, Chip, BigStat, StatTile, StatRow, Bar, Sparkline } from "../../src/components/ui/Stats";
import { colorForSubject } from "../../src/theme/palette";
import { formatGradeValue, formatDayLabel, gradeOn20 } from "../../src/lib/format";

export default function NotesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const isDemo = useSessionStore((s) => s.isDemo);
  const { grades, loading, refreshAll } = useDataStore();
  const subjectColors = usePreferencesStore((s) => s.subjectColors);

  const sync = useCallback(() => {
    if (session) refreshAll(session);
  }, [session, refreshAll]);

  useEffect(() => {
    if (session && !grades) sync();
  }, [session]);

  const allGrades = grades?.grades ?? [];

  const recentGrades = useMemo(
    () => [...allGrades].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [grades]
  );

  // Toutes les stats ci-dessous sont calculées sur les notes réellement
  // renvoyées par Pronote. Aucune valeur inventée : quand il n'y a pas de
  // note exploitable, on renvoie null et l'affichage montre "—".
  const stats = useMemo(() => {
    const scored = allGrades
      .map((g) => gradeOn20(g.value, g.outOf))
      .filter((v): v is number => v !== null);

    const mine = grades?.overallAverage;
    const klass = grades?.classAverage;
    const mineNum = mine && mine.kind === GradeKind.Grade ? mine.points : null;
    const klassNum = klass && klass.kind === GradeKind.Grade ? klass.points : null;

    return {
      count: scored.length,
      best: scored.length ? Math.max(...scored) : null,
      worst: scored.length ? Math.min(...scored) : null,
      mineNum,
      klassNum,
      // Écart avec la classe : la seule comparaison dont on dispose vraiment.
      delta: mineNum !== null && klassNum !== null ? mineNum - klassNum : null,
    };
  }, [grades]);

  // Historique par matière, du plus ancien au plus récent, pour la mini-courbe.
  const historyBySubject = useMemo(() => {
    const map: Record<string, number[]> = {};
    [...allGrades]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .forEach((g) => {
        const v = gradeOn20(g.value, g.outOf);
        if (v === null) return;
        (map[g.subject.name] ??= []).push(v);
      });
    return map;
  }, [grades]);

  // Meilleure note par matière -> sert à poser le badge "record".
  const bestBySubject = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(historyBySubject).forEach(([name, values]) => {
      map[name] = Math.max(...values);
    });
    return map;
  }, [historyBySubject]);

  const fmt = (n: number | null) => (n === null ? "—" : n.toLocaleString("fr-FR", { maximumFractionDigits: 2 }));

  return (
    <Screen onRefresh={isDemo ? undefined : sync} refreshing={loading}>
      <View style={{ marginBottom: theme.spacing(5) }}>
        <Eyebrow color={theme.colors.accent}>Mes résultats</Eyebrow>
        <T variant="hero" style={{ marginTop: 2 }}>
          Notes
        </T>
      </View>

      {/* Moyenne générale en grand, façon PPL : le chiffre porte l'écran. */}
      <Card style={{ marginBottom: theme.spacing(4) }} elevated>
        <Eyebrow color={theme.colors.accent}>Moyenne générale</Eyebrow>
        <View style={{ marginTop: 8, marginBottom: 14 }}>
          <BigStat
            value={formatGradeValue(grades?.overallAverage)}
            unit="/ 20"
            delta={stats.delta}
            deltaLabel="vs classe"
          />
        </View>
        <StatRow>
          <StatTile label="Classe" value={fmt(stats.klassNum)} />
          <StatTile label="Max" value={fmt(stats.best)} color={theme.colors.success} />
          <StatTile label="Min" value={fmt(stats.worst)} color={theme.colors.danger} />
          <StatTile label="Notes" value={String(stats.count)} />
        </StatRow>
      </Card>

      <Card onPress={() => router.push("/competences")} style={{ marginBottom: theme.spacing(5) }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3) }}>
          <Icon name="target" size={20} color={theme.colors.accent} />
          <T variant="body" weight="medium" style={{ flex: 1 }}>
            Compétences évaluées
          </T>
          <Icon name="chevronRight" size={16} color={theme.colors.textTertiary} />
        </View>
      </Card>

      <View style={{ marginBottom: theme.spacing(3) }}>
        <Eyebrow>Par matière</Eyebrow>
      </View>
      <View style={{ gap: theme.spacing(3), marginBottom: theme.spacing(6) }}>
        {(grades?.subjectsAverages ?? []).map((s) => {
          const color = colorForSubject(s.subject.name, subjectColors);
          const mine = s.student && s.student.kind === GradeKind.Grade ? s.student.points : null;
          const klass =
            s.class_average && s.class_average.kind === GradeKind.Grade ? s.class_average.points : null;
          const ecart = mine !== null && klass !== null ? mine - klass : null;
          const history = historyBySubject[s.subject.name] ?? [];

          return (
            <Card key={s.subject.id} padded>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 4, alignSelf: "stretch", minHeight: 38, borderRadius: 2, backgroundColor: color }} />

                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <T variant="body" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
                      {s.subject.name}
                    </T>
                    {ecart !== null && Math.abs(ecart) >= 0.05 ? (
                      <Chip
                        color={ecart > 0 ? theme.colors.success : theme.colors.danger}
                        label={`${ecart > 0 ? "+" : ""}${ecart.toLocaleString("fr-FR", {
                          maximumFractionDigits: 1,
                        })}`}
                      />
                    ) : null}
                  </View>
                  <Bar value={mine !== null ? mine / 20 : 0} color={color} />
                  <T variant="caption" tone="tertiary">
                    Classe {klass !== null ? fmt(klass) : "—"}
                    {history.length ? ` · ${history.length} note${history.length > 1 ? "s" : ""}` : ""}
                  </T>
                </View>

                <Sparkline values={history} color={color} />

                <T
                  style={{
                    fontSize: 22 * theme.fontScale,
                    fontWeight: "800",
                    letterSpacing: -0.6,
                    color,
                    minWidth: 46,
                    textAlign: "right",
                  }}
                >
                  {formatGradeValue(s.student)}
                </T>
              </View>
            </Card>
          );
        })}
        {(grades?.subjectsAverages ?? []).length === 0 && (
          <Card>
            <T variant="body" tone="secondary">
              Pas encore de moyennes pour cette période.
            </T>
          </Card>
        )}
      </View>

      <View style={{ marginBottom: theme.spacing(3) }}>
        <Eyebrow>Toutes les notes</Eyebrow>
      </View>
      <View style={{ gap: theme.spacing(3) }}>
        {recentGrades.map((g) => {
          const color = colorForSubject(g.subject.name, subjectColors);
          const on20 = gradeOn20(g.value, g.outOf);
          const isRecord =
            on20 !== null &&
            bestBySubject[g.subject.name] !== undefined &&
            on20 === bestBySubject[g.subject.name] &&
            (historyBySubject[g.subject.name]?.length ?? 0) > 1;
          const classAvg = g.average && g.average.kind === GradeKind.Grade ? g.average.points : null;
          const ecart = on20 !== null && classAvg !== null ? on20 - classAvg : null;

          return (
            <Card key={g.id} padded>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />

                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <T variant="body" weight="medium" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {g.subject.name}
                    </T>
                    {isRecord ? <Chip color={theme.colors.warning} label="Record" /> : null}
                    {g.coefficient !== 1 ? (
                      <Chip color={theme.colors.textTertiary} label={`×${g.coefficient}`} />
                    ) : null}
                  </View>
                  <T variant="caption" tone="tertiary" numberOfLines={1}>
                    {g.comment || "Note"} · {formatDayLabel(g.date)}
                    {ecart !== null
                      ? ` · ${ecart >= 0 ? "+" : ""}${ecart.toLocaleString("fr-FR", {
                          maximumFractionDigits: 1,
                        })} vs classe`
                      : ""}
                  </T>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <T
                    style={{
                      fontSize: 22 * theme.fontScale,
                      fontWeight: "800",
                      letterSpacing: -0.6,
                      color,
                    }}
                  >
                    {formatGradeValue(g.value)}
                  </T>
                  <T variant="caption" tone="tertiary">
                    / {g.outOf && g.outOf.kind === GradeKind.Grade ? g.outOf.points : 20}
                  </T>
                </View>
              </View>
            </Card>
          );
        })}
        {recentGrades.length === 0 && (
          <Card>
            <T variant="body" tone="secondary">
              Aucune note pour l'instant.
            </T>
          </Card>
        )}
      </View>
    </Screen>
  );
}
