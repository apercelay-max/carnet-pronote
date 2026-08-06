import React, { useEffect, useCallback, useMemo } from "react";
import { View, Pressable } from "react-native";
import { useTheme } from "../../src/theme/ThemeProvider";
import { useSessionStore } from "../../src/store/useSessionStore";
import { useDataStore } from "../../src/store/useDataStore";
import { usePreferencesStore } from "../../src/store/usePreferencesStore";
import { Screen } from "../../src/components/ui/Screen";
import { T } from "../../src/components/ui/Text";
import { Card } from "../../src/components/ui/Card";
import { Icon } from "../../src/components/ui/Icon";
import { colorForSubject } from "../../src/theme/palette";
import { formatDayLabel } from "../../src/lib/format";
import type { Assignment } from "pawnote";

export default function DevoirsScreen() {
  const theme = useTheme();
  const session = useSessionStore((s) => s.session);
  const isDemo = useSessionStore((s) => s.isDemo);
  const { assignments, loading, refreshAll, toggleAssignmentDone } = useDataStore();
  const subjectColors = usePreferencesStore((s) => s.subjectColors);

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

  const remaining = assignments.filter((a) => !a.done).length;

  return (
    <Screen onRefresh={isDemo ? undefined : sync} refreshing={loading}>
      <T variant="hero" style={{ marginBottom: 4 }}>
        Devoirs
      </T>
      <T variant="body" tone="secondary" style={{ marginBottom: theme.spacing(6) }}>
        {remaining === 0 ? "Tout est fait, bravo." : `${remaining} devoir${remaining > 1 ? "s" : ""} à faire`}
      </T>

      {groups.length === 0 ? (
        <Card>
          <T variant="body" tone="secondary">
            Rien à rendre pour l'instant.
          </T>
        </Card>
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
}: {
  assignment: Assignment;
  color: string;
  onToggle: () => void;
}) {
  const theme = useTheme();
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
          {assignment.length ? (
            <T variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
              ~{assignment.length} min
            </T>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
