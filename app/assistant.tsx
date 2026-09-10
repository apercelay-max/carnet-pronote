import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../src/theme/ThemeProvider";
import { useDataStore } from "../src/store/useDataStore";
import { useSessionStore } from "../src/store/useSessionStore";
import { useGeminiStore, type ChatMessage } from "../src/store/useGeminiStore";
import { askGemini, GeminiNotConfiguredError } from "../src/lib/gemini";
import { buildSchoolContext, SYSTEM_PROMPT } from "../src/lib/schoolContext";
import { T } from "../src/components/ui/Text";
import { Card } from "../src/components/ui/Card";
import { Icon } from "../src/components/ui/Icon";
import { Button } from "../src/components/ui/Button";
import { Eyebrow } from "../src/components/ui/Stats";
import { MAX_CONTENT_WIDTH } from "../src/components/ui/Screen";
import { MotionSequence, Reveal } from "../src/components/ui/Motion";

// Les propositions de départ : elles montrent ce que l'assistant sait faire de
// PLUS qu'un chatbot générique, c'est-à-dire tout ce qui s'appuie sur les
// données Pronote de la personne.
const SUGGESTIONS = [
  "Fais-moi une fiche de révision sur mon dernier cours de maths.",
  "Pose-moi 10 questions sur les cours de cette semaine, corrigé à la fin.",
  "Qu'est-ce que je dois réviser en priorité d'ici la fin de la semaine ?",
  "Dans quelle matière je suis le plus en difficulté, et comment remonter ?",
  "Explique-moi simplement le devoir de français à rendre.",
];

function nouvelId() {
  return `m${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export default function AssistantScreen() {
  const theme = useTheme();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const displayName = useSessionStore((s) => s.displayName);
  const { grades, assignments, timetable, evaluations, resources, notebookData } = useDataStore();

  const apiKey = useGeminiStore((s) => s.apiKey);
  const keyLoaded = useGeminiStore((s) => s.keyLoaded);
  const loadKey = useGeminiStore((s) => s.loadKey);
  const setApiKey = useGeminiStore((s) => s.setApiKey);
  const clearApiKey = useGeminiStore((s) => s.clearApiKey);
  const useSchoolData = useGeminiStore((s) => s.useSchoolData);
  const setUseSchoolData = useGeminiStore((s) => s.setUseSchoolData);
  const messages = useGeminiStore((s) => s.messages);
  const addMessage = useGeminiStore((s) => s.addMessage);
  const replaceMessage = useGeminiStore((s) => s.replaceMessage);
  const clearMessages = useGeminiStore((s) => s.clearMessages);

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [keyPanelOpen, setKeyPanelOpen] = useState(false);
  // Passe à true quand le serveur répond « aucune clé configurée » : tant que
  // ce n'est pas arrivé, inutile de réclamer une clé à qui n'en a pas besoin.
  const [serveurSansCle, setServeurSansCle] = useState(false);

  useEffect(() => {
    if (!keyLoaded) loadKey();
  }, [keyLoaded, loadKey]);

  const contexte = useMemo(
    () =>
      buildSchoolContext({
        displayName,
        grades,
        assignments,
        timetable,
        evaluations,
        resources,
        notebookData,
      }),
    [displayName, grades, assignments, timetable, evaluations, resources, notebookData]
  );

  const envoyer = useCallback(
    async (texte: string) => {
      const question = texte.trim();
      if (!question || busy) return;

      setDraft("");
      setBusy(true);
      addMessage({ id: nouvelId(), role: "user", text: question });

      const placeholderId = nouvelId();
      addMessage({ id: placeholderId, role: "model", text: "" });

      // L'historique part avec la question pour que Gemini garde le fil, mais
      // sans les messages en échec : renvoyer « Quota dépassé » comme si
      // c'était une réponse embrouillerait la suite de la conversation.
      const history = useGeminiStore
        .getState()
        .messages.filter((m) => !m.failed && m.text && m.id !== placeholderId)
        .slice(-10)
        .map((m) => ({ role: m.role, text: m.text }));

      const prompt =
        useSchoolData && contexte
          ? `Voici le résumé à jour de ma scolarité :\n\n${contexte}\n\n---\n\n${question}`
          : question;

      try {
        const reponse = await askGemini(prompt, {
          apiKey,
          system: SYSTEM_PROMPT,
          history: history.slice(0, -1),
        });
        replaceMessage(placeholderId, { text: reponse });
      } catch (err: any) {
        if (err instanceof GeminiNotConfiguredError) {
          setServeurSansCle(true);
          setKeyPanelOpen(true);
        }
        replaceMessage(placeholderId, {
          text: err?.message ?? "L'assistant n'a pas pu répondre.",
          failed: true,
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, apiKey, contexte, useSchoolData, addMessage, replaceMessage]
  );

  const vide = messages.length === 0;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* En-tête fixe : dans un fil de discussion qui s'allonge, un titre
            qui défile ferait perdre le bouton retour. */}
        <View
          style={{
            width: "100%",
            maxWidth: MAX_CONTENT_WIDTH,
            alignSelf: "center",
            paddingHorizontal: theme.spacing(4),
            paddingTop: theme.spacing(2),
            paddingBottom: theme.spacing(3),
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing(3),
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="chevronLeft" size={22} color={theme.colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Eyebrow color={theme.colors.accent}>Gemini</Eyebrow>
            <T variant="title" style={{ marginTop: 2 }}>
              Assistant
            </T>
          </View>
          {messages.length > 0 ? (
            <Pressable onPress={clearMessages} hitSlop={10}>
              <Icon name="refresh" size={18} color={theme.colors.textTertiary} />
            </Pressable>
          ) : null}
          <Pressable onPress={() => setKeyPanelOpen((v) => !v)} hitSlop={10}>
            <Icon name="settings" size={18} color={theme.colors.textTertiary} />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing(4),
            paddingBottom: theme.spacing(6),
            alignItems: "center",
          }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <MotionSequence resetKey={messages.length}>
            <View style={{ width: "100%", maxWidth: MAX_CONTENT_WIDTH, gap: theme.spacing(3) }}>
              {keyPanelOpen ? (
                <ReglagesAssistant
                  apiKey={apiKey}
                  keyDraft={keyDraft}
                  setKeyDraft={setKeyDraft}
                  onSave={async () => {
                    await setApiKey(keyDraft);
                    setKeyDraft("");
                    setServeurSansCle(false);
                  }}
                  onClear={clearApiKey}
                  useSchoolData={useSchoolData}
                  setUseSchoolData={setUseSchoolData}
                  serveurSansCle={serveurSansCle}
                  apercuContexte={contexte}
                />
              ) : null}

              {vide ? (
                <Accueil onChoisir={envoyer} useSchoolData={useSchoolData} />
              ) : (
                messages.map((m) => <Bulle key={m.id} message={m} />)
              )}
            </View>
          </MotionSequence>
        </ScrollView>

        <Composeur
          value={draft}
          onChange={setDraft}
          onSend={() => envoyer(draft)}
          busy={busy}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Accueil({
  onChoisir,
  useSchoolData,
}: {
  onChoisir: (texte: string) => void;
  useSchoolData: boolean;
}) {
  const theme = useTheme();
  return (
    <>
      <Card>
        <T variant="body" weight="semibold">
          Pose n'importe quelle question sur tes cours
        </T>
        <T variant="caption" tone="secondary" style={{ marginTop: 6, lineHeight: 19 }}>
          {useSchoolData
            ? "Tes moyennes, tes notes, tes devoirs et le contenu des cours écrit par tes profs sont joints à chaque question, pour que les réponses parlent de TA scolarité et pas d'un élève moyen."
            : "Les données de ta scolarité ne sont pas jointes : les réponses seront générales. Active-les dans les réglages de l'assistant (en haut à droite)."}
        </T>
      </Card>

      <View style={{ gap: theme.spacing(2) }}>
        {SUGGESTIONS.map((s) => (
          <Card key={s} onPress={() => onChoisir(s)}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3) }}>
              <Icon name="sparkle" size={16} color={theme.colors.accent} />
              <T variant="body" style={{ flex: 1, lineHeight: 20 }}>
                {s}
              </T>
              <Icon name="chevronRight" size={15} color={theme.colors.textTertiary} />
            </View>
          </Card>
        ))}
      </View>
    </>
  );
}

function Bulle({ message }: { message: ChatMessage }) {
  const theme = useTheme();
  const moi = message.role === "user";

  if (moi) {
    return (
      <Reveal>
        <View
          style={{
            alignSelf: "flex-end",
            maxWidth: "88%",
            backgroundColor: theme.colors.accentGlass,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingVertical: theme.spacing(3),
            paddingHorizontal: theme.spacing(3.5),
          }}
        >
          <T variant="body" style={{ lineHeight: 21 }}>
            {message.text}
          </T>
        </View>
      </Reveal>
    );
  }

  // Réponse encore vide = requête en cours : on montre l'attente à sa place
  // dans le fil plutôt qu'un bandeau ailleurs à l'écran.
  if (!message.text) {
    return (
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3) }}>
          <ActivityIndicator color={theme.colors.accent} />
          <T variant="caption" tone="secondary">
            Gemini réfléchit…
          </T>
        </View>
      </Card>
    );
  }

  if (message.failed) {
    return (
      <Card style={{ borderColor: theme.colors.danger, borderWidth: 1 }}>
        <View style={{ flexDirection: "row", gap: theme.spacing(2), alignItems: "flex-start" }}>
          <Icon name="warning" size={16} color={theme.colors.danger} />
          <T variant="caption" tone="danger" style={{ flex: 1, lineHeight: 19 }}>
            {message.text}
          </T>
        </View>
      </Card>
    );
  }

  return (
    <Card>
      <Markdownish texte={message.text} />
    </Card>
  );
}

/**
 * Rendu léger du Markdown que renvoie Gemini.
 *
 * Pas de bibliothèque : on n'a besoin que des titres, des puces et du gras,
 * et une dépendance de plus (avec son propre moteur HTML) pour ça ne vaut pas
 * le poids ajouté au bundle.
 */
function Markdownish({ texte }: { texte: string }) {
  const theme = useTheme();
  const lignes = texte.split("\n");

  return (
    <View style={{ gap: 6 }}>
      {lignes.map((ligne, i) => {
        const brut = ligne.trim();
        if (!brut) return <View key={i} style={{ height: 4 }} />;

        const titre = brut.match(/^(#{1,6})\s+(.*)$/);
        if (titre) {
          return (
            <T
              key={i}
              variant={titre[1].length <= 2 ? "subtitle" : "body"}
              weight="semibold"
              style={{ marginTop: i === 0 ? 0 : 6 }}
            >
              {enleveGras(titre[2])}
            </T>
          );
        }

        const puce = brut.match(/^[-*•]\s+(.*)$/);
        if (puce) {
          return (
            <View key={i} style={{ flexDirection: "row", gap: 8, paddingLeft: 2 }}>
              <T variant="body" style={{ color: theme.colors.accent, lineHeight: 21 }}>
                •
              </T>
              <T variant="body" style={{ flex: 1, lineHeight: 21 }}>
                {enleveGras(puce[1])}
              </T>
            </View>
          );
        }

        const numero = brut.match(/^(\d+)[.)]\s+(.*)$/);
        if (numero) {
          return (
            <View key={i} style={{ flexDirection: "row", gap: 8, paddingLeft: 2 }}>
              <T variant="body" weight="semibold" style={{ color: theme.colors.accent, lineHeight: 21 }}>
                {numero[1]}.
              </T>
              <T variant="body" style={{ flex: 1, lineHeight: 21 }}>
                {enleveGras(numero[2])}
              </T>
            </View>
          );
        }

        return (
          <T key={i} variant="body" style={{ lineHeight: 21 }}>
            {enleveGras(brut)}
          </T>
        );
      })}
    </View>
  );
}

/** `**gras**` -> gras. Le reste du Markdown inline est laissé tel quel. */
function enleveGras(input: string): React.ReactNode {
  const morceaux = input.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  if (morceaux.length === 1) return input.replace(/\*\*/g, "");
  return morceaux.map((m, i) =>
    m.startsWith("**") && m.endsWith("**") ? (
      <T key={i} variant="body" weight="semibold">
        {m.slice(2, -2)}
      </T>
    ) : (
      m
    )
  );
}

function Composeur({
  value,
  onChange,
  onSend,
  busy,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  busy: boolean;
}) {
  const theme = useTheme();
  const peutEnvoyer = value.trim().length > 0 && !busy;

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderSoft,
        backgroundColor: theme.colors.backgroundElevated,
        paddingHorizontal: theme.spacing(4),
        paddingTop: theme.spacing(3),
        paddingBottom: theme.spacing(4),
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: MAX_CONTENT_WIDTH,
          alignSelf: "center",
          flexDirection: "row",
          alignItems: "flex-end",
          gap: theme.spacing(2),
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Pose ta question…"
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          onSubmitEditing={() => peutEnvoyer && onSend()}
          style={{
            flex: 1,
            maxHeight: 120,
            minHeight: 44,
            color: theme.colors.textPrimary,
            fontSize: theme.type.body,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing(3),
            paddingVertical: theme.spacing(2.5),
          }}
        />
        <Pressable
          onPress={onSend}
          disabled={!peutEnvoyer}
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.radius.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: peutEnvoyer ? theme.colors.accent : theme.colors.surfaceElevated,
          }}
        >
          {busy ? (
            <ActivityIndicator color={theme.colors.textSecondary} />
          ) : (
            <Icon
              name="chevronUp"
              size={20}
              color={peutEnvoyer ? "#0B0D12" : theme.colors.textTertiary}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function ReglagesAssistant({
  apiKey,
  keyDraft,
  setKeyDraft,
  onSave,
  onClear,
  useSchoolData,
  setUseSchoolData,
  serveurSansCle,
  apercuContexte,
}: {
  apiKey: string | null;
  keyDraft: string;
  setKeyDraft: (v: string) => void;
  onSave: () => void;
  onClear: () => void;
  useSchoolData: boolean;
  setUseSchoolData: (v: boolean) => void;
  serveurSansCle: boolean;
  apercuContexte: string;
}) {
  const theme = useTheme();
  const [contexteOuvert, setContexteOuvert] = useState(false);

  return (
    <Card style={{ gap: theme.spacing(4) }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3) }}>
        <View style={{ flex: 1 }}>
          <T variant="body">Utiliser mes données scolaires</T>
          <T variant="caption" tone="tertiary" style={{ marginTop: 2, lineHeight: 18 }}>
            Envoie tes moyennes, notes, devoirs et le contenu de tes cours à Google avec chaque
            question. Sans ça, les réponses restent générales.
          </T>
        </View>
        <Switch
          value={useSchoolData}
          onValueChange={setUseSchoolData}
          trackColor={{ false: theme.colors.borderSoft, true: theme.colors.accent }}
          thumbColor="#FFFFFF"
        />
      </View>

      {useSchoolData ? (
        <Pressable onPress={() => setContexteOuvert((v) => !v)}>
          <T variant="caption" tone="accent" weight="medium">
            {contexteOuvert ? "Masquer" : "Voir exactement ce qui est envoyé"}
          </T>
        </Pressable>
      ) : null}

      {contexteOuvert ? (
        <View
          style={{
            backgroundColor: theme.colors.surfaceElevated,
            borderRadius: theme.radius.sm,
            padding: theme.spacing(3),
          }}
        >
          <T variant="caption" tone="secondary" style={{ lineHeight: 17 }}>
            {apercuContexte || "Aucune donnée chargée pour l'instant."}
          </T>
        </View>
      ) : null}

      <View style={{ height: 1, backgroundColor: theme.colors.borderSoft }} />

      <View style={{ gap: theme.spacing(2) }}>
        <T variant="body">Clé Gemini personnelle</T>
        <T variant="caption" tone="tertiary" style={{ lineHeight: 18 }}>
          {apiKey
            ? "Tes questions passent par ta propre clé : elles n'entament le quota de personne d'autre."
            : serveurSansCle
            ? "Aucune clé n'est configurée sur le serveur de l'app. Colle la tienne (gratuite) pour activer l'assistant."
            : "Facultatif. Sans clé, tes questions passent par celle de l'app, partagée par tout le monde."}
        </T>

        <Pressable onPress={() => Linking.openURL("https://aistudio.google.com/apikey")}>
          <T variant="caption" tone="accent" weight="medium">
            Obtenir une clé gratuite sur aistudio.google.com →
          </T>
        </Pressable>

        {apiKey ? (
          <Button label="Retirer ma clé" variant="secondary" icon="close" onPress={onClear} />
        ) : (
          <>
            <TextInput
              value={keyDraft}
              onChangeText={setKeyDraft}
              placeholder="AIza…"
              placeholderTextColor={theme.colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.type.body,
                backgroundColor: theme.colors.surfaceElevated,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                paddingHorizontal: theme.spacing(3),
                paddingVertical: theme.spacing(2.5),
              }}
            />
            <Button
              label="Enregistrer ma clé"
              onPress={onSave}
              disabled={keyDraft.trim().length < 10}
            />
          </>
        )}
      </View>
    </Card>
  );
}
