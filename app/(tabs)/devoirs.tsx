import React, { useEffect, useCallback, useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { useTheme } from "../../src/theme/ThemeProvider";
import { useSessionStore } from "../../src/store/useSessionStore";
import { useDataStore } from "../../src/store/useDataStore";
import { usePreferencesStore } from "../../src/store/usePreferencesStore";
import { Screen } from "../../src/components/ui/Screen";
import { T } from "../../src/components/ui/Text";
import { Card } from "../../src/components/ui/Card";
import { Icon } from "../../src/components/ui/Icon";
import { SegmentedControl } from "../../src/components/ui/SegmentedControl";
import { colorForSubject } from "../../src/theme/palette";
import { formatDayLabel } from "../../src/lib/format";
import type { Assignment } from "pawnote";

// Pronote donne un vrai signal de difficulté par devoir (mis par le prof) et
// une durée estimée. On s'en sert pour un classement par importance honnête
// -- pas de note inventée, juste ces deux signaux + l'urgence de la date.
function difficultyLabel(d: number): string | null {
  if (d === 1) return "Facile";
  if (d === 2) return "Moyen";
  if (d === 3) return "Difficile";
  return null;
}

function daysUntil(deadline: Date): number {
  const now = new Date();
  const ms = new Date(deadline).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0);
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function importanceScore(a: Assignment): number {
  const urgencyDays = Math.max(0, daysUntil(a.deadline));
  const urgencyScore = Math.max(0, 10 - urgencyDays); // dû aujourd'hui/demain = urgent
  const difficultyScore = (a.difficulty ?? 0) * 3; // 0 à 9
  const lengthScore = a.length ? Math.min(3, a.length / 30) : 0; // devoirs longs comptent un peu plus
  return urgencyScore + difficultyScore + lengthScore;
}

type SortMode = "date" | "importance";

export default function DevoirsScreen() {
  const theme = useTheme();
  const session = useSessionStore((s) => s.session);
  const isDemo = useSessionStore((s) => s.isDemo);
  const { assignments, loading, refreshAll, toggleAssignmentDone } = useDataStore();
  const subjectColors = usePreferencesStore((s) => s.subjectColors);
  const [sortMode, setSortMode] = useState<SortMode>("date");

  const sync = useCallback(() => {
    if (session) refreshAll(session);
  }, [session, refreshAll]);

  useEffect(() => {
    if (session && assignments.length === 0) sync();
  }, [session]);

  const groups = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
      const key = a.deadline.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries()).sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );
  }, [assignments]);

  const byImportance = useMemo(() => {
    const todo = assignments.filter((a) => !a.done);
    const done = assignments.filter((a) => a.done);
    todo.sort((a, b) => importanceScore(b) - importanceScore(a));
    done.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
    return [...todo, ...done];
  }, [assignments]);

  const remaining = assignments.filter((a) => !a.done).length;

  return (
    <Screen onRefresh={isDemo ? undefined : sync} refreshing={loading}>
      <T variant="hero" style={{ marginBottom: 4 }}>
        Devoirs
      </T>
      <T variant="body" tone="secondary" style={{ marginBottom: theme.spacing(4) }}>
        {remaining === 0 ? "Tout est fait, bravo." : `${remaining} devoir${remaining > 1 ? "s" : ""} à faire`}
      </T>

      {assignments.length > 0 ? (
        <View style={{ marginBottom: theme.spacing(5) }}>
          <SegmentedControl
            value={sortMode}
            onChange={setSortMode}
            options={[
              { value: "date", label: "Par date" },
              { value: "importance", label: "Par importance" },
            ]}
          />
        </View>
      ) : null}

      {groups.length === 0 ? (
        <Card>
          <T variant="body" tone="secondary">
            Rien à rendre pour l'instant.
          </T>
        </Card>
      ) : sortMode === "importance" ? (
        <View style={{ gap: theme.spacing(2.5) }}>
          {byImportance.map((a) => (
            <AssignmentRow
              key={a.id}
              assignment={a}
              color={colorForSubject(a.subject.name, subjectColors)}
              onToggle={() => toggleAssignmentDone(session, a.id, !a.done)}
              showDate
            />
          ))}
        </View>
      ) : (
        <View style={{ gap: theme.spacing(6) }}>
          {groups.map(([dateKey, items]) => (
            <View key={dateKey}>
              <T variant="caption" tone="secondary" weight="semibold" style={{ marginBottom: theme.spacing(2), textTransform: "capitalize" }}>
                {formatDayLabel(new Date(dateKey))}
              </T>
              <View style={{ gap: theme.spacing(2.5) }}>
                {items.map((a) => (
                  <AssignmentRow
                    key={a.id}
                    assignment={a}
                    color={colorForSubject(a.subject.name, subjectColors)}
                    onToggle={() => toggleAssignmentDone(session, a.id, !a.done)}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

function AssignmentRow({
  assignment,
  color,
  onToggle,
  showDate = false,
}: {
  assignment: Assignment;
  color: string;
  onToggle: () => void;
  showDate?: boolean;
}) {
  const theme = useTheme();
  const difficulty = difficultyLabel(assignment.difficulty as unknown as number);
  const metaBits = [
    showDate ? formatDayLabel(assignment.deadline) : null,
    assignment.length ? `~${assignment.length} min` : null,
    difficulty,
  ].filter(Boolean);

  return (
    <Card padded style={{ opacity: assignment.done ? 0.55 : 1 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing(3) }}>
        <Pressable onPress={onToggle} hitSlop={8}>
          <Icon
            name={assignment.done ? "checkCircle" : "circle"}
            size={22}
            color={assignment.done ? theme.colors.success : theme.colors.textTertiary}
          />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
            <T variant="caption" weight="semibold" style={{ color }}>
              {assignment.subject.name}
            </T>
          </View>
          <T
            variant="body"
            style={assignment.done ? { textDecorationLine: "line-through", color: theme.colors.textTertiary } : undefined}
          >
            {assignment.description}
          </T>
          {metaBits.length > 0 ? (
            <T variant="caption" tone="tertiary" style={{ marginTop: 2, textTransform: "capitalize" }}>
              {metaBits.join(" · ")}
            </T>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
