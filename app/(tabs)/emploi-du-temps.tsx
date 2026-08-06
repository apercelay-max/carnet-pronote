import React, { useEffect, useCallback, useMemo, useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useTheme } from "../../src/theme/ThemeProvider";
import { useSessionStore } from "../../src/store/useSessionStore";
import { useDataStore } from "../../src/store/useDataStore";
import { usePreferencesStore } from "../../src/store/usePreferencesStore";
import { Screen } from "../../src/components/ui/Screen";
import { T } from "../../src/components/ui/Text";
import { Card } from "../../src/components/ui/Card";
import { Icon } from "../../src/components/ui/Icon";
import { colorForSubject } from "../../src/theme/palette";
import { formatTime, formatDayOfWeekLetter } from "../../src/lib/format";

function weekDates(): Date[] {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export default function TimetableScreen() {
  const theme = useTheme();
  const session = useSessionStore((s) => s.session);
  const isDemo = useSessionStore((s) => s.isDemo);
  const { timetable, loading, refreshAll } = useDataStore();
  const subjectColors = usePreferencesStore((s) => s.subjectColors);

  const days = useMemo(weekDates, []);
  const todayIndex = days.findIndex((d) => isSameDay(d, new Date()));
  const [selected, setSelected] = useState(todayIndex >= 0 ? todayIndex : 0);

  const sync = useCallback(() => {
    if (session) refreshAll(session);
  }, [session, refreshAll]);

  useEffect(() => {
    if (session && !timetable) sync();
  }, [session]);

  const classesForDay = useMemo(() => {
    const target = days[selected];
    return (timetable?.classes ?? [])
      .filter((c: any) => isSameDay(c.startDate, target))
      .sort((a: any, b: any) => a.startDate.getTime() - b.startDate.getTime());
  }, [timetable, days, selected]);

  return (
    <Screen scroll={false}>
      <View style={{ paddingHorizontal: theme.spacing(4), paddingTop: theme.spacing(2) }}>
        <T variant="hero" style={{ marginBottom: theme.spacing(5) }}>
          Emploi du temps
        </T>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: theme.spacing(5) }}>
          {days.map((d, i) => {
            const active = i === selected;
            const isToday = isSameDay(d, new Date());
            return (
              <Pressable key={i} onPress={() => setSelected(i)} style={{ flex: 1 }}>
                <View
                  style={{
                    alignItems: "center",
                    paddingVertical: 10,
                    borderRadius: theme.radius.md,
                    backgroundColor: active ? theme.colors.accent : theme.colors.surface,
                    borderWidth: 1,
                    borderColor: active ? theme.colors.accent : theme.colors.borderSoft,
                  }}
                >
                  <T
                    variant="caption"
                    weight="semibold"
                    style={{ color: active ? "#0B0D12" : theme.colors.textTertiary }}
                  >
                    {formatDayOfWeekLetter(d)}
                  </T>
                  <T
                    variant="body"
                    weight="semibold"
                    style={{ color: active ? "#0B0D12" : isToday ? theme.colors.accent : theme.colors.textPrimary }}
                  >
                    {d.getDate()}
                  </T>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing(4),
          paddingTop: 0,
          paddingBottom: theme.spacing(24),
        }}
        showsVerticalScrollIndicator={false}
      >
        {classesForDay.length === 0 ? (
          <Card>
            <T variant="body" tone="secondary">
              Aucun cours ce jour-là.
            </T>
          </Card>
        ) : (
          <View style={{ gap: theme.spacing(3) }}>
            {classesForDay.map((c: any) => {
              const isLesson = c.is === "lesson";
              const name = isLesson ? c.subject?.name ?? "Cours" : c.is === "activity" ? c.title : "Retenue";
              const color = colorForSubject(name, subjectColors);
              const canceled = isLesson && c.canceled;
              return (
                <Card key={c.id} padded style={{ opacity: canceled ? 0.55 : 1 }}>
                  <View style={{ flexDirection: "row" }}>
                    <View style={{ width: 58 }}>
                      <T variant="caption" weight="semibold">
                        {formatTime(c.startDate)}
                      </T>
                      <T variant="caption" tone="tertiary">
                        {formatTime(c.endDate)}
                      </T>
                    </View>
                    <View style={{ width: 4, borderRadius: 2, backgroundColor: color, marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <T variant="body" weight="semibold" numberOfLines={1}>
                        {name}
                        {canceled ? " — annulé" : ""}
                      </T>
                      <View style={{ flexDirection: "row", gap: 10, marginTop: 2, flexWrap: "wrap" }}>
                        {c.classrooms?.[0] ? (
                          <MetaTag icon="pin" text={c.classrooms[0]} />
                        ) : null}
                        {c.teacherNames?.[0] ? <MetaTag icon="user" text={c.teacherNames[0]} /> : null}
                        {isLesson && c.test ? <MetaTag icon="warning" text="Évaluation" /> : null}
                      </View>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function MetaTag({ icon, text }: { icon: any; text: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Icon name={icon} size={12} color={theme.colors.textTertiary} />
      <T variant="caption" tone="tertiary">
        {text}
      </T>
    </View>
  );
}
