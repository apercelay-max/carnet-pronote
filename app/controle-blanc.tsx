import React, { useEffect, useState } from "react";
import { View, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../src/theme/ThemeProvider";
import { useFichesStore } from "../src/store/useFichesStore";
import { useGeminiStore } from "../src/store/useGeminiStore";
import { useProgressionStore } from "../src/store/useProgressionStore";
import { usePreferencesStore } from "../src/store/usePreferencesStore";
import { Screen } from "../src/components/ui/Screen";
import { T } from "../src/components/ui/Text";
import { Card } from "../src/components/ui/Card";
import { Icon } from "../src/components/ui/Icon";
import { Button } from "../src/components/ui/Button";
import { Eyebrow, Bar } from "../src/components/ui/Stats";
import { champStyle } from "../src/components/ui/champStyle";
import { colorForSubject, hexToRgba } from "../src/theme/palette";
import { genererSujet, corrigerCopie, type SujetBlanc, type CorrectionBlanc } from "../src/lib/controleBlanc";
import { GeminiNotConfiguredError } from "../src/lib/gemini";

type Etape = "sujet" | "copie" | "correction" | "resultat";

export default function ControleBlancScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { fiche: ficheId } = useLocalSearchParams<{ fiche: string }>();
  const fiche = useFichesStore((s) => s.fiches.find((f) => f.id === ficheId));
  const subjectColors = usePreferencesStore((s) => s.subjectColors);
  const enregistrerSession = useProgressionStore((s) => s.enregistrerSession);
  const revenir = () => (router.canGoBack() ? router.back() : router.replace("/revision" as any));

  const [etape, setEtape] = useState<Etape>("sujet");
  const [sujet, setSujet] = useState<SujetBlanc | null>(null);
  const [reponses, setReponses] = useState<string[]>([]);
  const [correction, setCorrection] = useState<CorrectionBlanc | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const cle = async () => {
    if (!useGeminiStore.getState().keyLoaded) await useGeminiStore.getState().loadKey();
    return useGeminiStore.getState().apiKey;
  };

  const message = (err: any) =>
    err instanceof GeminiNotConfiguredError
      ? "Gemini n'est pas configuré. Ajoute ta clé dans l'assistant, puis réessaie."
      : err?.message ?? "Gemini n'a pas répondu.";

  const nouveauSujet = async () => {
    if (!fiche) return;
    setEtape("sujet");
    setErreur(null);
    setCorrection(null);
    try {
      const s = await genererSujet(fiche, await cle());
      setSujet(s);
      setReponses(s.questions.map(() => ""));
      setEtape("copie");
    } catch (err) {
      setErreur(message(err));
    }
  };

  const rendre = async () => {
    if (!fiche || !sujet) return;
    setEtape("correction");
    setErreur(null);
    try {
      const c = await corrigerCopie(fiche, sujet, reponses, await cle());
      setCorrection(c);
      setEtape("resultat");
      enregistrerSession({ ficheId: fiche.id, matiere: fiche.matiere, sues: c.note, total: 20, type: "blanc" });
    } catch (err) {
      setErreur(message(err));
      setEtape("copie");
    }
  };

  useEffect(() => {
    if (fiche && !sujet) nouveauSujet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiche?.id]);

  if (!fiche) {
    return (
      <Screen>
        <Pressable onPress={revenir} hitSlop={10} style={{ marginBottom: theme.spacing(4) }}>
          <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Card>
          <T variant="body" tone="secondary">
            Cette fiche n'existe plus.
          </T>
        </Card>
      </Screen>
    );
  }

  const color = colorForSubject(fiche.matiere, subjectColors);
  const nbRepondues = reponses.filter((r) => r.trim()).length;

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: theme.spacing(4) }}>
        <Pressable onPress={revenir} hitSlop={10} style={{ marginRight: theme.spacing(3), marginTop: 6 }}>
          <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Eyebrow color={color}>{`Contrôle blanc · ${fiche.matiere}`}</Eyebrow>
          <T variant="hero" style={{ marginTop: 2 }} numberOfLines={2}>
            {fiche.titre}
          </T>
        </View>
      </View>

      {erreur && (
        <Card style={{ marginBottom: theme.spacing(4) }}>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Icon name="warning" size={18} color={theme.colors.warning} />
              <T variant="caption" tone="secondary" style={{ flex: 1, lineHeight: 18 }}>
                {erreur}
              </T>
            </View>
            {etape === "sujet" && <Button label="Réessayer" icon="refresh" variant="secondary" onPress={nouveauSujet} />}
          </View>
        </Card>
      )}

      {(etape === "sujet" && !erreur) || etape === "correction" ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <ActivityIndicator color={color} />
            <T variant="caption" tone="secondary" style={{ flex: 1 }}>
              {etape === "sujet" ? "Gemini prépare ton sujet…" : "Gemini corrige ta copie…"}
            </T>
          </View>
        </Card>
      ) : null}

      {etape === "copie" && sujet && (
        <>
          <Card style={{ marginBottom: theme.spacing(4) }}>
            <T variant="caption" tone="secondary" style={{ lineHeight: 18 }}>
              {sujet.consigne || "Réponds aux questions sans regarder ta fiche."} Environ 30 minutes, noté sur 20.
              Tes réponses seront envoyées à Gemini pour la correction.
            </T>
          </Card>
          <View style={{ gap: theme.spacing(4), marginBottom: theme.spacing(5) }}>
            {sujet.questions.map((q, i) => (
              <View key={i} style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <T variant="body" weight="semibold" style={{ flex: 1, lineHeight: 21 }}>
                    {i + 1}. {q.question}
                  </T>
                  <T variant="caption" tone="tertiary">
                    /{q.points}
                  </T>
                </View>
                <TextInput
                  value={reponses[i]}
                  onChangeText={(t) => setReponses((r) => r.map((x, j) => (j === i ? t : x)))}
                  placeholder="Ta réponse"
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                  textAlignVertical="top"
                  style={[champStyle(theme), { minHeight: 80, lineHeight: 21 }]}
                />
              </View>
            ))}
          </View>
          <Button
            label={`Rendre ma copie (${nbRepondues}/${sujet.questions.length})`}
            icon="check"
            onPress={rendre}
            disabled={nbRepondues === 0}
          />
        </>
      )}

      {etape === "resultat" && sujet && correction && (
        <>
          <Card elevated style={{ marginBottom: theme.spacing(4) }}>
            <Eyebrow color={color}>Ta note</Eyebrow>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: 8, marginBottom: 10 }}>
              <T style={{ fontSize: 46 * theme.fontScale, fontWeight: "800", letterSpacing: -1.5, color }}>
                {correction.note.toLocaleString("fr-FR")}
              </T>
              <T variant="body" tone="tertiary" style={{ marginBottom: 8 }}>
                / 20
              </T>
            </View>
            <Bar value={correction.note / 20} color={correction.note >= 10 ? theme.colors.success : theme.colors.danger} />
            {!!correction.appreciation && (
              <T variant="body" style={{ marginTop: 12, lineHeight: 21 }}>
                {correction.appreciation}
              </T>
            )}
          </Card>

          <View style={{ gap: theme.spacing(3), marginBottom: theme.spacing(4) }}>
            {sujet.questions.map((q, i) => {
              const c = correction.parQuestion[i];
              const plein = c.points >= q.points;
              const teinte = plein ? theme.colors.success : c.points === 0 ? theme.colors.danger : theme.colors.warning;
              return (
                <Card key={i}>
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <T variant="body" weight="semibold" style={{ flex: 1, lineHeight: 21 }}>
                        {i + 1}. {q.question}
                      </T>
                      <T variant="body" weight="semibold" style={{ color: teinte }}>
                        {c.points}/{q.points}
                      </T>
                    </View>
                    <T variant="caption" tone="tertiary" style={{ lineHeight: 18 }}>
                      Ta réponse : {reponses[i]?.trim() || "(vide)"}
                    </T>
                    {!!c.commentaire && (
                      <T variant="caption" tone="secondary" style={{ lineHeight: 18 }}>
                        {c.commentaire}
                      </T>
                    )}
                    <View style={{ padding: 10, borderRadius: 10, backgroundColor: hexToRgba(color, theme.isDark ? 0.12 : 0.08) }}>
                      <T variant="caption" style={{ lineHeight: 18 }}>
                        <T variant="caption" weight="semibold">
                          Correction :{" "}
                        </T>
                        {c.correction}
                      </T>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>

          {correction.aRevoir.length > 0 && (
            <Card style={{ marginBottom: theme.spacing(4) }}>
              <Eyebrow color={color}>À revoir</Eyebrow>
              <View style={{ gap: 6, marginTop: 8 }}>
                {correction.aRevoir.map((a, i) => (
                  <T key={i} variant="body" style={{ lineHeight: 21 }}>
                    • {a}
                  </T>
                ))}
              </View>
            </Card>
          )}

          <View style={{ gap: theme.spacing(3) }}>
            <Button label="Un autre sujet" icon="refresh" onPress={nouveauSujet} />
            <Button label="Retour à la fiche" variant="secondary" onPress={revenir} />
          </View>
        </>
      )}
    </Screen>
  );
}
