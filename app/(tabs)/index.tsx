import React, { useEffect, useCallback } from "react";
import { View } from "react-native";
import { useTheme } from "../../src/theme/ThemeProvider";
import { useSessionStore } from "../../src/store/useSessionStore";
import { useDataStore } from "../../src/store/useDataStore";
import { usePreferencesStore, WidgetId } from "../../src/store/usePreferencesStore";
import { Screen } from "../../src/components/ui/Screen";
import { T } from "../../src/components/ui/Text";
import { Card } from "../../src/components/ui/Card";
import { Icon } from "../../src/components/ui/Icon";
import { ProgressRing } from "../../src/components/ui/ProgressRing";
import { colorForSubject } from "../../src/theme/palette";
import { formatGradeValue, formatTime, gradeOn20 } from "../../src/lib/format";
import { GradeValue } from "pawnote";

export default function DashboardScreen() {
  const theme = useTheme();
  const session = useSessionStore((s) => s.session);
  const isDemo = useSessionStore((s) => s.isDemo);
  const displayName = useSessionStore((s) => s.displayName);
  const { grades, notebookData, timetable, assignments, loading, refreshAll } = useDataStore();
  const widgetOrder = usePreferencesStore((s) => s.widgetOrder);
  const hiddenWidgets = usePreferencesStore((s) => s.hiddenWidgets);
  const subjectColors = usePreferencesStore((s) => s.subjectColors);

  const sync = useCallback(() => {
    if (session) refreshAll(session);
  }, [session, refreshAll]);

  useEffect(() => {
    if (session && !grades) sync();
  }, [session]);

  const visibleWidgets = widgetOrder.filter((w) => !hiddenWidgets.includes(w));

  return (
    <Screen onRefresh={isDemo ? undefined : sync} refreshing={loading}>
      <View style={{ marginBottom: theme.spacing(6) }}>
        <T variant="caption" tone="secondary">
          {greeting()}
        </T>
        <T variant="hero">{displayName ?? "Salut"}</T>
      </View>

      <View style={{ gap: theme.spacing(4) }}>
        {visibleWidgets.map((id) => (
          <Widget
            key={id}
            id={id}
            grades={grades}
            notebookData={notebookData}
            timetable={timetable}
            assignments={assignments}
            subjectColors={subjectColors}
          />
        ))}
      </View>
    </Screen>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function Widget({ id, grades, notebookData, timetable, assignments, subjectColors }: any) {
  const theme = useTheme();

  if (id === "moyenneGenerale") {
    const overall = grades?.overallAverage as GradeValue | undefined;
    const value = overall && overall.kind === 0 ? overall.points / 20 : 0;
    return (
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(5) }}>
          <ProgressRing value={value} centerText={formatGradeValue(overall)} label="/ 20" size={92} strokeWidth={9} />
          <View style={{ flex: 1 }}>
            <T variant="subtitle">Moyenne générale</T>
            <T variant="caption" tone="secondary" style={{ marginTop: 2 }}>
              Classe : {formatGradeValue(grades?.classAverage)} / 20
            </T>
          </View>
        </View>
      </Card>
    );
  }

  if (id === "prochainCours") {
    const now = new Date();
    const upcoming = (timetable?.classes ?? [])
      .filter((c: any) => c.endDate > now && !c.canceled)
      .sort((a: any, b: any) => a.startDate - b.startDate)[0];

    return (
      <Card>
        <T variant="subtitle" style={{ marginBottom: theme.spacing(3) }}>
          Prochain cours
        </T>
        {upcoming ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3) }}>
            <View
              style={{
                width: 4,
                alignSelf: "stretch",
                borderRadius: 2,
                backgroundColor: colorForSubject(upcoming.subject?.name ?? "?", subjectColors),
              }}
            />
            <View style={{ flex: 1 }}>
              <T variant="body" weight="semibold">
                {upcoming.subject?.name ?? "Cours"}
              </T>
              <T variant="caption" tone="secondary">
                {formatTime(upcoming.startDate)} – {formatTime(upcoming.endDate)}
                {upcoming.classrooms?.[0] ? ` · ${upcoming.classrooms[0]}` : ""}
              </T>
            </View>
            <Icon name="chevronRight" size={16} color={theme.colors.textTertiary} />
          </View>
        ) : (
          <T variant="body" tone="secondary">
            Rien de prévu pour l'instant.
          </T>
        )}
      </Card>
    );
  }

  if (id === "devoirsAVenir") {
    const upcoming = (assignments ?? []).filter((a: any) => !a.done).slice(0, 3);
    return (
      <Card>
        <T variant="subtitle" style={{ marginBottom: theme.spacing(3) }}>
          Devoirs à venir
        </T>
        {upcoming.length === 0 ? (
          <T variant="body" tone="secondary">
            Rien à faire pour le moment, profite-en.
          </T>
        ) : (
          <View style={{ gap: theme.spacing(3) }}>
            {upcoming.map((a: any) => (
              <View key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3) }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colorForSubject(a.subject.name, subjectColors),
                  }}
                />
                <View style={{ flex: 1 }}>
                  <T variant="body" numberOfLines={1}>
                    {a.subject.name}
                  </T>
                  <T variant="caption" tone="secondary" numberOfLines={1}>
                    {a.description}
                  </T>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>
    );
  }

  if (id === "dernieresNotes") {
    const latest = [...(grades?.grades ?? [])]
      .sort((a: any, b: any) => b.date - a.date)
      .slice(0, 3);
    return (
      <Card>
        <T variant="subtitle" style={{ marginBottom: theme.spacing(3) }}>
          Dernières notes
        </T>
        {latest.length === 0 ? (
          <T variant="body" tone="secondary">
            Pas encore de notes ce trimestre.
          </T>
        ) : (
          <View style={{ gap: theme.spacing(3) }}>
            {latest.map((g: any) => {
              const on20 = gradeOn20(g.value, g.outOf);
              const color = on20 !== null && on20 < 10 ? theme.colors.danger : theme.colors.success;
              return (
                <View key={g.id} style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <T variant="body" numberOfLines={1}>
                      {g.subject.name}
                    </T>
                    <T variant="caption" tone="secondary" numberOfLines={1}>
                      {g.comment || "Note"}
                    </T>
                  </View>
                  <T variant="subtitle" style={{ color }}>
                    {formatGradeValue(g.value)}
                  </T>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    );
  }

  if (id === "vieScolaire") {
    const obsCount = notebookData?.observations?.length ?? 0;
    const absCount = notebookData?.absences?.length ?? 0;
    return (
      <Card>
        <T variant="subtitle" style={{ marginBottom: theme.spacing(3) }}>
          Vie scolaire
        </T>
        <View style={{ flexDirection: "row", gap: theme.spacing(6) }}>
          <Stat icon="bell" value={obsCount} label="observations" />
          <Stat icon="warning" value={absCount} label="absences" />
        </View>
      </Card>
    );
  }

  return null;
}

function Stat({ icon, value, label }: any) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Icon name={icon} size={16} color={theme.colors.textSecondary} />
      <T variant="body">
        <T variant="body" weight="semibold">
          {value}
        </T>{" "}
        {label}
      </T>
    </View>
  );
}
