import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";
import { useTheme } from "../../src/theme/ThemeProvider";
import { TabButton } from "../../src/components/ui/TabButton";
import { MAX_CONTENT_WIDTH } from "../../src/components/ui/Screen";
import { usePreferencesStore, TAB_DEFAULTS } from "../../src/store/usePreferencesStore";

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { tabBar } = theme.structure;
  const c = theme.colors;

  const tabOrder = usePreferencesStore((s) => s.tabOrder);
  const hiddenTabs = usePreferencesStore((s) => s.hiddenTabs);
  const tabLabels = usePreferencesStore((s) => s.tabLabels);
  const tabIcons = usePreferencesStore((s) => s.tabIcons);

  // "reglages" reste toujours visible même si l'état persisté est corrompu :
  // sinon, plus aucun moyen de rouvrir les réglages pour le réafficher.
  const visibleTabs = tabOrder.filter((id) => id === "reglages" || !hiddenTabs.includes(id));

  const isFloating = tabBar.treatment === "floating-pill";

  // Important : <TabList> doit être un enfant DIRECT de <Tabs> (au même
  // niveau que <TabSlot />), sinon expo-router/ui ne détecte aucun
  // <TabTrigger> (il ne traverse que les Fragments et TabList, pas une
  // <View> intermédiaire) -> plus aucun écran trouvé pour le navigateur.
  //
  // Barre 100% opaque (backgroundColor: c.surface) — pas de flou/dégradé,
  // le style se distingue par la forme (radius, bordure, ombre) et par la
  // forme de l'indicateur actif dans TabButton.
  return (
    <Tabs style={{ flex: 1, backgroundColor: c.background }}>
      <TabSlot />
      <TabList
        style={{
          flexDirection: "row",
          overflow: "hidden",
          alignSelf: "center",
          width: "100%",
          maxWidth: MAX_CONTENT_WIDTH - 20,
          backgroundColor: c.surface,
          borderRadius: tabBar.radius,
          marginHorizontal: 14,
          marginBottom: Math.max(insets.bottom, 12),
          borderWidth: isFloating ? 0 : 1,
          borderColor: c.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isFloating ? 0.12 : 0,
          shadowRadius: 26,
          elevation: isFloating ? 10 : 0,
        }}
      >
        {visibleTabs.map((id) => {
          const defaults = TAB_DEFAULTS[id];
          return (
            <TabTrigger key={id} name={id} href={defaults.href} asChild>
              <TabButton icon={tabIcons[id] ?? defaults.icon} label={tabLabels[id] ?? defaults.label} />
            </TabTrigger>
          );
        })}
      </TabList>
    </Tabs>
  );
}
