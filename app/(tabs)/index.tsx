import React, { useEffect, useCallback, useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
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
import { formatGradeValue, formatTime, gradeOn20, formatDayLabel } from "../../src/lib/format";
import { nextSchoolDay } from "../../src/lib/sacDeCours";
import { GradeValue } from "pawnote";

export default function DashboardScreen() {
  const theme = useTheme();
  const session = useSessionStore((s) => s.session);
  const isDemo = useSessionStore((s) => s.isDemo);
  const displayName = useSessionStore((s) => s.displayName);
  const { grades, notebookData, timetable, assignments, evaluations, discussions, newsData, loading, refreshAll } =
    useDataStore();
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
            evaluations={evaluations}
            discussions={discussions}
            newsData={newsData}
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

function Widget({ id, grades, notebookData, timetable, assignments, evaluations, discussions, newsData, subjectColors }: any) {
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

  if (id === "controlesAVenir") {
    // Pronote marque directement sur l'emploi du temps les cours où il y aura
    // un contrôle (`test: true`) -- signal réel donné par le prof, rien
    // d'inventé ici.
    const now = new Date();
    const upcoming = (timetable?.classes ?? [])
      .filter((c: any) => c.is === "lesson" && c.test && c.startDate > now)
      .sort((a: any, b: any) => a.startDate - b.startDate)
      .slice(0, 4);

    return (
      <Card>
        <T variant="subtitle" style={{ marginBottom: theme.spacing(3) }}>
          Contrôles à venir
        </T>
        {upcoming.length === 0 ? (
          <T variant="body" tone="secondary">
            Aucun contrôle annoncé pour l'instant.
          </T>
        ) : (
          <View style={{ gap: theme.spacing(3) }}>
            {upcoming.map((c: any) => (
              <View key={c.id} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3) }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colorForSubject(c.subject?.name ?? "?", subjectColors),
                  }}
                />
                <View style={{ flex: 1 }}>
                  <T variant="body" numberOfLines={1}>
                    {c.subject?.name ?? "Cours"}
                  </T>
                  <T variant="caption" tone="secondary" numberOfLines={1} style={{ textTransform: "capitalize" }}>
                    {formatDayLabel(c.startDate)} · {formatTime(c.startDate)}
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
    return <VieScolaireWidget notebookData={notebookData} />;
  }

  if (id === "sacDeCours") {
    return <SacDeCoursWidget timetable={timetable} subjectColors={subjectColors} />;
  }

  if (id === "competences") {
    return <CompetencesWidget evaluations={evaluations} subjectColors={subjectColors} />;
  }

  if (id === "messagerie") {
    return <MessagerieWidget discussions={discussions} />;
  }

  if (id === "actualites") {
    return <ActualitesWidget newsData={newsData} />;
  }

  return null;
}

function SacDeCoursWidget({ timetable, subjectColors }: any) {
  const theme = useTheme();
  const router = useRouter();
  const subjectMaterials = usePreferencesStore((s) => s.subjectMaterials);
  const next = useMemo(() => nextSchoolDay(timetable), [timetable]);
  const missingCount = next
    ? next.subjects.filter((s) => !(subjectMaterials[s.name]?.length)).length
    : 0;

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing(3) }}>
        <T variant="subtitle" style={{ flex: 1 }}>
          Sac de cours
        </T>
        {next ? (
          <T variant="caption" tone="secondary" style={{ textTransform: "capitalize" }}>
            {formatDayLabel(next.date)}
          </T>
        ) : null}
      </View>
      {!next ? (
        <T variant="body" tone="secondary">
          Rien de prévu au-delà d'aujourd'hui pour l'instant.
        </T>
      ) : (
        <View style={{ gap: theme.spacing(3) }}>
          {next.subjects.map((s) => {
            const items = subjectMaterials[s.name] ?? [];
            return (
              <View key={s.id} style={{ flexDirection: "row", gap: theme.spacing(3) }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    marginTop: 6,
                    backgroundColor: colorForSubject(s.name, subjectColors),
                  }}
                />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="medium" numberOfLines={1}>
                    {s.name}
                  </T>
                  {items.length > 0 ? (
                    <T variant="caption" tone="secondary" numberOfLines={2}>
                      {items.join(" · ")}
                    </T>
                  ) : (
                    <T variant="caption" tone="tertiary">
                      Pas encore configuré
                    </T>
                  )}
                </View>
              </View>
            );
          })}
          {missingCount > 0 ? (
            <Pressable onPress={() => router.push("/reglages")} style={{ marginTop: theme.spacing(1) }}>
              <T variant="caption" tone="accent">
                Configurer le matériel dans Réglages →
              </T>
            </Pressable>
          ) : null}
        </View>
      )}
    </Card>
  );
}

function CompetencesWidget({ evaluations, subjectColors }: any) {
  const theme = useTheme();
  const router = useRouter();
  const latest = (evaluations ?? []).slice(0, 3);

  return (
    <Card onPress={() => router.push("/competences")}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing(3) }}>
        <T variant="subtitle" style={{ flex: 1 }}>
          Compétences évaluées
        </T>
        <Icon name="chevronRight" size={16} color={theme.colors.textTertiary} />
      </View>
      {latest.length === 0 ? (
        <T variant="body" tone="secondary">
          Aucune évaluation de compétences pour l'instant.
        </T>
      ) : (
        <View style={{ gap: theme.spacing(3) }}>
          {latest.map((e: any) => (
            <View key={e.id} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3) }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colorForSubject(e.subject?.name ?? "?", subjectColors),
                }}
              />
              <View style={{ flex: 1 }}>
                <T variant="body" numberOfLines={1}>
                  {e.subject?.name ?? "Matière"}
                </T>
                <T variant="caption" tone="secondary" numberOfLines={1}>
                  {e.name}
                </T>
              </View>
              <T variant="caption" tone="secondary">
                {e.skills.length} compét.
              </T>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function MessagerieWidget({ discussions }: any) {
  const theme = useTheme();
  const router = useRouter();
  const items = discussions?.items ?? [];
  const unread = items.reduce((sum: number, d: any) => sum + (d.numberOfMessagesUnread ?? 0), 0);
  const latest = [...items].sort((a: any, b: any) => b.date.getTime() - a.date.getTime()).slice(0, 3);

  return (
    <Card onPress={() => router.push("/messagerie")}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing(3) }}>
        <T variant="subtitle" style={{ flex: 1 }}>
          Messagerie
        </T>
        {unread > 0 ? <UnreadBadge count={unread} /> : null}
        <View style={{ marginLeft: unread > 0 ? 8 : 0 }}>
          <Icon name="chevronRight" size={16} color={theme.colors.textTertiary} />
        </View>
      </View>
      {latest.length === 0 ? (
        <T variant="body" tone="secondary">
          Aucune discussion pour l'instant.
        </T>
      ) : (
        <View style={{ gap: theme.spacing(3) }}>
          {latest.map((d: any) => (
            <View key={d.participantsMessageID} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3) }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: d.numberOfMessagesUnread > 0 ? theme.colors.accent : theme.colors.borderSoft,
                }}
              />
              <View style={{ flex: 1 }}>
                <T variant="body" weight={d.numberOfMessagesUnread > 0 ? "semibold" : "regular"} numberOfLines={1}>
                  {d.recipientName ?? d.creator ?? "Discussion"}
                </T>
                <T variant="caption" tone="secondary" numberOfLines={1}>
                  {d.subject}
                </T>
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function ActualitesWidget({ newsData }: any) {
  const theme = useTheme();
  const router = useRouter();
  const items = newsData?.items ?? [];
  const unread = items.filter((n: any) => !n.read).length;
  const latest = [...items].sort((a: any, b: any) => b.startDate.getTime() - a.startDate.getTime()).slice(0, 2);

  return (
    <Card onPress={() => router.push("/actualites")}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing(3) }}>
        <T variant="subtitle" style={{ flex: 1 }}>
          Actualités
        </T>
        {unread > 0 ? <UnreadBadge count={unread} /> : null}
        <View style={{ marginLeft: unread > 0 ? 8 : 0 }}>
          <Icon name="chevronRight" size={16} color={theme.colors.textTertiary} />
        </View>
      </View>
      {latest.length === 0 ? (
        <T variant="body" tone="secondary">
          Aucune actualité pour l'instant.
        </T>
      ) : (
        <View style={{ gap: theme.spacing(3) }}>
          {latest.map((n: any) => (
            <View key={n.id} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3) }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: !n.read ? theme.colors.accent : theme.colors.borderSoft,
                }}
              />
              <View style={{ flex: 1 }}>
                <T variant="body" weight={!n.read ? "semibold" : "regular"} numberOfLines={1}>
                  {n.title ?? "Actualité"}
                </T>
                <T variant="caption" tone="secondary" numberOfLines={1} style={{ textTransform: "capitalize" }}>
                  {formatDayLabel(n.startDate)}
                </T>
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function UnreadBadge({ count }: { count: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        paddingHorizontal: 6,
        backgroundColor: theme.colors.accent,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <T variant="caption" weight="semibold" style={{ color: "#0B0D12", fontSize: 11 }}>
        {count}
      </T>
    </View>
  );
}

function VieScolaireWidget({ notebookData }: any) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const obsCount = notebookData?.observations?.length ?? 0;
  const absCount = notebookData?.absences?.length ?? 0;
  const delayCount = notebookData?.delays?.length ?? 0;
  const punishCount = notebookData?.punishments?.length ?? 0;
  const total = obsCount + absCount + delayCount + punishCount;

  const items = expanded
    ? [
        ...(notebookData?.observations ?? []).map((o: any) => ({
          id: o.id,
          icon: "bell",
          date: o.date,
          text: o.name,
          sub: o.subject?.name,
        })),
        ...(notebookData?.absences ?? []).map((a: any) => ({
          id: a.id,
          icon: "warning",
          date: a.startDate,
          text: a.justified ? "Absence justifiée" : "Absence non justifiée",
          sub: a.reason,
        })),
        ...(notebookData?.delays ?? []).map((d: any) => ({
          id: d.id,
          icon: "clock",
          date: d.date,
          text: `Retard de ${d.minutes} min${d.justified ? " (justifié)" : ""}`,
          sub: d.reason,
        })),
        ...(notebookData?.punishments ?? []).map((p: any) => ({
          id: p.id,
          icon: "warning",
          date: p.dateGiven,
          text: p.title,
          sub: p.reasons?.[0],
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  return (
    <Card onPress={total > 0 ? () => setExpanded((e) => !e) : undefined}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing(3) }}>
        <T variant="subtitle" style={{ flex: 1 }}>
          Vie scolaire
        </T>
        {total > 0 ? (
          <Icon name={expanded ? "chevronUp" : "chevronDown"} size={16} color={theme.colors.textTertiary} />
        ) : null}
      </View>
      <View style={{ flexDirection: "row", gap: theme.spacing(5), flexWrap: "wrap" }}>
        <Stat icon="bell" value={obsCount} label="observations" />
        <Stat icon="warning" value={absCount} label="absences" />
        <Stat icon="clock" value={delayCount} label="retards" />
        <Stat icon="warning" value={punishCount} label="punitions" />
      </View>

      {expanded && items.length > 0 ? (
        <View style={{ marginTop: theme.spacing(4), gap: theme.spacing(3), borderTopWidth: 1, borderTopColor: theme.colors.borderSoft, paddingTop: theme.spacing(3) }}>
          {items.map((it) => (
            <View key={it.id} style={{ flexDirection: "row", gap: theme.spacing(3), alignItems: "flex-start" }}>
              <View style={{ marginTop: 2 }}>
                <Icon name={it.icon as any} size={14} color={theme.colors.textTertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="body" numberOfLines={2}>
                  {it.text}
                </T>
                <T variant="caption" tone="tertiary" style={{ textTransform: "capitalize" }}>
                  {formatDayLabel(it.date)}
                  {it.sub ? ` · ${it.sub}` : ""}
                </T>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
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
