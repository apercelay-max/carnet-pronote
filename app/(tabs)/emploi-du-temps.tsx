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
import { Eyebrow, Chip, StatTile, StatRow } from "../../src/components/ui/Stats";
import { colorForSubject } from "../../src/theme/palette";
import { formatTime, formatDayOfWeekLetter } from "../../src/lib/format";
import { ResourceContentCategory } from "pawnote";

const CATEGORY_LABELS: Record<number, string> = {
  [ResourceContentCategory.LESSON]: "Cours",
  [ResourceContentCategory.CORRECTION]: "Correction",
  [ResourceContentCategory.DST]: "Devoir sur table",
  [ResourceContentCategory.ORAL_INTERROGATION]: "Interrogation orale",
  [ResourceContentCategory.TD]: "Travaux dirigés",
  [ResourceContentCategory.TP]: "Travaux pratiques",
  [ResourceContentCategory.EVALUATION_COMPETENCES]: "Évaluation de compétences",
  [ResourceContentCategory.EPI]: "EPI",
  [ResourceContentCategory.AP]: "AP",
  [ResourceContentCategory.VISIO]: "Visio",
};

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
  const { timetable, resources, loading, refreshAll } = useDataStore();
  const subjectColors = usePreferencesStore((s) => s.subjectColors);

  const days = useMemo(weekDates, []);
  const todayIndex = days.findIndex((d) => isSameDay(d, new Date()));
  const [selected, setSelected] = useState(todayIndex >= 0 ? todayIndex : 0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Un contenu de cours correspond à un créneau précis de l'emploi du temps :
  // même matière, même horaire. Si Pronote n'a rien posté pour ce cours, pas
  // de contenu -- on ne montre le petit indicateur que si un match existe.
  function resourceForLesson(c: any) {
    return (resources ?? []).find(
      (r: any) => r.subject?.id === c.subject?.id && r.startDate.getTime() === c.startDate.getTime()
    );
  }

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

  // Résumé du jour affiché : uniquement des cours réels, annulés exclus du
  // temps passé en classe (sinon on gonflerait la journée avec des heures
  // qui n'ont pas lieu).
  const resumeJour = useMemo(() => {
    const lecons = classesForDay.filter((c: any) => c.is === "lesson");
    const actifs = lecons.filter((c: any) => !c.canceled);
    const minutes = actifs.reduce(
      (acc: number, c: any) => acc + (c.endDate.getTime() - c.startDate.getTime()) / 60000,
      0
    );
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return {
      cours: actifs.length,
      duree: minutes === 0 ? "—" : m === 0 ? `${h} h` : `${h} h ${m}`,
      evaluations: actifs.filter((c: any) => c.test).length,
      annules: lecons.filter((c: any) => c.canceled).length,
    };
  }, [classesForDay]);

  return (
    <Screen scroll={false}>
      <View style={{ paddingHorizontal: theme.spacing(4), paddingTop: theme.spacing(2) }}>
        <View style={{ marginBottom: theme.spacing(4) }}>
          <Eyebrow color={theme.colors.accent}>Ma semaine</Eyebrow>
          <T variant="hero" style={{ marginTop: 2 }}>
            Emploi du temps
          </T>
        </View>
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
        {classesForDay.length > 0 ? (
          <View style={{ marginBottom: theme.spacing(4) }}>
            <StatRow>
              <StatTile label="Cours" value={String(resumeJour.cours)} />
              <StatTile label="En classe" value={resumeJour.duree} />
              {resumeJour.evaluations > 0 ? (
                <StatTile label="Évals" value={String(resumeJour.evaluations)} color={theme.colors.warning} />
              ) : null}
              {resumeJour.annules > 0 ? (
                <StatTile label="Annulés" value={String(resumeJour.annules)} color={theme.colors.danger} />
              ) : null}
            </StatRow>
          </View>
        ) : null}
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
              const resource = isLesson ? resourceForLesson(c) : undefined;
              const hasContent = !!resource?.contents?.length;
              const expanded = expandedId === c.id;
              return (
                <Card
                  key={c.id}
                  padded
                  style={{ opacity: canceled ? 0.55 : 1 }}
                  onPress={hasContent ? () => setExpandedId(expanded ? null : c.id) : undefined}
                >
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
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <T variant="body" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
                          {name}
                        </T>
                        {canceled ? <Chip color={theme.colors.danger} label="Annulé" /> : null}
                        {isLesson && c.test && !canceled ? (
                          <Chip color={theme.colors.warning} label="Évaluation" />
                        ) : null}
                      </View>
                      <View style={{ flexDirection: "row", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                        {c.classrooms?.[0] ? (
                          <MetaTag icon="pin" text={c.classrooms[0]} />
                        ) : null}
                        {c.teacherNames?.[0] ? <MetaTag icon="user" text={c.teacherNames[0]} /> : null}
                        {hasContent ? <MetaTag icon="book" text="Contenu du cours" /> : null}
                      </View>
                    </View>
                    {hasContent ? (
                      <View style={{ justifyContent: "center" }}>
                        <Icon name={expanded ? "chevronUp" : "chevronDown"} size={14} color={theme.colors.textTertiary} />
                      </View>
                    ) : null}
                  </View>

                  {expanded && resource ? (
                    <View
                      style={{
                        marginTop: theme.spacing(3),
                        paddingTop: theme.spacing(3),
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.borderSoft,
                        gap: theme.spacing(3),
                      }}
                    >
                      {resource.contents.map((content: any) => (
                        <View key={content.id}>
                          <View style={{ marginBottom: 4 }}>
                            <Eyebrow color={theme.colors.accent}>
                              {CATEGORY_LABELS[content.category] ?? "Contenu"}
                            </Eyebrow>
                          </View>
                          {content.title ? (
                            <T variant="body" weight="medium">
                              {content.title}
                            </T>
                          ) : null}
                          {content.description ? (
                            <T variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                              {content.description}
                            </T>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : null}
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
