import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";
import { useTheme } from "../../src/theme/ThemeProvider";
import { TabButton } from "../../src/components/ui/TabButton";

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Important : <TabList> doit être un enfant DIRECT de <Tabs> (au même
  // niveau que <TabSlot />), sinon expo-router/ui ne détecte aucun
  // <TabTrigger> (il ne traverse que les Fragments et TabList, pas une
  // <View> intermédiaire) -> plus aucun écran trouvé pour le navigateur.
  // Le style du conteneur de la barre d'onglets se met donc directement
  // sur <TabList>, pas sur un <View> qui l'entourerait.
  return (
    <Tabs style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <TabSlot />
      <TabList
        style={{
          flexDirection: "row",
          paddingBottom: Math.max(insets.bottom, 10),
          paddingHorizontal: 12,
          paddingTop: 6,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.borderSoft,
        }}
      >
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
    </Tabs>
  );
}
