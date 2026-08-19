import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
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
  const isGlass = tabBar.treatment === "liquid-glass";

  // "liquid-glass" reprend la barre "verre liquide" de PPL Tracker : pilule
  // flottante translucide, floutée, avec un reflet en haut. PPL l'obtient en
  // CSS (backdrop-filter) ; ici on utilise expo-blur (BlurView), qui donne
  // le même effet en natif comme sur web. Couleurs alignées sur
  // --glass-bg/--glass-border/--glass-highlight de PPL (src/index.css).
  const glass = isGlass
    ? {
        bg: theme.isDark ? "rgba(40,40,52,0.55)" : "rgba(255,255,255,0.55)",
        border: theme.isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.6)",
      }
    : null;

  const triggers = visibleTabs.map((id) => {
    const defaults = TAB_DEFAULTS[id];
    return (
      <TabTrigger key={id} name={id} href={defaults.href} asChild>
        <TabButton icon={tabIcons[id] ?? defaults.icon} label={tabLabels[id] ?? defaults.label} />
      </TabTrigger>
    );
  });

  const listStyle = {
    flexDirection: "row" as const,
    overflow: "hidden" as const,
    alignSelf: "center" as const,
    width: "100%" as const,
    maxWidth: MAX_CONTENT_WIDTH - 20,
    borderRadius: tabBar.radius,
    marginHorizontal: 14,
    marginBottom: Math.max(insets.bottom, 12),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: isGlass ? 6 : 10 },
    shadowOpacity: isFloating || isGlass ? 0.12 : isGlass ? 0.24 : 0,
    shadowRadius: isGlass ? 24 : 26,
    elevation: isFloating || isGlass ? 10 : 0,
    ...(isGlass
      ? { backgroundColor: glass!.bg, borderWidth: 1, borderColor: glass!.border }
      : { backgroundColor: c.surface, borderWidth: isFloating ? 0 : 1, borderColor: c.border }),
  };

  // Important : <TabList> doit être un enfant DIRECT de <Tabs> (au même
  // niveau que <TabSlot />), sinon expo-router/ui ne détecte aucun
  // <TabTrigger> (il ne traverse que les Fragments et TabList, pas une
  // <View> intermédiaire) -> plus aucun écran trouvé pour le navigateur.
  // Pour "liquid-glass", on passe par TabList asChild + <BlurView> : le
  // Slot d'expo-router/ui fusionne le style de <TabList> sur le <BlurView>
  // (comme pour TabTrigger asChild + TabButton), donc <TabList> reste bien
  // l'enfant direct de <Tabs> tout en rendant un BlurView à la place d'une
  // View opaque.
  //
  // Bug web (barre du bas qui scrolle, défilement de toute la page au lieu
  // du contenu) : le <TabSlot /> d'expo-router/ui rend un ScreenContainer
  // avec flexShrink:0 en dur. Sur natif ça ne pose pas de problème (l'OS
  // borne le ScrollView à son cadre quoi qu'il arrive), mais sur web ce
  // flex-shrink:0 empêche le conteneur de se réduire à la hauteur
  // disponible : il grossit à la hauteur de son contenu, déborde de <Tabs>,
  // et c'est alors la page entière (html) qui devient scrollable au lieu du
  // ScrollView interne à chaque écran — ce qui fait aussi défiler la barre
  // du bas avec le reste. On corrige en réinjectant flexShrink:1 (comme un
  // flex:1 normal) + overflow:hidden en garde-fou.
  return (
    <Tabs style={{ flex: 1, backgroundColor: c.background }}>
      <TabSlot style={{ flexShrink: 1, flexBasis: 0, overflow: "hidden" }} />
      {isGlass ? (
        <TabList asChild style={listStyle}>
          <BlurView intensity={38} tint={theme.isDark ? "dark" : "light"}>
            {/* Reflet du haut, façon lentille — même principe que le
                "sheen" CSS de PPL (index.css / NavBar.tsx). */}
            <LinearGradient
              colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]}
              style={{
                position: "absolute",
                top: 0,
                left: "8%",
                right: "8%",
                height: "46%",
                borderTopLeftRadius: tabBar.radius,
                borderTopRightRadius: tabBar.radius,
              }}
              pointerEvents="none"
            />
            {triggers}
          </BlurView>
        </TabList>
      ) : (
        <TabList style={listStyle}>{triggers}</TabList>
      )}
    </Tabs>
  );
}
