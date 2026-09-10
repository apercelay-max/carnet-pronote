import React, { useCallback, useState } from "react";
import { ScrollView, View, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useTheme } from "../../theme/ThemeProvider";
import { useMotionStore } from "../../store/useMotionStore";
import { MotionSequence, Reveal } from "./Motion";

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
};

// Largeur max du contenu : au-delà (desktop web), on centre une colonne
// façon app plutôt que d'étirer les cartes sur toute la largeur de la
// fenêtre — sinon ça ressemble juste à un site web, pas à une vraie app.
export const MAX_CONTENT_WIDTH = 560;

export function Screen({ children, scroll = true, onRefresh, refreshing }: Props) {
  const theme = useTheme();
  const motionId = useMotionStore((s) => s.motionId);
  const screensOn = useMotionStore((s) => s.screens);
  const cardsOn = useMotionStore((s) => s.cards);

  // Chaque arrivée sur l'onglet relance les animations : sans ça, un onglet
  // resté monté en arrière-plan réapparaîtrait figé pendant que les autres
  // s'animent.
  const [visit, setVisit] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setVisit((v) => v + 1);
    }, [])
  );

  // Quand les cartes portent déjà l'animation choisie, l'écran se contente
  // d'un fondu : superposer deux fois le même effet (des pixels sur des
  // pixels) donne une bouillie et coûte cher pour rien.
  const screenMotion = cardsOn ? "fondu" : motionId;

  const body = (fill: boolean) => (
    <MotionSequence resetKey={`${visit}-${motionId}`}>
      <Reveal
        active={screensOn}
        motionId={screenMotion}
        replayKey={`${visit}-${screenMotion}`}
        style={fill ? [styles.flex, styles.centerColumn] : styles.centerColumn}
      >
        {children}
      </Reveal>
    </MotionSequence>
  );

  const style = [styles.flex, { backgroundColor: theme.colors.background }];

  if (!scroll) {
    return (
      <SafeAreaView style={style} edges={["top", "left", "right"]}>
        <View style={styles.flex}>{body(true)}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={style} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{
          padding: theme.spacing(4),
          paddingBottom: theme.spacing(24),
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.accent}
            />
          ) : undefined
        }
      >
        {body(false)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerColumn: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
});
