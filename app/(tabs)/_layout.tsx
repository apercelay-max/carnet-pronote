import React from "react";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../src/theme/ThemeProvider";
import { TabButton } from "../../src/components/ui/TabButton";
import { usePreferencesStore, TAB_DEFAULTS } from "../../src/store/usePreferencesStore";

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const g = theme.glass;

  const tabOrder = usePreferencesStore((s) => s.tabOrder);
  const hiddenTabs = usePreferencesStore((s) => s.hiddenTabs);
  const tabLabels = usePreferencesStore((s) => s.tabLabels);
  const tabIcons = usePreferencesStore((s) => s.tabIcons);

  // "reglages" reste toujours visible même si l'état persisté est corrompu :
  // sinon, plus aucun moyen de rouvrir les réglages pour le réafficher.
  const visibleTabs = tabOrder.filter((id) => id === "reglages" || !hiddenTabs.includes(id));

  // Important : <TabList> doit être un enfant DIRECT de <Tabs> (au même
  // niveau que <TabSlot />), sinon expo-router/ui ne détecte aucun
  // <TabTrigger> (il ne traverse que les Fragments et TabList, pas une
  // <View> intermédiaire) -> plus aucun écran trouvé pour le navigateur.
  // Le flou/dégradé sont mis EN PREMIER À L'INTÉRIEUR de <TabList> (pas
  // autour) : ce sont des enfants non-TabTrigger que le détecteur ignore
  // silencieusement sans perturber la détection des vrais TabTrigger.
  return (
    <Tabs style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <TabSlot />
      <TabList
        style={{
          position: "relative",
          overflow: "hidden",
          flexDirection: "row",
          borderRadius: theme.radius.xl,
          marginHorizontal: 14,
          marginBottom: Math.max(insets.bottom, 12),
          borderWidth: 1,
          borderColor: g.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: g.shadowOpacity,
          shadowRadius: 26,
          elevation: 10,
        }}
      >
        <BlurView intensity={g.intensity} tint={g.tint} style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={[g.overlayFrom, g.overlayTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
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
