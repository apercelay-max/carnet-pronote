import React from "react";
import { ScrollView, View, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";

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

  const style = [styles.flex, { backgroundColor: theme.colors.background }];

  if (!scroll) {
    return (
      <SafeAreaView style={style} edges={["top", "left", "right"]}>
        <View style={[styles.flex, styles.centerColumn]}>{children}</View>
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
        <View style={styles.centerColumn}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerColumn: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
});
