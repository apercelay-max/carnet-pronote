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
import { SegmentedControl } from "../../src/components/ui/SegmentedControl";
import { SwatchPicker } from "../../src/components/ui/SwatchPicker";
import { champStyle } from "../../src/components/ui/champStyle";
import { colorForSubject, hexToRgba, SUBJECT_PALETTE } from "../../src/theme/palette";
import { allKnownSubjects } from "../../src/lib/subjects";
import { formatShortDay } from "../../src/lib/format";
import { useLocalItemsStore, type CreneauPerso } from "../../src/store/useLocalItemsStore";
import { JOURS_SEMAINE, todayISODay } from "../../src/lib/persoItems";

function isoDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const HHMM = /^([01]?\d|2[0-3]):[0-5]\d$/;

export default function CreneauPersoScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  const data = useDataStore();
  const subjectColors = usePreferencesStore((s) => s.subjectColors);
  const creneaux = useLocalItemsStore((s) => s.creneauxPerso);
  const ajouter = useLocalItemsStore((s) => s.ajouterCreneauPerso);
  const modifier = useLocalItemsStore((s) => s.modifierCreneauPerso);
  const supprimer = useLocalItemsStore((s) => s.supprimerCreneauPerso);

  const existant = params.id ? creneaux.find((c) => c.id === params.id) : undefined;

  // Sur le web (ou en deep-link) l'historique peut être vide : router.back()
  // lève alors « GO_BACK was not handled ». On retombe sur l'emploi du temps.
  const revenir = () => (router.canGoBack() ? router.back() : router.replace("/emploi-du-temps"));

  const [titre, setTitre] = useState(existant?.titre ?? "");
  const [matiere, setMatiere] = useState(existant?.matiere ?? "");
  const [couleur, setCouleur] = useState<string | null>(existant?.couleur ?? null);
  const [recurrence, setRecurrence] = useState<CreneauPerso["recurrence"]>(existant?.recurrence ?? "hebdo");
  const [jour, setJour] = useState<number>(existant?.jour ?? 1);
  const [date, setDate] = useState(existant?.date ?? todayISODay());
  const [debut, setDebut] = useState(existant?.debut ?? "18:00");
  const [fin, setFin] = useState(existant?.fin ?? "19:00");
  const [lieu, setLieu] = useState(existant?.lieu ?? "");

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

  const apercuCouleur = couleur ?? colorForSubject(matiere.trim() || titre.trim() || "?", subjectColors);

  const valide =
    titre.trim().length > 0 &&
    HHMM.test(debut) &&
    HHMM.test(fin) &&
    debut < fin &&
    (recurrence === "hebdo" ? jour >= 0 && jour <= 6 : /^\d{4}-\d{2}-\d{2}$/.test(date));

  const enregistrer = () => {
    const payload = {
      titre: titre.trim(),
      matiere: matiere.trim(),
      couleur,
      recurrence,
      date: recurrence === "ponctuel" ? date : null,
      jour: recurrence === "hebdo" ? jour : null,
      debut,
      fin,
      lieu: lieu.trim(),
    };
    if (existant) modifier(existant.id, payload);
    else ajouter(payload);
    revenir();
  };

  const confirmerSuppression = () => {
    if (!existant) return;
    Alert.alert("Supprimer ce créneau ?", "Il disparaîtra de l'emploi du temps.", [
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
        <T variant="hero">{existant ? "Modifier le créneau" : "Créneau perso"}</T>
      </View>

      <Card style={{ marginBottom: theme.spacing(5) }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Icon name="clock" size={18} color={theme.colors.accent} />
          <T variant="caption" tone="secondary" style={{ flex: 1, lineHeight: 18 }}>
            Un rendez-vous régulier ou ponctuel que Pronote ne connaît pas — foot, musique, sortie…
            Il s'affiche dans l'emploi du temps à son heure, mais ne compte pas dans le temps passé
            en classe.
          </T>
        </View>
      </Card>

      <View style={{ gap: theme.spacing(4), marginBottom: theme.spacing(5) }}>
        <View style={{ gap: 6 }}>
          <Eyebrow>Nom</Eyebrow>
          <TextInput
            value={titre}
            onChangeText={setTitre}
            placeholder="Ex. Entraînement de foot"
            placeholderTextColor={theme.colors.textTertiary}
            style={champStyle(theme)}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Eyebrow>Répétition</Eyebrow>
          <SegmentedControl
            value={recurrence}
            onChange={(v) => setRecurrence(v)}
            options={[
              { value: "hebdo", label: "Chaque semaine" },
              { value: "ponctuel", label: "Une seule fois" },
            ]}
          />
        </View>

        {recurrence === "hebdo" ? (
          <View style={{ gap: 6 }}>
            <Eyebrow>Jour</Eyebrow>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {JOURS_SEMAINE.map((nom, i) => {
                const on = jour === i;
                return (
                  <Pressable
                    key={nom}
                    onPress={() => setJour(i)}
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
                      style={{ color: on ? theme.colors.accent : theme.colors.textSecondary }}
                    >
                      {nom}
                    </T>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            <Eyebrow>Date</Eyebrow>
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
        )}

        <View style={{ flexDirection: "row", gap: theme.spacing(3) }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Eyebrow>Début</Eyebrow>
            <TextInput
              value={debut}
              onChangeText={setDebut}
              placeholder="18:00"
              placeholderTextColor={theme.colors.textTertiary}
              style={champStyle(theme)}
            />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Eyebrow>Fin</Eyebrow>
            <TextInput
              value={fin}
              onChangeText={setFin}
              placeholder="19:30"
              placeholderTextColor={theme.colors.textTertiary}
              style={champStyle(theme)}
            />
          </View>
        </View>
        {!(HHMM.test(debut) && HHMM.test(fin)) && (debut.length > 0 || fin.length > 0) ? (
          <T variant="caption" tone="tertiary">
            Format attendu : HH:MM (ex. 08:30, 17:45).
          </T>
        ) : HHMM.test(debut) && HHMM.test(fin) && debut >= fin ? (
          <T variant="caption" tone="tertiary">
            L'heure de fin doit être après l'heure de début.
          </T>
        ) : null}

        <View style={{ gap: 6 }}>
          <Eyebrow>Lieu (facultatif)</Eyebrow>
          <TextInput
            value={lieu}
            onChangeText={setLieu}
            placeholder="Ex. Gymnase municipal"
            placeholderTextColor={theme.colors.textTertiary}
            style={champStyle(theme)}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Eyebrow>Matière liée (facultatif)</Eyebrow>
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
        </View>

        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Eyebrow>Couleur</Eyebrow>
            {couleur ? (
              <Pressable onPress={() => setCouleur(null)}>
                <T variant="caption" tone="accent">
                  Couleur auto
                </T>
              </Pressable>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3) }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: apercuCouleur }} />
            <SwatchPicker
              size={24}
              selected={couleur ?? ""}
              onSelect={(c) => setCouleur(c)}
              swatches={SUBJECT_PALETTE.map((c) => ({ key: c, color: c }))}
            />
          </View>
        </View>
      </View>

      <Button label={existant ? "Enregistrer" : "Ajouter"} icon="check" onPress={enregistrer} disabled={!valide} />

      {existant ? (
        <Pressable onPress={confirmerSuppression} style={{ marginTop: theme.spacing(4), alignItems: "center" }}>
          <T variant="caption" tone="danger">
            Supprimer ce créneau
          </T>
        </Pressable>
      ) : null}
    </Screen>
  );
}
