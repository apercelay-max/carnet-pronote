import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { useSessionStore } from "../src/store/useSessionStore";
import { useMotionStore } from "../src/store/useMotionStore";
import { stackAnimationFor } from "../src/lib/motion";
import { CelebrationLayer } from "../src/components/ui/Celebration";
import { useAccountStore } from "../src/store/useAccountStore";
import { NouveautesModal } from "../src/components/NouveautesModal";
import { SplashBonjour, premierPrenom } from "../src/components/SplashBonjour";

// Une seule fois par lancement : se reconnecter ou changer de compte ne rejoue pas l'écran.
let splashJoue = false;

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const theme = useTheme();
  const status = useSessionStore((s) => s.status);
  const bootstrap = useSessionStore((s) => s.bootstrap);
  // L'ouverture d'une page suit l'animation choisie dans les Réglages, comme
  // les cartes et les écrans — sinon on aurait un "Glitch" partout sauf en
  // passant d'une page à l'autre.
  const motionId = useMotionStore((s) => s.motionId);
  const screensOn = useMotionStore((s) => s.screens);
  const displayName = useSessionStore((s) => s.displayName);
  const [splash, setSplash] = useState(true);
  const stackAnimation = (screensOn ? stackAnimationFor(motionId) : "none") as any;

  // Session du compte Carnet restaurée au démarrage, en parallèle de celle de
  // Pronote : les deux sont indépendantes, l'une ne doit jamais bloquer l'autre.
  const bootstrapCompte = useAccountStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
    bootstrapCompte();
  }, [bootstrap, bootstrapCompte]);

  if (status === "starting") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, animation: stackAnimation }}>
        <Stack.Protected guard={status === "authenticated"}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="competences" />
          <Stack.Screen name="messagerie" />
          <Stack.Screen name="actualites" />
          <Stack.Screen name="assistant" />
          <Stack.Screen name="compte" />
        </Stack.Protected>
        <Stack.Protected guard={status !== "authenticated"}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
      {/* Montée une seule fois, au-dessus de tout : les confettis doivent
          pouvoir tomber par-dessus n'importe quel écran. */}
      <CelebrationLayer />
      {/* Seulement une fois connecté : pas de « quoi de neuf » par-dessus l'écran de connexion. */}
      {status === "authenticated" ? <NouveautesModal /> : null}
      {status === "authenticated" && splash && !splashJoue && motionId !== "aucune" ? (
        <SplashBonjour
          firstName={premierPrenom(displayName)}
          onDone={() => {
            splashJoue = true;
            setSplash(false);
          }}
        />
      ) : null}
    </>
  );
}
