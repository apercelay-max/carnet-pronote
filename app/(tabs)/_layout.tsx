import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";
import { useTheme } from "../../src/theme/ThemeProvider";
import { TabButton } from "../../src/components/ui/TabButton";

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <TabSlot />
      <View
        style={{
          paddingBottom: Math.max(insets.bottom, 10),
          paddingHorizontal: 12,
          paddingTop: 6,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.borderSoft,
        }}
      >
        <TabList style={{ flexDirection: "row" }}>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="dashboard" label="Accueil" />
          </TabTrigger>
          <TabTrigger name="notes" href="/notes" asChild>
            <TabButton icon="notes" label="Notes" />
          </TabTrigger>
          <TabTrigger name="emploi-du-temps" href="/emploi-du-temps" asChild>
            <TabButton icon="timetable" label="Emploi du temps" />
          </TabTrigger>
          <TabTrigger name="devoirs" href="/devoirs" asChild>
            <TabButton icon="homework" label="Devoirs" />
          </TabTrigger>
          <TabTrigger name="reglages" href="/reglages" asChild>
            <TabButton icon="settings" label="Réglages" />
          </TabTrigger>
        </TabList>
      </View>
    </Tabs>
  );
}
