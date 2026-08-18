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
import { Eyebrow, Chip, BigStat, StatTile, StatRow } from "../src/components/ui/Stats";
import { colorForSubject, hexToRgba } from "../src/theme/palette";
import { formatDayLabel, formatTime } from "../src/lib/format";
import { useFichesStore } from "../src/store/useFichesStore";

function joursAvant(d: Date): number {
  const ms = new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function libelleDelai(jours: number): string {
  if (jours <= 0) return "Aujourd'hui";
  if (jours === 1) return "Demain";
  if (jours < 7) return `Dans ${jours} jours`;
  if (jours < 14) return "Dans 1 semaine";
  return `Dans ${Math.round(jours / 7)} semaines`;
}

export default function ControlesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const isDemo = useSessionStore((s) => s.isDemo);
  const { timetable, loading, refreshAll } = useDataStore();
  const subjectColors = usePreferencesStore((s) => s.subjectColors);
  const fiches = useFichesStore((s) => s.fiches);

  const sync = useCallback(() => {
    if (session) refreshAll(session);
  }, [session, refreshAll]);

  useEffect(() => {
    if (session && !timetable) sync();
  }, [session]);

  // Source unique : les cours que Pronote marque `test: true` sur l'emploi du
  // temps. C'est le prof qui pose ce drapeau, donc c'est un vrai signal — on
  // n'essaie pas de deviner des contrôles à partir des devoirs.
  //
  // Limite assumée, dite dans l'écran : l'emploi du temps n'est chargé que sur
  // 21 jours, donc rien au-delà n'apparaîtra ici.
  const controles = useMemo(() => {
    const now = new Date();
    return (timetable?.classes ?? [])
      .filter((c: any) => c.is === "lesson" && c.test && !c.canceled && c.startDate > now)
      .sort((a: any, b: any) => a.startDate.getTime() - b.startDate.getTime())
      .map((c: any) => {
        const matiere = c.subject?.name ?? "Cours";
        // "Prêt" = il existe au moins une fiche pour cette matière. C'est un
        // indicateur volontairement simple : l'app ne peut pas savoir si la
        // fiche couvre vraiment le chapitre du contrôle.
        const fichesMatiere = fiches.filter((f) => f.matiere === matiere);
        return {
          id: c.id,
          matiere,
          date: c.startDate as Date,
          salle: c.classrooms?.[0] as string | undefined,
          jours: joursAvant(c.startDate),
          fiches: fichesMatiere,
        };
      });
  }, [timetable, fiches]);

  const prochain = controles[0];
  const prets = controles.filter((c) => c.fiches.length > 0).length;
  const cetteSemaine = controles.filter((c) => c.jours <= 7).length;

  return (
    <Screen onRefresh={isDemo ? undefined : sync} refreshing={loading}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: theme.spacing(5) }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: theme.spacing(3), marginTop: 6 }}>
          <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Eyebrow color={theme.colors.accent}>Compte à rebours</Eyebrow>
          <T variant="hero" style={{ marginTop: 2 }}>
            Contrôles
          </T>
        </View>
      </View>

      {controles.length === 0 ? (
        <Card>
          <T variant="body" tone="secondary" style={{ lineHeight: 21 }}>
            Aucun contrôle annoncé dans les 3 prochaines semaines. Un contrôle n'apparaît ici que si
            ton prof l'a marqué sur l'emploi du temps Pronote.
          </T>
        </Card>
      ) : (
        <>
          {prochain ? (
            <Card elevated style={{ marginBottom: theme.spacing(4) }}>
              <Eyebrow color={colorForSubject(prochain.matiere, subjectColors)}>Le prochain</Eyebrow>
              <View style={{ marginTop: 8, marginBottom: 6 }}>
                <BigStat
                  value={prochain.jours <= 0 ? "Auj." : String(prochain.jours)}
                  unit={prochain.jours <= 0 ? "" : prochain.jours > 1 ? "jours" : "jour"}
                />
              </View>
              <T variant="body" weight="semibold" style={{ marginBottom: 12 }}>
                {prochain.matiere} · {formatTime(prochain.date)}
              </T>
              <StatRow>
                <StatTile label="À venir" value={String(controles.length)} />
                <StatTile label="Cette semaine" value={String(cetteSemaine)} />
                <StatTile
                  label="Avec fiche"
                  value={`${prets} / ${controles.length}`}
                  color={prets === controles.length ? theme.colors.success : theme.colors.warning}
                />
              </StatRow>
            </Card>
          ) : null}

          <View style={{ marginBottom: theme.spacing(3) }}>
            <Eyebrow>Tous les contrôles</Eyebrow>
          </View>

          <View style={{ gap: theme.spacing(3), marginBottom: theme.spacing(5) }}>
            {controles.map((c) => {
              const color = colorForSubject(c.matiere, subjectColors);
              const pret = c.fiches.length > 0;
              const urgent = c.jours <= 2;
              return (
                <Card key={c.id} tint={color} padded>
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <T variant="body" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
                        {c.matiere}
                      </T>
                      <Chip
                        color={urgent ? theme.colors.danger : theme.colors.textTertiary}
                        label={libelleDelai(c.jours)}
                      />
                    </View>

                    <T variant="caption" tone="tertiary">
                      {formatDayLabel(c.date)} · {formatTime(c.date)}
                      {c.salle ? ` · ${c.salle}` : ""}
                    </T>

                    {/* État de révision : on ne prétend pas savoir si la fiche
                        couvre le bon chapitre, seulement s'il en existe une. */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                      <Icon
                        name={pret ? "checkCircle" : "circle"}
                        size={16}
                        color={pret ? theme.colors.success : theme.colors.warning}
                      />
                      <T variant="caption" style={{ flex: 1, color: pret ? theme.colors.success : theme.colors.warning }}>
                        {pret
                          ? `${c.fiches.length} fiche${c.fiches.length > 1 ? "s" : ""} dans cette matière`
                          : "Aucune fiche pour cette matière"}
                      </T>
                    </View>

                    <Pressable
                      onPress={() =>
                        pret
                          ? router.push(`/fiche/${c.fiches[0].id}`)
                          : router.push(`/fiche-nouvelle?mode=fiche`)
                      }
                      style={{
                        marginTop: 4,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        paddingVertical: 9,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: hexToRgba(color, 0.25),
                        backgroundColor: hexToRgba(color, theme.isDark ? 0.1 : 0.07),
                      }}
                    >
                      <Icon name={pret ? "book" : "plus"} size={15} color={color} />
                      <T variant="caption" weight="semibold" style={{ color }}>
                        {pret ? "Ouvrir ma fiche" : "Créer une fiche"}
                      </T>
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>

          <Card>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Icon name="warning" size={18} color={theme.colors.warning} />
              <T variant="caption" tone="secondary" style={{ flex: 1, lineHeight: 18 }}>
                Seuls les cours marqués « évaluation » par ton prof dans Pronote apparaissent ici, et
                l'emploi du temps n'est chargé que sur 3 semaines. Un contrôle annoncé à l'oral et non
                saisi dans Pronote restera invisible.
              </T>
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}
