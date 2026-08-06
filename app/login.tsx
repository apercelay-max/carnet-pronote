import React, { useState } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useTheme } from "../src/theme/ThemeProvider";
import { useSessionStore } from "../src/store/useSessionStore";
import { T } from "../src/components/ui/Text";
import { TextField } from "../src/components/ui/TextField";
import { Button } from "../src/components/ui/Button";
import { Icon } from "../src/components/ui/Icon";
import { Card } from "../src/components/ui/Card";

export default function LoginScreen() {
  const theme = useTheme();
  const login = useSessionStore((s) => s.login);
  const enterDemo = useSessionStore((s) => s.enterDemo);
  const isBusy = useSessionStore((s) => s.isBusy);
  const error = useSessionStore((s) => s.error);
  const clearError = useSessionStore((s) => s.clearError);

  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const canSubmit = url.trim().length > 3 && username.trim().length > 0 && password.length > 0;

  async function handleSubmit() {
    if (!canSubmit || isBusy) return;
    clearError();
    await login(url.trim(), username.trim(), password);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: theme.spacing(6), justifyContent: "center" }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", marginBottom: theme.spacing(9) }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.accentGlass,
              borderWidth: 1,
              borderColor: theme.glass.border,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: theme.spacing(4),
            }}
          >
            <Icon name="sparkle" size={30} color={theme.colors.accent} />
          </View>
          <T variant="hero">Carnet</T>
          <T variant="body" tone="secondary" style={{ marginTop: 4, textAlign: "center" }}>
            Tes notes, ton emploi du temps et tes devoirs — sans passer par Pronote.
          </T>
        </View>

        <View style={{ gap: theme.spacing(4) }}>
          <TextField
            label="Adresse de ton Pronote"
            icon="school"
            placeholder="https://0000000a.index-education.net/pronote/eleve.html"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={url}
            onChangeText={setUrl}
          />
          <TextField
            label="Identifiant"
            icon="user"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />
          <TextField
            label="Mot de passe"
            icon="lock"
            isPassword
            autoCapitalize="none"
            autoCorrect={false}
            value={password}
            onChangeText={setPassword}
          />

          {error ? (
            <Card padded style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.danger }}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                <Icon name="warning" size={16} color={theme.colors.danger} />
                <T variant="caption" tone="danger" style={{ flex: 1 }}>
                  {error}
                </T>
              </View>
            </Card>
          ) : null}

          <Button label="Se connecter" onPress={handleSubmit} disabled={!canSubmit} loading={isBusy} />
          <Button label="Voir une démo sans compte" onPress={enterDemo} variant="ghost" />
        </View>

        <T variant="caption" tone="tertiary" style={{ marginTop: theme.spacing(8), textAlign: "center" }}>
          L'adresse se trouve dans la barre du navigateur quand tu es sur la page de connexion de ton
          établissement. Tes identifiants restent uniquement sur ton téléphone.
        </T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
