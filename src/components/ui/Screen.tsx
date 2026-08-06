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

export function Screen({ children, scroll = true, onRefresh, refreshing }: Props) {
  const theme = useTheme();

  const style = [styles.flex, { backgroundColor: theme.colors.background }];

  if (!scroll) {
    return (
      <SafeAreaView style={style} edges={["top", "left", "right"]}>
        <View style={styles.flex}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={style} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ padding: theme.spacing(4), paddingBottom: theme.spacing(24) }}
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
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
