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
import { Eyebrow, Chip, BigStat, StatTile, StatRow, Bar } from "../../src/components/ui/Stats";
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

  // Chiffres calculés uniquement sur ce que Pronote fournit vraiment :
  // la durée estimée n'est comptée que pour les devoirs qui en ont une.
  const stats = useMemo(() => {
    const restants = assignments.filter((a) => !a.done);
    const minutes = restants.reduce((acc, a) => acc + (a.length ?? 0), 0);
    const avecDuree = restants.filter((a) => a.length).length;
    const urgents = restants.filter((a) => daysUntil(a.deadline) <= 1).length;
    return {
      total: assignments.length,
      restants: restants.length,
      faits: assignments.length - restants.length,
      minutes,
      avecDuree,
      urgents,
    };
  }, [assignments]);

  return (
    <Screen onRefresh={isDemo ? undefined : sync} refreshing={loading}>
      <View style={{ marginBottom: theme.spacing(5) }}>
        <Eyebrow color={theme.colors.accent}>Mon travail</Eyebrow>
        <T variant="hero" style={{ marginTop: 2 }}>
          Devoirs
        </T>
      </View>

      {assignments.length > 0 && (
        <Card elevated style={{ marginBottom: theme.spacing(4) }}>
          <Eyebrow color={theme.colors.accent}>Reste à faire</Eyebrow>
          <View style={{ marginTop: 8, marginBottom: 12 }}>
            <BigStat
              value={String(stats.restants)}
              unit={stats.restants > 1 ? "devoirs" : "devoir"}
            />
          </View>
          <View style={{ marginBottom: 12 }}>
            <Bar value={stats.total ? stats.faits / stats.total : 0} color={theme.colors.accent} />
          </View>
          <StatRow>
            <StatTile label="Faits" value={`${stats.faits} / ${stats.total}`} color={theme.colors.success} />
            <StatTile
              label="Urgents"
              value={String(stats.urgents)}
              color={stats.urgents > 0 ? theme.colors.danger : undefined}
            />
            {/* On n'affiche le temps estimé que si Pronote en donne un :
                sinon ce serait un "0 min" trompeur. */}
            <StatTile
              label="Temps"
              value={stats.avecDuree > 0 ? formatMinutes(stats.minutes) : "—"}
            />
          </StatRow>
          {stats.avecDuree > 0 && stats.avecDuree < stats.restants ? (
            <T variant="caption" tone="tertiary" style={{ marginTop: 8 }}>
              Temps estimé sur {stats.avecDuree} devoir{stats.avecDuree > 1 ? "s" : ""} seulement — les
              autres n'ont pas de durée indiquée par le prof.
            </T>
          ) : null}
        </Card>
      )}

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
          {groups.map(([dateKey, items]) => {
            const restants = items.filter((a) => !a.done).length;
            return (
              <View key={dateKey}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: theme.spacing(2),
                  }}
                >
                  {/* Rouge seulement s'il RESTE du travail à cette date : un jour
                      passé dont tout est fait n'a rien d'alarmant. */}
                  <Eyebrow
                    color={
                      restants > 0 && daysUntil(new Date(dateKey)) <= 1 ? theme.colors.danger : undefined
                    }
                  >
                    {formatDayLabel(new Date(dateKey))}
                  </Eyebrow>
                  <T variant="caption" tone="tertiary" weight="semibold">
                    {items.length - restants} / {items.length}
                  </T>
                </View>
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
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
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
  const niveau = assignment.difficulty as unknown as number;
  const difficulty = difficultyLabel(niveau);
  const difficultyColor =
    niveau === 3 ? theme.colors.danger : niveau === 2 ? theme.colors.warning : theme.colors.success;
  const jours = daysUntil(assignment.deadline);
  const urgent = !assignment.done && jours <= 1;

  return (
    <Card padded style={{ opacity: assignment.done ? 0.55 : 1 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing(3) }}>
        <Pressable onPress={onToggle} hitSlop={8}>
          <Icon
            name={assignment.done ? "checkCircle" : "circle"}
            size={22}
            color={assignment.done ? theme.colors.success : urgent ? theme.colors.danger : theme.colors.textTertiary}
          />
        </Pressable>

        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
            <T variant="caption" weight="semibold" style={{ color }} numberOfLines={1}>
              {assignment.subject.name}
            </T>
          </View>

          <T
            variant="body"
            style={
              assignment.done
                ? { textDecorationLine: "line-through", color: theme.colors.textTertiary, lineHeight: 21 }
                : { lineHeight: 21 }
            }
          >
            {assignment.description}
          </T>

          {/* Les métadonnées passent en puces teintées plutôt qu'en ligne de
              texte gris : c'est la présentation de PPL, et ça rend la
              difficulté lisible d'un coup d'œil grâce à la couleur. */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {showDate ? (
              <Chip
                color={urgent ? theme.colors.danger : theme.colors.textTertiary}
                label={formatDayLabel(assignment.deadline)}
              />
            ) : null}
            {assignment.length ? (
              <Chip color={theme.colors.textTertiary} label={`~${assignment.length} min`} />
            ) : null}
            {difficulty ? <Chip color={difficultyColor} label={difficulty} /> : null}
          </View>
        </View>
      </View>
    </Card>
  );
}
