import React, { useMemo, useState } from "react";
import { View, Pressable, TextInput, ScrollView, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../src/theme/ThemeProvider";
import { useDataStore } from "../../src/store/useDataStore";
import { usePreferencesStore } from "../../src/store/usePreferencesStore";
import { Screen } from "../../src/components/ui/Screen";
import { T } from "../../src/components/ui/Text";
import { Card } from "../../src/components/ui/Card";
import { Icon } from "../../src/components/ui/Icon";
import { Button } from "../../src/components/ui/Button";
import { Eyebrow } from "../../src/components/ui/Stats";
import { champStyle } from "../../src/components/ui/champStyle";
import { colorForSubject, hexToRgba } from "../../src/theme/palette";
import { allKnownSubjects } from "../../src/lib/subjects";
import { formatShortDay } from "../../src/lib/format";
import { useLocalItemsStore } from "../../src/store/useLocalItemsStore";
import { todayISODay } from "../../src/lib/persoItems";

function isoDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function DevoirPersoScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  // Historique parfois vide sur le web / en deep-link : on retombe sur Devoirs.
  const revenir = () => (router.canGoBack() ? router.back() : router.replace("/devoirs"));

  const data = useDataStore();
  const subjectColors = usePreferencesStore((s) => s.subjectColors);
  const devoirsManuels = useLocalItemsStore((s) => s.devoirsManuels);
  const ajouter = useLocalItemsStore((s) => s.ajouterDevoirManuel);
  const modifier = useLocalItemsStore((s) => s.modifierDevoirManuel);
  const supprimer = useLocalItemsStore((s) => s.supprimerDevoirManuel);

  const existant = params.id ? devoirsManuels.find((d) => d.id === params.id) : undefined;

  const [titre, setTitre] = useState(existant?.titre ?? "");
  const [matiere, setMatiere] = useState(existant?.matiere ?? "");
  const [date, setDate] = useState(existant?.date ?? todayISODay());
  const [duree, setDuree] = useState(existant?.duree != null ? String(existant.duree) : "");
  const [note, setNote] = useState(existant?.note ?? "");

  const matieres = useMemo(
    () =>
      allKnownSubjects({
        grades: data.grades,
        timetable: data.timetable,
        assignments: data.assignments,
        evaluations: data.evaluations,
        resources: data.resources,
      }).map((s) => s.name),
    [data.grades, data.timetable, data.assignments, data.evaluations, data.resources]
  );

  const jours = useMemo(() => {
    const base = new Date();
    base.setHours(12, 0, 0, 0);
    return Array.from({ length: 21 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, []);

  const valide = titre.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

  const enregistrer = () => {
    const payload = {
      titre: titre.trim(),
      matiere: matiere.trim(),
      date,
      duree: duree.trim() ? Math.max(0, parseInt(duree, 10) || 0) : null,
      note: note.trim(),
    };
    if (existant) modifier(existant.id, payload);
    else ajouter(payload);
    revenir();
  };

  const confirmerSuppression = () => {
    if (!existant) return;
    Alert.alert("Supprimer ce devoir ?", "Il ne réapparaîtra pas.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => {
          supprimer(existant.id);
          revenir();
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing(5) }}>
        <Pressable onPress={() => revenir()} hitSlop={10} style={{ marginRight: theme.spacing(3) }}>
          <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <T variant="hero">{existant ? "Modifier le devoir" : "Devoir à la main"}</T>
      </View>

      <Card style={{ marginBottom: theme.spacing(5) }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Icon name="homework" size={18} color={theme.colors.accent} />
          <T variant="caption" tone="secondary" style={{ flex: 1, lineHeight: 18 }}>
            Pour un devoir que Pronote n'affiche pas — un exercice donné à l'oral, du travail pour
            une activité extra-scolaire… Il apparaît dans la liste des devoirs, avec une puce
            « Perso ».
          </T>
        </View>
      </Card>

      <View style={{ gap: theme.spacing(4), marginBottom: theme.spacing(5) }}>
        <View style={{ gap: 6 }}>
          <Eyebrow>Ce qu'il y a à faire</Eyebrow>
          <TextInput
            value={titre}
            onChangeText={setTitre}
            placeholder="Ex. Exercices 4 à 7 page 32"
            placeholderTextColor={theme.colors.textTertiary}
            style={champStyle(theme)}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Eyebrow>Matière (facultatif)</Eyebrow>
          {matieres.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingVertical: 2, paddingRight: 8 }}
            >
              {matieres.map((m) => {
                const color = colorForSubject(m, subjectColors);
                const on = matiere === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMatiere(on ? "" : m)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: on ? color : theme.colors.border,
                      backgroundColor: on ? hexToRgba(color, 0.14) : "transparent",
                    }}
                  >
                    <T variant="caption" weight={on ? "semibold" : "regular"} style={{ color: on ? color : theme.colors.textSecondary }}>
                      {m}
                    </T>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <TextInput
            value={matiere}
            onChangeText={setMatiere}
            placeholder="Ou tape une matière"
            placeholderTextColor={theme.colors.textTertiary}
            style={champStyle(theme)}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Eyebrow>Pour quand</Eyebrow>
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
                  onPress={() => setDate(iso)}
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
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="AAAA-MM-JJ"
            placeholderTextColor={theme.colors.textTertiary}
            style={champStyle(theme)}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Eyebrow>Durée estimée en minutes (facultatif)</Eyebrow>
          <TextInput
            value={duree}
            onChangeText={(t) => setDuree(t.replace(/[^0-9]/g, ""))}
            placeholder="Ex. 30"
            keyboardType="number-pad"
            placeholderTextColor={theme.colors.textTertiary}
            style={champStyle(theme)}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Eyebrow>Note (facultatif)</Eyebrow>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Un détail à ne pas oublier"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            textAlignVertical="top"
            style={[champStyle(theme), { minHeight: 70, lineHeight: 21 }]}
          />
        </View>
      </View>

      <Button label={existant ? "Enregistrer" : "Ajouter"} icon="check" onPress={enregistrer} disabled={!valide} />

      {existant ? (
        <Pressable onPress={confirmerSuppression} style={{ marginTop: theme.spacing(4), alignItems: "center" }}>
          <T variant="caption" tone="danger">
            Supprimer ce devoir
          </T>
        </Pressable>
      ) : null}
    </Screen>
  );
}
