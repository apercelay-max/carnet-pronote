import React, { useEffect, useCallback, useMemo } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/theme/ThemeProvider";
import { useSessionStore } from "../../src/store/useSessionStore";
import { useDataStore } from "../../src/store/useDataStore";
import { usePreferencesStore } from "../../src/store/usePreferencesStore";
import { Screen } from "../../src/components/ui/Screen";
import { T } from "../../src/components/ui/Text";
import { Card } from "../../src/components/ui/Card";
import { Icon } from "../../src/components/ui/Icon";
import { ProgressRing } from "../../src/components/ui/ProgressRing";
import { colorForSubject } from "../../src/theme/palette";
import { formatGradeValue, formatDayLabel } from "../../src/lib/format";

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

  const overall = grades?.overallAverage;
  const overallValue = overall && overall.kind === 0 ? overall.points / 20 : 0;

  const recentGrades = useMemo(
    () => [...(grades?.grades ?? [])].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [grades]
  );

  return (
    <Screen onRefresh={isDemo ? undefined : sync} refreshing={loading}>
      <T variant="hero" style={{ marginBottom: theme.spacing(6) }}>
        Notes
      </T>

      <Card style={{ marginBottom: theme.spacing(5) }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(5) }}>
          <ProgressRing value={overallValue} centerText={formatGradeValue(overall)} label="/ 20" />
          <View style={{ flex: 1, gap: 4 }}>
            <Row label="Toi" value={formatGradeValue(overall)} accent />
            <Row label="Classe" value={formatGradeValue(grades?.classAverage)} />
          </View>
        </View>
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

      <T variant="subtitle" style={{ marginBottom: theme.spacing(3) }}>
        Par matière
      </T>
      <View style={{ gap: theme.spacing(3), marginBottom: theme.spacing(6) }}>
        {(grades?.subjectsAverages ?? []).map((s) => {
          const color = colorForSubject(s.subject.name, subjectColors);
          const val = s.student && s.student.kind === 0 ? s.student.points / (s.outOf?.points || 20) : 0;
          return (
            <Card key={s.subject.id} padded>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ width: 4, height: 34, borderRadius: 2, backgroundColor: color, marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="semibold">
                    {s.subject.name}
                  </T>
                  <View
                    style={{
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: theme.colors.borderSoft,
                      marginTop: 6,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        width: `${Math.max(0, Math.min(1, val)) * 100}%`,
                        height: "100%",
                        backgroundColor: color,
                        borderRadius: 3,
                      }}
                    />
                  </View>
                </View>
                <T variant="subtitle" style={{ marginLeft: 12, color }}>
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

      <T variant="subtitle" style={{ marginBottom: theme.spacing(3) }}>
        Toutes les notes
      </T>
      <View style={{ gap: theme.spacing(3) }}>
        {recentGrades.map((g) => {
          const color = colorForSubject(g.subject.name, subjectColors);
          return (
            <Card key={g.id} padded>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: color,
                    marginRight: 10,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="medium" numberOfLines={1}>
                    {g.subject.name}
                  </T>
                  <T variant="caption" tone="secondary" numberOfLines={1}>
                    {g.comment || "Note"} · {formatDayLabel(g.date)}
                    {g.coefficient !== 1 ? ` · coeff. ${g.coefficient}` : ""}
                  </T>
                </View>
                <T variant="title" style={{ color }}>
                  {formatGradeValue(g.value)}
                </T>
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

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <T variant="body" tone="secondary">
        {label}
      </T>
      <T variant="body" weight="semibold" tone={accent ? "accent" : "primary"}>
        {value} / 20
      </T>
    </View>
  );
}
