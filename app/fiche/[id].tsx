import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../src/theme/ThemeProvider";
import { usePreferencesStore } from "../../src/store/usePreferencesStore";
import { useRevisionPreferencesStore } from "../../src/store/useRevisionPreferencesStore";
import { Screen } from "../../src/components/ui/Screen";
import { T } from "../../src/components/ui/Text";
import { Card } from "../../src/components/ui/Card";
import { Icon } from "../../src/components/ui/Icon";
import { Eyebrow, Chip } from "../../src/components/ui/Stats";
import { colorForSubject, hexToRgba } from "../../src/theme/palette";
import { useFichesStore } from "../../src/store/useFichesStore";
import { useGeminiStore } from "../../src/store/useGeminiStore";
import { genererFicheIA, cartesDeFiche, type FicheIA } from "../../src/lib/ficheGemini";
import { GeminiNotConfiguredError } from "../../src/lib/gemini";

// Confort de lecture (Réglages > section révision) : un cran de plus que le
// réglage général de l'appli, appliqué seulement au texte des fiches — la
// lecture quotidienne toute l'année mérite son propre réglage.
const READING_SCALE: Record<string, number> = { sm: 0.92, md: 1, lg: 1.14 };

export default function FicheScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id, ia: iaDemandee } = useLocalSearchParams<{ id: string; ia?: string }>();

  const fiche = useFichesStore((s) => s.fiches.find((f) => f.id === id));
  const setNotesPerso = useFichesStore((s) => s.setNotesPerso);
  const supprimer = useFichesStore((s) => s.supprimer);
  const subjectColors = usePreferencesStore((s) => s.subjectColors);
  const readingFontScale = useRevisionPreferencesStore((s) => s.readingFontScale);
  const rScale = READING_SCALE[readingFontScale] ?? 1;

  const [confirmSuppr, setConfirmSuppr] = useState(false);

  const setIA = useFichesStore((s) => s.setIA);
  const apiKey = useGeminiStore((s) => s.apiKey);
  const keyLoaded = useGeminiStore((s) => s.keyLoaded);
  const loadKey = useGeminiStore((s) => s.loadKey);
  const [iaBusy, setIaBusy] = useState(false);
  const [iaErreur, setIaErreur] = useState<string | null>(null);
  // Le lancement automatique (arrivée depuis « Nouvelle fiche ») ne doit
  // partir qu'une fois, même si l'écran se re-rend pendant la génération.
  const autoLance = useRef(false);

  useEffect(() => {
    if (!keyLoaded) loadKey();
  }, [keyLoaded, loadKey]);

  const approfondir = useCallback(async () => {
    if (!fiche || iaBusy) return;
    setIaBusy(true);
    setIaErreur(null);
    try {
      const ia = await genererFicheIA(fiche, useGeminiStore.getState().apiKey);
      setIA(fiche.id, ia);
    } catch (err: any) {
      setIaErreur(
        err instanceof GeminiNotConfiguredError
          ? "Gemini n'est pas configuré. Ajoute ta clé dans l'assistant, puis réessaie."
          : err?.message ?? "Gemini n'a pas pu approfondir la fiche."
      );
    } finally {
      setIaBusy(false);
    }
  }, [fiche, iaBusy, setIA]);

  useEffect(() => {
    // On attend d'avoir lu la clé perso : sinon on partirait par le relais
    // serveur alors que la personne a sa propre clé.
    if (iaDemandee === "1" && keyLoaded && fiche && !fiche.ia && !autoLance.current) {
      autoLance.current = true;
      approfondir();
    }
  }, [iaDemandee, keyLoaded, fiche, approfondir]);

  if (!fiche) {
    return (
      <Screen>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing(5) }}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: theme.spacing(3) }}>
            <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
          </Pressable>
          <T variant="hero">Fiche</T>
        </View>
        <Card>
          <T variant="body" tone="secondary">
            Cette fiche n'existe plus.
          </T>
        </Card>
      </Screen>
    );
  }

  const color = colorForSubject(fiche.matiere, subjectColors);
  const g = fiche.genere;

  // Chaque mode ne montre que ce qui le concerne — c'est la différence entre
  // les trois extensions, qui partagent pourtant le même moteur.
  const montrerResume = fiche.mode === "fiche" || fiche.mode === "resume";
  const montrerPoints = fiche.mode === "fiche" || fiche.mode === "points";

  // En mode « fiche » les deux sections coexistent : le moteur les calcule
  // indépendamment, donc les mêmes phrases ressortent souvent des deux côtés.
  // On enlève les doublons côté affichage plutôt que dans le moteur, pour que
  // les modes « résumé » et « points » seuls restent complets.
  const resumeNormalise = new Set(g.resume.map((p) => p.slice(0, 60)));
  const points = montrerResume ? g.points.filter((p) => !resumeNormalise.has(p.slice(0, 60))) : g.points;
  // Nombre de cartes révisables : on ne propose le bouton flashcards que
  // s'il y a vraiment de quoi se tester, plutôt que d'ouvrir un écran vide.
  const nbCartes = cartesDeFiche(fiche).length;
  const avecIA = !!fiche.ia;
  const montrerDefs = fiche.mode === "fiche" && g.definitions.length > 0;
  const montrerMots = fiche.mode === "fiche" && g.motsCles.length > 0;

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: theme.spacing(4) }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: theme.spacing(3), marginTop: 6 }}>
          <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Eyebrow color={color}>{fiche.matiere}</Eyebrow>
          <T variant="hero" style={{ marginTop: 2 }}>
            {fiche.titre}
          </T>
        </View>
      </View>

      <BandeauGemini
        color={color}
        avecIA={avecIA}
        busy={iaBusy}
        erreur={iaErreur}
        sansCle={keyLoaded && !apiKey}
        onApprofondir={approfondir}
        onOuvrirAssistant={() => router.push("/assistant")}
      />

      {fiche.ia && <FicheIAVue ia={fiche.ia} mode={fiche.mode} color={color} rScale={rScale} />}

      {!avecIA && g.phrasesTrouvees < 4 && (
        <Card style={{ marginBottom: theme.spacing(4) }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Icon name="warning" size={18} color={theme.colors.warning} />
            <T variant="caption" tone="secondary" style={{ flex: 1, lineHeight: 18 }}>
              Le texte de départ était court ({g.phrasesTrouvees} phrase
              {g.phrasesTrouvees > 1 ? "s" : ""} exploitable{g.phrasesTrouvees > 1 ? "s" : ""}), donc
              cette fiche reste maigre. Ajoute du cours et régénère pour un meilleur résultat.
            </T>
          </View>
        </Card>
      )}

      {!avecIA && montrerResume && (
        <Section titre="Résumé" color={color}>
          {g.resume.length === 0 ? (
            <T variant="body" tone="secondary">
              Rien à résumer dans ce texte.
            </T>
          ) : (
            <View style={{ gap: 10 }}>
              {g.resume.map((p, i) => (
                <T key={i} variant="body" style={{ fontSize: theme.type.body * rScale, lineHeight: 22 * rScale }}>
                  {p}
                </T>
              ))}
            </View>
          )}
        </Section>
      )}

      {!avecIA && montrerPoints && (
        <Section titre="À retenir" color={color}>
          {points.length === 0 ? (
            <T variant="body" tone="secondary">
              {montrerResume ? "Rien de plus que le résumé ci-dessus." : "Aucun point saillant repéré."}
            </T>
          ) : (
            <View style={{ gap: 12 }}>
              {points.map((p, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 10 }}>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      marginTop: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: hexToRgba(color, 0.14),
                    }}
                  >
                    <T style={{ color, fontSize: 11, fontWeight: "800" }}>{i + 1}</T>
                  </View>
                  <T variant="body" style={{ flex: 1, fontSize: theme.type.body * rScale, lineHeight: 22 * rScale }}>
                    {p}
                  </T>
                </View>
              ))}
            </View>
          )}
        </Section>
      )}

      {!avecIA && montrerDefs && (
        <Section titre="Définitions" color={color}>
          <View style={{ gap: 12 }}>
            {g.definitions.map((d, i) => (
              <View key={i} style={{ gap: 3 }}>
                <T variant="body" weight="semibold" style={{ color }}>
                  {d.terme}
                </T>
                <T variant="caption" tone="secondary" style={{ fontSize: theme.type.caption * rScale, lineHeight: 19 * rScale }}>
                  {d.sens}
                </T>
              </View>
            ))}
          </View>
        </Section>
      )}

      {!avecIA && montrerMots && (
        <Section titre="Mots-clés" color={color}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {g.motsCles.map((m) => (
              <Chip key={m} color={color} label={m} />
            ))}
          </View>
        </Section>
      )}

      {nbCartes > 0 ? (
        <Pressable
          onPress={() => router.push(`/revision/flashcards?fiche=${fiche.id}`)}
          style={{
            marginBottom: theme.spacing(5),
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 13,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: hexToRgba(color, 0.28),
            backgroundColor: hexToRgba(color, theme.isDark ? 0.12 : 0.08),
          }}
        >
          <Icon name="book" size={17} color={color} />
          <T variant="body" weight="semibold" style={{ color }}>
            Réviser en flashcards ({nbCartes})
          </T>
        </Pressable>
      ) : null}

      <Section titre="Mes notes" color={color}>
        <TextInput
          value={fiche.notesPerso}
          onChangeText={(v) => setNotesPerso(fiche.id, v)}
          placeholder="Ajoute ce que l'app a raté, tes exemples, tes formules…"
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          textAlignVertical="top"
          style={{
            minHeight: 110,
            color: theme.colors.textPrimary,
            fontSize: theme.type.body,
            lineHeight: 21,
          }}
        />
      </Section>

      <Pressable
        onPress={() => {
          if (!confirmSuppr) {
            setConfirmSuppr(true);
            return;
          }
          supprimer(fiche.id);
          router.back();
        }}
        style={{
          marginTop: theme.spacing(2),
          paddingVertical: 12,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: hexToRgba(theme.colors.danger, 0.3),
          alignItems: "center",
        }}
      >
        <T variant="caption" weight="semibold" tone="danger">
          {confirmSuppr ? "Appuie encore pour confirmer" : "Supprimer cette fiche"}
        </T>
      </Pressable>
    </Screen>
  );
}

// --- Gemini ------------------------------------------------------------

function BandeauGemini({
  color,
  avecIA,
  busy,
  erreur,
  sansCle,
  onApprofondir,
  onOuvrirAssistant,
}: {
  color: string;
  avecIA: boolean;
  busy: boolean;
  erreur: string | null;
  sansCle: boolean;
  onApprofondir: () => void;
  onOuvrirAssistant: () => void;
}) {
  const theme = useTheme();

  if (busy) {
    return (
      <Card style={{ marginBottom: theme.spacing(4) }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <ActivityIndicator color={color} />
          <T variant="caption" tone="secondary" style={{ flex: 1, lineHeight: 18 }}>
            Gemini prépare ta fiche approfondie… (10 à 30 secondes). La fiche rapide reste
            affichée en attendant.
          </T>
        </View>
      </Card>
    );
  }

  return (
    <View style={{ marginBottom: theme.spacing(4), gap: 8 }}>
      {erreur && (
        <Card>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Icon name="warning" size={18} color={theme.colors.warning} />
            <View style={{ flex: 1, gap: 6 }}>
              <T variant="caption" tone="secondary" style={{ lineHeight: 18 }}>
                {erreur}
              </T>
              {sansCle && (
                <Pressable onPress={onOuvrirAssistant} hitSlop={6}>
                  <T variant="caption" weight="semibold" style={{ color }}>
                    Ouvrir l'assistant pour ajouter une clé →
                  </T>
                </Pressable>
              )}
            </View>
          </View>
        </Card>
      )}
      <Pressable
        onPress={onApprofondir}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: avecIA ? 8 : 13,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: hexToRgba(color, avecIA ? 0.18 : 0.35),
          backgroundColor: avecIA ? "transparent" : hexToRgba(color, theme.isDark ? 0.14 : 0.1),
        }}
      >
        <Icon name={avecIA ? "refresh" : "sparkle"} size={avecIA ? 14 : 17} color={color} />
        <T variant={avecIA ? "caption" : "body"} weight="semibold" style={{ color }}>
          {avecIA ? "Refaire la fiche avec Gemini" : "Approfondir avec Gemini"}
        </T>
      </Pressable>
    </View>
  );
}

function FicheIAVue({ ia, mode, color, rScale }: { ia: FicheIA; mode: string; color: string; rScale: number }) {
  const theme = useTheme();
  const corps = { fontSize: theme.type.body * rScale, lineHeight: 22 * rScale };
  const petit = { fontSize: theme.type.caption * rScale, lineHeight: 19 * rScale };
  const complet = mode === "fiche";
  const montrerResume = mode !== "points";
  const montrerPlan = mode !== "resume";

  const planRevision = ia.planRevision ?? [];

  return (
    <>
      {complet && planRevision.length > 0 && (
        <Section titre="Plan de révision" color={color}>
          <View style={{ gap: 14 }}>
            {planRevision.map((j, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 10 }}>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: hexToRgba(color, 0.16),
                  }}
                >
                  <T style={{ color, fontSize: 12, fontWeight: "800" }}>{i + 1}</T>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <T variant="body" weight="semibold" style={{ textTransform: "capitalize" }}>
                    {j.jour}
                  </T>
                  {j.taches.map((t, k) => (
                    <T key={k} variant="caption" tone="secondary" style={petit}>
                      • {t}
                    </T>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </Section>
      )}

      {montrerResume && ia.resume.length > 0 && (
        <Section titre="L'essentiel" color={color}>
          <View style={{ gap: 10 }}>
            {ia.resume.map((p, i) => (
              <T key={i} variant="body" style={corps}>
                {p}
              </T>
            ))}
          </View>
        </Section>
      )}

      {montrerPlan &&
        ia.plan.map((partie, i) => (
          <Section key={i} titre={`${i + 1}. ${partie.titre}`} color={color}>
            <View style={{ gap: 10 }}>
              {partie.points.map((p, j) => (
                <Puce key={j} color={color}>
                  <T variant="body" style={[{ flex: 1 }, corps]}>
                    {p}
                  </T>
                </Puce>
              ))}
            </View>
          </Section>
        ))}

      {complet && ia.definitions.length > 0 && (
        <Section titre="Définitions" color={color}>
          <View style={{ gap: 12 }}>
            {ia.definitions.map((d, i) => (
              <View key={i} style={{ gap: 3 }}>
                <T variant="body" weight="semibold" style={{ color }}>
                  {d.terme}
                </T>
                <T variant="caption" tone="secondary" style={petit}>
                  {d.sens}
                </T>
              </View>
            ))}
          </View>
        </Section>
      )}

      {complet && ia.aRetenirParCoeur.length > 0 && (
        <Section titre="Par cœur" color={color}>
          <View style={{ gap: 12 }}>
            {ia.aRetenirParCoeur.map((d, i) => (
              <View
                key={i}
                style={{ gap: 3, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: hexToRgba(color, 0.5) }}
              >
                <T variant="body" weight="semibold">
                  {d.intitule}
                </T>
                {!!d.detail && (
                  <T variant="caption" tone="secondary" style={petit}>
                    {d.detail}
                  </T>
                )}
              </View>
            ))}
          </View>
        </Section>
      )}

      {complet && ia.methodes.length > 0 && (
        <Section titre="Méthodes" color={color}>
          <View style={{ gap: 16 }}>
            {ia.methodes.map((m, i) => (
              <View key={i} style={{ gap: 8 }}>
                <T variant="body" weight="semibold">
                  {m.titre}
                </T>
                {m.etapes.map((e, j) => (
                  <View key={j} style={{ flexDirection: "row", gap: 10 }}>
                    <T style={{ color, fontWeight: "800", width: 18 }}>{j + 1}.</T>
                    <T variant="body" style={[{ flex: 1 }, corps]}>
                      {e}
                    </T>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </Section>
      )}

      {complet && ia.exemples.length > 0 && (
        <Section titre="Exemples" color={color}>
          <View style={{ gap: 10 }}>
            {ia.exemples.map((e, i) => (
              <T key={i} variant="body" style={corps}>
                {e}
              </T>
            ))}
          </View>
        </Section>
      )}

      {complet && ia.pieges.length > 0 && (
        <Section titre="Pièges à éviter" color={theme.colors.warning}>
          <View style={{ gap: 10 }}>
            {ia.pieges.map((p, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 10 }}>
                <Icon name="warning" size={16} color={theme.colors.warning} />
                <T variant="body" style={[{ flex: 1 }, corps]}>
                  {p}
                </T>
              </View>
            ))}
          </View>
        </Section>
      )}

      {complet && ia.qcm.length > 0 && (
        <Section titre={`Quiz (${ia.qcm.length} questions)`} color={color}>
          <Qcm qcm={ia.qcm} color={color} />
        </Section>
      )}

      {complet && ia.aVerifier.length > 0 && (
        <Section titre="À vérifier dans ton cours" color={color}>
          <View style={{ gap: 8 }}>
            <T variant="caption" tone="tertiary">
              Gemini pense que ces notions pourraient tomber mais elles n'étaient pas dans ton texte.
            </T>
            {ia.aVerifier.map((p, i) => (
              <Puce key={i} color={color}>
                <T variant="body" style={[{ flex: 1 }, corps]}>
                  {p}
                </T>
              </Puce>
            ))}
          </View>
        </Section>
      )}

      {complet && ia.motsCles.length > 0 && (
        <Section titre="Mots-clés" color={color}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {ia.motsCles.map((m) => (
              <Chip key={m} color={color} label={m} />
            ))}
          </View>
        </Section>
      )}
    </>
  );
}

function Puce({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 8, backgroundColor: color }} />
      {children}
    </View>
  );
}

/** QCM interactif : on répond, la correction et l'explication s'affichent aussitôt. */
function Qcm({ qcm, color }: { qcm: FicheIA["qcm"]; color: string }) {
  const theme = useTheme();
  const [reponses, setReponses] = useState<Record<number, number>>({});
  const repondues = Object.keys(reponses).length;
  const justes = qcm.filter((q, i) => reponses[i] === q.bonne).length;

  return (
    <View style={{ gap: 18 }}>
      {qcm.map((q, i) => {
        const choisi = reponses[i];
        const fait = choisi !== undefined;
        return (
          <View key={i} style={{ gap: 8 }}>
            <T variant="body" weight="semibold">
              {i + 1}. {q.question}
            </T>
            {q.choix.map((c, j) => {
              const estBonne = j === q.bonne;
              const bord = !fait
                ? theme.colors.border
                : estBonne
                  ? theme.colors.success
                  : j === choisi
                    ? theme.colors.danger
                    : theme.colors.border;
              return (
                <Pressable
                  key={j}
                  disabled={fait}
                  onPress={() => setReponses((r) => ({ ...r, [i]: j }))}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: bord,
                    backgroundColor: fait && (estBonne || j === choisi) ? hexToRgba(bord, 0.1) : "transparent",
                  }}
                >
                  <T variant="body">{c}</T>
                </Pressable>
              );
            })}
            {fait && !!q.explication && (
              <T variant="caption" tone="secondary" style={{ lineHeight: 18 }}>
                {q.explication}
              </T>
            )}
          </View>
        );
      })}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <T variant="caption" weight="semibold" style={{ color }}>
          {repondues === qcm.length ? `Score : ${justes}/${qcm.length}` : `${repondues}/${qcm.length} répondues`}
        </T>
        {repondues > 0 && (
          <Pressable onPress={() => setReponses({})} hitSlop={8}>
            <T variant="caption" tone="secondary">
              Recommencer
            </T>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Section({ titre, color, children }: { titre: string; color: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing(5) }}>
      <View style={{ marginBottom: theme.spacing(2) }}>
        <Eyebrow color={color}>{titre}</Eyebrow>
      </View>
      <Card>{children}</Card>
    </View>
  );
}
