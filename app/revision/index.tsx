import React, { useEffect, useMemo } from "react";
import { View, Pressable } from "react-native";
import { Link, useRouter } from "expo-router";
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming } from "react-native-reanimated";
import { useTheme } from "../../src/theme/ThemeProvider";
import { usePreferencesStore } from "../../src/store/usePreferencesStore";
import { useRevisionPreferencesStore } from "../../src/store/useRevisionPreferencesStore";
import { Screen } from "../../src/components/ui/Screen";
import { T } from "../../src/components/ui/Text";
import { Card } from "../../src/components/ui/Card";
import { Icon } from "../../src/components/ui/Icon";
import { Eyebrow, Chip, StatTile, StatRow, BarreMatiere, Bar } from "../../src/components/ui/Stats";
import { useProgressionStore, cartesDues, serieDeJours } from "../../src/store/useProgressionStore";
import { colorForSubject } from "../../src/theme/palette";
import { useFichesStore, type Fiche } from "../../src/store/useFichesStore";

const MODE_LABEL: Record<string, string> = {
  fiche: "Fiche",
  resume: "Résumé",
  points: "Points clés",
};

// Écran d'accueil de la section révision : le "front door" du petit site à
// part entière demandé — stats, action principale, liste des fiches. La
// création de résumés/points isolés (modes "resume"/"points") reste
// accessible depuis l'onglet Extensions de la barre globale, qui garde ses
// interrupteurs on/off ; ici on ne propose qu'une seule action claire.
export default function RevisionAccueilScreen() {
  const theme = useTheme();
  const router = useRouter();
  const fiches = useFichesStore((s) => s.fiches);
  const subjectColors = usePreferencesStore((s) => s.subjectColors);
  const animationsEnabled = useRevisionPreferencesStore((s) => s.animationsEnabled);

  const sessions = useProgressionStore((s) => s.sessions);
  const etatsCartes = useProgressionStore((s) => s.cartes);
  const nbDues = useMemo(() => cartesDues(fiches, etatsCartes).length, [fiches, etatsCartes]);

  // Progression : 30 derniers jours, réussite moyenne par matière et tendance
  // (dernière session vs moyenne). Calculé sur les vraies sessions jouées.
  const progression = useMemo(() => {
    const depuis = Date.now() - 30 * 86400000;
    const recentes = sessions.filter((s) => s.date >= depuis && s.total > 0);
    const parMatiere = new Map<string, { taux: number[] }>();
    recentes.forEach((s) => {
      const cle = s.matiere || "Autre";
      if (!parMatiere.has(cle)) parMatiere.set(cle, { taux: [] });
      parMatiere.get(cle)!.taux.push(s.sues / s.total);
    });
    const matieres = [...parMatiere.entries()]
      .map(([matiere, { taux }]) => ({
        matiere,
        n: taux.length,
        moyenne: taux.reduce((a, b) => a + b, 0) / taux.length,
        dernier: taux[taux.length - 1],
      }))
      .sort((a, b) => a.moyenne - b.moyenne);
    const semaine = sessions.filter((s) => s.date >= Date.now() - 7 * 86400000).length;
    const moyenneGlobale = recentes.length ? recentes.reduce((a, s) => a + s.sues / s.total, 0) / recentes.length : null;
    return { matieres, semaine, moyenneGlobale, serie: serieDeJours(sessions) };
  }, [sessions]);

  const parMode = useMemo(() => {
    const c: Record<string, number> = { fiche: 0, resume: 0, points: 0 };
    fiches.forEach((f) => (c[f.mode] = (c[f.mode] ?? 0) + 1));
    return c;
  }, [fiches]);

  return (
    <Screen>
      <View style={{ marginBottom: theme.spacing(5) }}>
        <Eyebrow color={theme.colors.accent}>Ton espace</Eyebrow>
        <T variant="hero" style={{ marginTop: 2 }}>
          Révision
        </T>
        <T variant="caption" tone="tertiary" style={{ marginTop: 6 }}>
          Tes fiches, tes flashcards et tes contrôles à venir, au même endroit.
        </T>
      </View>

      {fiches.length > 0 && (
        <View style={{ marginBottom: theme.spacing(5) }}>
          <StatRow>
            <StatTile label="Fiches" value={String(parMode.fiche ?? 0)} />
            <StatTile label="Résumés" value={String(parMode.resume ?? 0)} />
            <StatTile label="Points clés" value={String(parMode.points ?? 0)} />
          </StatRow>
        </View>
      )}

      <Pressable
        onPress={() => router.push("/fiche-nouvelle")}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 14,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.accent,
          marginBottom: theme.spacing(3),
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Icon name="plus" size={18} color="#FFFFFF" />
        <T variant="body" weight="semibold" style={{ color: "#FFFFFF" }}>
          Nouvelle fiche
        </T>
      </Pressable>

      {/* Deuxième entrée : partir des cours Pronote plutôt que d'un texte
          collé à la main — c'est le chemin le plus rapide avant un contrôle. */}
      <Pressable
        onPress={() => router.push("/preparer-controle" as any)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 13,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.accent,
          marginBottom: theme.spacing(6),
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Icon name="sparkle" size={17} color={theme.colors.accent} />
        <T variant="body" weight="semibold" style={{ color: theme.colors.accent }}>
          Préparer un contrôle avec mes cours
        </T>
      </Pressable>

      {nbDues > 0 ? (
        <Card elevated onPress={() => router.push("/revision/flashcards?fiche=revue")} style={{ marginBottom: theme.spacing(5) }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Icon name="refresh" size={20} color={theme.colors.accent} />
            <T variant="body" weight="semibold" style={{ flex: 1 }}>
              {nbDues} carte{nbDues > 1 ? "s" : ""} à revoir aujourd'hui
            </T>
            <Icon name="chevronRight" size={16} color={theme.colors.textTertiary} />
          </View>
        </Card>
      ) : null}

      {sessions.length > 0 ? (
        <View style={{ marginBottom: theme.spacing(6) }}>
          <View style={{ marginBottom: theme.spacing(3) }}>
            <Eyebrow>Ta progression</Eyebrow>
          </View>
          <Card>
            <StatRow>
              <StatTile
                label="Série"
                value={`${progression.serie} j`}
                color={progression.serie >= 3 ? theme.colors.success : undefined}
              />
              <StatTile label="Sessions 7 j" value={String(progression.semaine)} />
              <StatTile
                label="Réussite"
                value={progression.moyenneGlobale === null ? "—" : `${Math.round(progression.moyenneGlobale * 100)} %`}
              />
            </StatRow>
            {progression.matieres.length > 0 ? (
              <View style={{ gap: 12, marginTop: 16 }}>
                {progression.matieres.map((m) => {
                  const c = colorForSubject(m.matiere, subjectColors);
                  const tendance = m.n > 1 ? m.dernier - m.moyenne : 0;
                  return (
                    <View key={m.matiere} style={{ gap: 5 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <T variant="caption" weight="semibold" style={{ flex: 1, color: c }} numberOfLines={1}>
                          {m.matiere}
                        </T>
                        {Math.abs(tendance) >= 0.05 ? (
                          <Chip
                            color={tendance > 0 ? theme.colors.success : theme.colors.danger}
                            label={tendance > 0 ? "en progrès" : "en baisse"}
                          />
                        ) : null}
                        <T variant="caption" tone="tertiary">
                          {Math.round(m.moyenne * 100)} % · {m.n} session{m.n > 1 ? "s" : ""}
                        </T>
                      </View>
                      <Bar value={m.moyenne} color={c} />
                    </View>
                  );
                })}
                <T variant="caption" tone="tertiary">
                  Sur les 30 derniers jours. Les matières les plus fragiles sont en haut.
                </T>
              </View>
            ) : null}
          </Card>
        </View>
      ) : null}

      <View style={{ marginBottom: theme.spacing(3) }}>
        <Eyebrow>Mes fiches</Eyebrow>
      </View>

      <View style={{ gap: theme.spacing(3) }}>
        {fiches.map((f, i) => (
          <FicheRow
            key={f.id}
            index={i}
            animated={animationsEnabled}
            href={`/fiche/${f.id}`}
            fiche={f}
            color={colorForSubject(f.matiere, subjectColors)}
          />
        ))}

        {fiches.length === 0 && (
          <Card>
            <T variant="body" tone="secondary">
              Aucune fiche pour l'instant. Touche « Nouvelle fiche » pour créer la première.
            </T>
          </Card>
        )}
      </View>
    </Screen>
  );
}

function FicheRow({
  index,
  animated,
  href,
  fiche,
  color,
}: {
  index: number;
  animated: boolean;
  href: string;
  fiche: Fiche;
  color: string;
}) {
  const theme = useTheme();
  // Entrée échelonnée : chaque ligne apparaît ~40ms après la précédente au
  // lieu d'un affichage en bloc — c'est ce qui rend une liste "vivante"
  // plutôt que statique. Impératif (pas le prop `entering` déclaratif de
  // Reanimated, moins fiable sur react-native-web) et borné à 10 lignes pour
  // qu'une longue liste ne prenne pas des secondes à finir d'apparaître.
  const progress = useSharedValue(animated ? 0 : 1);
  useEffect(() => {
    const delay = Math.min(index, 10) * 40;
    progress.value = animated ? withDelay(delay, withTiming(1, { duration: 260 })) : 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const rowStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 10 }],
  }));

  return (
    <Link href={href} asChild>
      <Pressable>
        <Animated.View style={rowStyle}>
          <Card padded tint={color}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <BarreMatiere color={color} />
              <View style={{ flex: 1, gap: 5 }}>
                <T variant="body" weight="semibold" numberOfLines={1}>
                  {fiche.titre}
                </T>
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                  <Chip color={color} label={fiche.matiere} />
                  <Chip color={theme.colors.textTertiary} label={MODE_LABEL[fiche.mode] ?? fiche.mode} />
                </View>
              </View>
              <Icon name="chevronRight" size={16} color={theme.colors.textTertiary} />
            </View>
          </Card>
        </Animated.View>
      </Pressable>
    </Link>
  );
}
