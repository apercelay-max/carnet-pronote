import React, { useEffect, useMemo, useState } from "react";
import { View, Pressable, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../src/theme/ThemeProvider";
import { useSessionStore } from "../src/store/useSessionStore";
import { useDataStore } from "../src/store/useDataStore";
import { usePreferencesStore } from "../src/store/usePreferencesStore";
import { useFichesStore } from "../src/store/useFichesStore";
import { Screen } from "../src/components/ui/Screen";
import { T } from "../src/components/ui/Text";
import { Card } from "../src/components/ui/Card";
import { Icon } from "../src/components/ui/Icon";
import { Button } from "../src/components/ui/Button";
import { Eyebrow } from "../src/components/ui/Stats";
import { champStyle } from "../src/components/ui/champStyle";
import { colorForSubject, hexToRgba } from "../src/theme/palette";
import { formatDayLabel, formatShortDay } from "../src/lib/format";
import {
  chargerContenusPasses,
  contenusDepuisRessources,
  fusionnerContenus,
  type ContenuCours,
} from "../src/lib/contenusCours";

// Préparer un contrôle à partir de ce qui a VRAIMENT été fait en classe.
//
// Au lieu de demander à l'élève de recopier son cours, on part du cahier de
// textes Pronote : on récupère les contenus des dernières semaines pour la
// matière, l'élève décoche ce qui n'est pas au programme du contrôle, ajoute
// éventuellement ce que le prof a dit, et Gemini en tire une fiche complète
// + un plan de révision jour par jour jusqu'à la date du contrôle.

function isoDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function PreparerControleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ matiere?: string; date?: string }>();
  const revenir = () => (router.canGoBack() ? router.back() : router.replace("/revision" as any));

  const session = useSessionStore((s) => s.session);
  const isDemo = useSessionStore((s) => s.isDemo);
  const resources = useDataStore((s) => s.resources);
  const subjectColors = usePreferencesStore((s) => s.subjectColors);
  const creerFiche = useFichesStore((s) => s.creerFiche);

  const [passes, setPasses] = useState<ContenuCours[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const [matiere, setMatiere] = useState(params.matiere ?? "");
  const [date, setDate] = useState(params.date ?? "");
  const [chapitre, setChapitre] = useState("");
  const [exclus, setExclus] = useState<Set<string>>(new Set());
  const [ajout, setAjout] = useState("");

  useEffect(() => {
    if (!session || isDemo) return;
    let annule = false;
    setChargement(true);
    chargerContenusPasses(session)
      .then((c) => !annule && setPasses(c))
      .catch((e) => !annule && setErreur(`Pronote n'a pas renvoyé les cours passés : ${e?.message ?? e}`))
      .finally(() => !annule && setChargement(false));
    return () => {
      annule = true;
    };
  }, [session, isDemo]);

  // Cours passés + ceux déjà synchronisés (semaine en cours) : les contenus
  // du jour même doivent compter aussi.
  const contenus = useMemo(
    () => fusionnerContenus(passes, contenusDepuisRessources(resources ?? [])),
    [passes, resources]
  );

  const matieres = useMemo(() => {
    const compte = new Map<string, number>();
    contenus.forEach((c) => compte.set(c.matiere, (compte.get(c.matiere) ?? 0) + 1));
    if (params.matiere && !compte.has(params.matiere)) compte.set(params.matiere, 0);
    return [...compte.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [contenus, params.matiere]);

  const contenusMatiere = useMemo(() => contenus.filter((c) => c.matiere === matiere), [contenus, matiere]);
  const retenus = contenusMatiere.filter((c) => !exclus.has(c.id));

  const texteSource = useMemo(() => {
    const blocs = retenus
      .slice()
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((c) => `— ${formatDayLabel(c.date)} : ${c.titre}${c.texte ? `\n${c.texte}` : ""}`);
    if (ajout.trim()) blocs.push(`— Notes de l'élève :\n${ajout.trim()}`);
    return blocs.join("\n\n");
  }, [retenus, ajout]);

  const jours = useMemo(() => {
    const base = new Date();
    base.setHours(12, 0, 0, 0);
    return Array.from({ length: 21 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, []);

  const dateValide = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const pret = !!matiere && texteSource.length >= 40;

  const lancer = () => {
    const fiche = creerFiche({
      mode: "fiche",
      titre: chapitre.trim() || `Contrôle de ${matiere}`,
      matiere,
      texteSource,
      dateControle: dateValide ? date : undefined,
      source: "pronote",
    });
    router.replace(`/fiche/${fiche.id}?ia=1`);
  };

  const basculer = (id: string) =>
    setExclus((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const color = matiere ? colorForSubject(matiere, subjectColors) : theme.colors.accent;

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing(5) }}>
        <Pressable onPress={revenir} hitSlop={10} style={{ marginRight: theme.spacing(3) }}>
          <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Eyebrow color={theme.colors.accent}>Révision</Eyebrow>
          <T variant="hero" style={{ marginTop: 2 }}>
            Préparer un contrôle
          </T>
        </View>
      </View>

      <Card style={{ marginBottom: theme.spacing(5) }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Icon name="sparkle" size={18} color={theme.colors.accent} />
          <T variant="caption" tone="secondary" style={{ flex: 1, lineHeight: 18 }}>
            L'app récupère ce que ton prof a noté dans le cahier de textes Pronote ces dernières
            semaines. Gemini en fait une fiche complète (plan du chapitre, définitions, méthodes,
            quiz) et un plan de révision jour par jour jusqu'au contrôle.
          </T>
        </View>
      </Card>

      <View style={{ gap: theme.spacing(4), marginBottom: theme.spacing(5) }}>
        <View style={{ gap: 6 }}>
          <Eyebrow>Matière</Eyebrow>
          {chargement && matieres.length === 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 }}>
              <ActivityIndicator color={theme.colors.accent} />
              <T variant="caption" tone="secondary">
                Récupération des cours sur Pronote…
              </T>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingVertical: 2, paddingRight: 8 }}
            >
              {matieres.map(([m, n]) => {
                const c = colorForSubject(m, subjectColors);
                const on = matiere === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => {
                      setMatiere(m);
                      setExclus(new Set());
                    }}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: on ? c : theme.colors.border,
                      backgroundColor: on ? hexToRgba(c, 0.14) : "transparent",
                    }}
                  >
                    <T variant="caption" weight={on ? "semibold" : "regular"} style={{ color: on ? c : theme.colors.textSecondary }}>
                      {m} · {n}
                    </T>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          {/* Toujours possible de taper la matière : sans cours Pronote (démo,
              cahier de textes vide, synchro ratée) l'écran ne doit pas bloquer. */}
          <TextInput
            value={matiere}
            onChangeText={(m) => {
              setMatiere(m);
              setExclus(new Set());
            }}
            placeholder={matieres.length ? "Ou tape une matière" : "Tape la matière du contrôle"}
            placeholderTextColor={theme.colors.textTertiary}
            style={champStyle(theme)}
          />
          {erreur && (
            <T variant="caption" tone="danger">
              {erreur}
            </T>
          )}
        </View>

        <View style={{ gap: 6 }}>
          <Eyebrow>Date du contrôle (pour le plan de révision)</Eyebrow>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingVertical: 2, paddingRight: 8 }}
          >
            {jours.map((d) => {
              const iso = isoDay(d);
              const on = date === iso;
              return (
                <Pressable
                  key={iso}
                  onPress={() => setDate(on ? "" : iso)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: on ? theme.colors.accent : theme.colors.border,
                    backgroundColor: on ? theme.colors.accentSoft : "transparent",
                  }}
                >
                  <T
                    variant="caption"
                    weight={on ? "semibold" : "regular"}
                    style={{ color: on ? theme.colors.accent : theme.colors.textSecondary, textTransform: "capitalize" }}
                  >
                    {formatShortDay(d)}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ gap: 6 }}>
          <Eyebrow>Chapitre (facultatif)</Eyebrow>
          <TextInput
            value={chapitre}
            onChangeText={setChapitre}
            placeholder="Ex. La Révolution française"
            placeholderTextColor={theme.colors.textTertiary}
            style={champStyle(theme)}
          />
        </View>

        {matiere ? (
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Eyebrow color={color}>Cours à réviser</Eyebrow>
              <T variant="caption" tone="tertiary">
                {retenus.length} / {contenusMatiere.length} retenus
              </T>
            </View>
            {contenusMatiere.length === 0 ? (
              <Card>
                <T variant="caption" tone="secondary" style={{ lineHeight: 18 }}>
                  {chargement
                    ? "Récupération des cours sur Pronote…"
                    : "Rien dans le cahier de textes pour cette matière ces dernières semaines. Ajoute ton cours ou ce que le prof a annoncé ci-dessous."}
                </T>
              </Card>
            ) : (
              <View style={{ gap: 8 }}>
                <T variant="caption" tone="tertiary">
                  Décoche ce qui ne tombe pas au contrôle.
                </T>
                {contenusMatiere.map((c) => {
                  const on = !exclus.has(c.id);
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => basculer(c.id)}
                      style={{
                        flexDirection: "row",
                        gap: 10,
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: on ? hexToRgba(color, 0.4) : theme.colors.border,
                        backgroundColor: on ? hexToRgba(color, theme.isDark ? 0.1 : 0.06) : theme.colors.surface,
                        opacity: on ? 1 : 0.6,
                      }}
                    >
                      <Icon name={on ? "checkCircle" : "circle"} size={18} color={on ? color : theme.colors.textTertiary} />
                      <View style={{ flex: 1, gap: 3 }}>
                        <T variant="caption" weight="semibold" numberOfLines={2}>
                          {c.titre}
                        </T>
                        <T variant="caption" tone="tertiary">
                          {formatDayLabel(c.date)}
                        </T>
                        {!!c.texte && (
                          <T variant="caption" tone="secondary" numberOfLines={2}>
                            {c.texte}
                          </T>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        <View style={{ gap: 6 }}>
          <Eyebrow>Ce que le prof a dit / ton cours (facultatif)</Eyebrow>
          <TextInput
            value={ajout}
            onChangeText={setAjout}
            placeholder="Ex. « Savoir les dates, la DDHC et savoir faire un croquis »"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            textAlignVertical="top"
            style={[champStyle(theme), { minHeight: 90, lineHeight: 21 }]}
          />
        </View>
      </View>

      <Button label="Créer la fiche et le plan avec Gemini" icon="sparkle" onPress={lancer} disabled={!pret} />
      {!pret && matiere ? (
        <T variant="caption" tone="tertiary" style={{ marginTop: theme.spacing(2), textAlign: "center" }}>
          Pas assez de contenu : garde au moins un cours ou ajoute du texte.
        </T>
      ) : null}
    </Screen>
  );
}
