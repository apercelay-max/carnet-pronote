import React, { useEffect, useState } from "react";
import { View, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../src/theme/ThemeProvider";
import { useAccountStore } from "../src/store/useAccountStore";
import { T } from "../src/components/ui/Text";
import { Card } from "../src/components/ui/Card";
import { Icon } from "../src/components/ui/Icon";
import { Button } from "../src/components/ui/Button";
import { TextField } from "../src/components/ui/TextField";
import { Eyebrow } from "../src/components/ui/Stats";
import { SegmentedControl } from "../src/components/ui/SegmentedControl";
import { MAX_CONTENT_WIDTH } from "../src/components/ui/Screen";
import { MotionSequence } from "../src/components/ui/Motion";
import { formatDayLabel, formatTime } from "../src/lib/format";

type Mode = "connexion" | "creation";

export default function CompteScreen() {
  const theme = useTheme();
  const router = useRouter();

  const status = useAccountStore((s) => s.status);
  const email = useAccountStore((s) => s.email);
  const busy = useAccountStore((s) => s.busy);
  const error = useAccountStore((s) => s.error);
  const info = useAccountStore((s) => s.info);
  const syncEtat = useAccountStore((s) => s.syncEtat);
  const lastSyncAt = useAccountStore((s) => s.lastSyncAt);
  const attenteConfirmation = useAccountStore((s) => s.attenteConfirmation);
  const bootstrap = useAccountStore((s) => s.bootstrap);
  const creerCompte = useAccountStore((s) => s.creerCompte);
  const seConnecter = useAccountStore((s) => s.seConnecter);
  const seDeconnecter = useAccountStore((s) => s.seDeconnecter);
  const envoyer = useAccountStore((s) => s.envoyer);
  const recevoir = useAccountStore((s) => s.recevoir);
  const clearMessages = useAccountStore((s) => s.clearMessages);

  const [mode, setMode] = useState<Mode>("connexion");
  const [mail, setMail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");

  useEffect(() => {
    if (status === "inconnu") bootstrap();
  }, [status, bootstrap]);

  // Passer de « créer » à « se connecter » (ou l'inverse) efface le message
  // précédent : garder « Email ou mot de passe incorrect » au-dessus d'un
  // formulaire de création n'a aucun sens.
  function changerMode(next: Mode) {
    setMode(next);
    clearMessages();
  }

  const peutValider = mail.trim().includes("@") && motDePasse.length >= 6 && !busy;

  function confirmerDeconnexion() {
    Alert.alert(
      "Se déconnecter du compte Carnet ?",
      "Tes réglages et tes fiches restent sur cet appareil. Tu les retrouveras en te reconnectant.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Se déconnecter", style: "destructive", onPress: () => seDeconnecter() },
      ]
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: theme.spacing(4),
            paddingBottom: theme.spacing(12),
            alignItems: "center",
          }}
          keyboardShouldPersistTaps="handled"
        >
          <MotionSequence resetKey={status}>
            <View style={{ width: "100%", maxWidth: MAX_CONTENT_WIDTH }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing(3),
                  marginBottom: theme.spacing(5),
                }}
              >
                <Pressable onPress={() => router.back()} hitSlop={10}>
                  <Icon name="chevronLeft" size={22} color={theme.colors.textSecondary} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Eyebrow color={theme.colors.accent}>Carnet</Eyebrow>
                  <T variant="hero" style={{ marginTop: 2 }}>
                    Mon compte
                  </T>
                </View>
              </View>

              {status === "connecte" ? (
                <ConnecteVue
                  email={email}
                  syncEtat={syncEtat}
                  lastSyncAt={lastSyncAt}
                  onEnvoyer={envoyer}
                  onRecevoir={recevoir}
                  onDeconnexion={confirmerDeconnexion}
                />
              ) : (
                <>
                  <Card style={{ marginBottom: theme.spacing(4) }}>
                    <T variant="body" weight="semibold">
                      À quoi ça sert
                    </T>
                    <T variant="caption" tone="secondary" style={{ marginTop: 6, lineHeight: 19 }}>
                      Un compte Carnet sert à retrouver TES réglages et TES fiches sur un autre
                      appareil : style, couleur, animations, barre du bas, fiches de révision.
                      {"\n\n"}
                      Ce n'est pas un compte Pronote — celui-là, c'est ton établissement qui le
                      donne, et il reste séparé. Tes identifiants Pronote ne sont jamais envoyés
                      ici.
                    </T>
                  </Card>

                  <View style={{ marginBottom: theme.spacing(4) }}>
                    <SegmentedControl
                      value={mode}
                      onChange={changerMode}
                      options={[
                        { value: "connexion", label: "Se connecter" },
                        { value: "creation", label: "Créer un compte" },
                      ]}
                    />
                  </View>

                  <Card style={{ gap: theme.spacing(4) }}>
                    <TextField
                      label="Email"
                      icon="user"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      value={mail}
                      onChangeText={setMail}
                    />
                    <TextField
                      label="Mot de passe"
                      icon="lock"
                      isPassword
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={motDePasse}
                      onChangeText={setMotDePasse}
                    />
                    {mode === "creation" ? (
                      <T variant="caption" tone="tertiary">
                        6 caractères minimum. Choisis un mot de passe différent de celui de Pronote.
                      </T>
                    ) : null}

                    {error ? <Bandeau ton="danger" texte={error} /> : null}
                    {info ? <Bandeau ton="ok" texte={info} /> : null}
                    {attenteConfirmation ? (
                      <Bandeau
                        ton="ok"
                        texte="Une fois l'email confirmé, reviens ici et connecte-toi."
                      />
                    ) : null}

                    <Button
                      label={mode === "creation" ? "Créer mon compte" : "Se connecter"}
                      onPress={() =>
                        mode === "creation"
                          ? creerCompte(mail, motDePasse)
                          : seConnecter(mail, motDePasse)
                      }
                      disabled={!peutValider}
                      loading={busy}
                    />
                  </Card>
                </>
              )}
            </View>
          </MotionSequence>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ConnecteVue({
  email,
  syncEtat,
  lastSyncAt,
  onEnvoyer,
  onRecevoir,
  onDeconnexion,
}: {
  email: string | null;
  syncEtat: string;
  lastSyncAt: number | null;
  onEnvoyer: () => void;
  onRecevoir: () => void;
  onDeconnexion: () => void;
}) {
  const theme = useTheme();
  const error = useAccountStore((s) => s.error);
  const info = useAccountStore((s) => s.info);
  const occupe = syncEtat === "envoi" || syncEtat === "reception";

  return (
    <>
      <Card style={{ marginBottom: theme.spacing(4) }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3) }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.colors.accentGlass,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="checkCircle" size={20} color={theme.colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="body" weight="semibold">
              {email ?? "Compte Carnet"}
            </T>
            <T variant="caption" tone="secondary">
              {lastSyncAt
                ? `Dernière synchro : ${formatDayLabel(new Date(lastSyncAt)).toLowerCase()} à ${formatTime(
                    new Date(lastSyncAt)
                  )}`
                : "Pas encore synchronisé sur cet appareil"}
            </T>
          </View>
        </View>
      </Card>

      <Card style={{ marginBottom: theme.spacing(4), gap: theme.spacing(4) }}>
        <T variant="caption" tone="secondary" style={{ lineHeight: 19 }}>
          La synchronisation est manuelle, dans les deux sens, exprès : personne n'a envie que son
          téléphone écrase en silence les fiches qu'il vient d'écrire sur l'ordi.
        </T>
        <Button
          label="Envoyer mes réglages et mes fiches"
          icon="chevronUp"
          onPress={onEnvoyer}
          loading={syncEtat === "envoi"}
          disabled={occupe}
        />
        <Button
          label="Récupérer ceux du compte"
          variant="secondary"
          icon="chevronDown"
          onPress={onRecevoir}
          loading={syncEtat === "reception"}
          disabled={occupe}
        />
        <T variant="caption" tone="tertiary" style={{ lineHeight: 18 }}>
          « Récupérer » remplace les réglages et les fiches de CET appareil par ceux enregistrés
          dans le compte. Tes identifiants Pronote et ta clé Gemini ne bougent pas : ils restent
          sur l'appareil et ne sont jamais envoyés.
        </T>

        {error ? <Bandeau ton="danger" texte={error} /> : null}
        {info ? <Bandeau ton="ok" texte={info} /> : null}
      </Card>

      <Button label="Se déconnecter du compte" variant="ghost" onPress={onDeconnexion} />
    </>
  );
}

function Bandeau({ ton, texte }: { ton: "danger" | "ok"; texte: string }) {
  const theme = useTheme();
  const couleur = ton === "danger" ? theme.colors.danger : theme.colors.success;
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
      <Icon name={ton === "danger" ? "warning" : "checkCircle"} size={15} color={couleur} />
      <T variant="caption" style={{ flex: 1, color: couleur, lineHeight: 18 }}>
        {texte}
      </T>
    </View>
  );
}
