import React, { useEffect, useCallback, useMemo } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../src/theme/ThemeProvider";
import { useSessionStore } from "../src/store/useSessionStore";
import { useDataStore } from "../src/store/useDataStore";
import { usePreferencesStore } from "../src/store/usePreferencesStore";
import { Screen } from "../src/components/ui/Screen";
import { T } from "../src/components/ui/Text";
import { Card } from "../src/components/ui/Card";
import { Icon } from "../src/components/ui/Icon";
import { Eyebrow, Chip, StatTile, StatRow } from "../src/components/ui/Stats";
import { colorForSubject, hexToRgba } from "../src/theme/palette";
import { formatDayLabel } from "../src/lib/format";

export default function CompetencesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const isDemo = useSessionStore((s) => s.isDemo);
  const { evaluations, loading, refreshAll } = useDataStore();
  const subjectColors = usePreferencesStore((s) => s.subjectColors);

  const sync = useCallback(() => {
    if (session) refreshAll(session);
  }, [session, refreshAll]);

  useEffect(() => {
    if (session && evaluations.length === 0) sync();
  }, [session]);

  const sorted = useMemo(
    () => [...(evaluations ?? [])].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [evaluations]
  );

  return (
    <Screen onRefresh={isDemo ? undefined : sync} refreshing={loading}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing(6) }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: theme.spacing(3) }}>
          <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Eyebrow color={theme.colors.accent}>Mon niveau</Eyebrow>
          <T variant="hero" style={{ marginTop: 2 }}>
            Compétences
          </T>
        </View>
      </View>

      {sorted.length > 0 ? (
        <View style={{ marginBottom: theme.spacing(5) }}>
          <StatRow>
            <StatTile label="Évaluations" value={String(sorted.length)} />
            <StatTile
              label="Compétences"
              value={String(sorted.reduce((acc, e) => acc + e.skills.length, 0))}
            />
            <StatTile label="Matières" value={String(new Set(sorted.map((e) => e.subject.name)).size)} />
          </StatRow>
        </View>
      ) : null}

      {sorted.length === 0 ? (
        <Card>
          <T variant="body" tone="secondary">
            Aucune évaluation de compétences pour l'instant.
          </T>
        </Card>
      ) : (
        <View style={{ gap: theme.spacing(4) }}>
          {sorted.map((e) => {
            const color = colorForSubject(e.subject.name, subjectColors);
            return (
              <Card key={e.id} padded>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 4, borderRadius: 2, backgroundColor: color, alignSelf: "stretch", marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                      <Chip color={color} label={e.subject.name} />
                      <Chip color={theme.colors.textTertiary} label={formatDayLabel(e.date)} />
                    </View>
                    <T variant="body" weight="semibold">
                      {e.name}
                    </T>
                    {e.description ? (
                      <T variant="caption" tone="secondary" style={{ marginTop: 4 }}>
                        {e.description}
                      </T>
                    ) : null}
                    <T variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
                      {e.teacher}
                    </T>

                    <View style={{ marginTop: theme.spacing(3), gap: theme.spacing(2) }}>
                      {e.skills.map((skill) => (
                        <View
                          key={skill.id}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingVertical: 6,
                            paddingHorizontal: 10,
                            borderRadius: theme.radius.sm,
                            backgroundColor: theme.colors.surfaceElevated,
                          }}
                        >
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <T variant="caption" numberOfLines={2}>
                              {skill.itemName ?? skill.pillarName}
                            </T>
                            <T variant="caption" tone="tertiary" numberOfLines={1}>
                              {skill.domainName}
                            </T>
                          </View>
                          <View
                            style={{
                              minWidth: 32,
                              height: 32,
                              paddingHorizontal: 6,
                              borderRadius: 9,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: hexToRgba(color, theme.isDark ? 0.16 : 0.1),
                              borderWidth: 1,
                              borderColor: hexToRgba(color, 0.24),
                            }}
                          >
                            <T style={{ color, fontSize: 12, fontWeight: "800" }}>
                              {skill.abbreviation}
                            </T>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
