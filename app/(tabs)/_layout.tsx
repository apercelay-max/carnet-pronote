import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname } from "expo-router";
import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../src/theme/ThemeProvider";
import { TabButton } from "../../src/components/ui/TabButton";
import { GlassTabButton } from "../../src/components/ui/GlassTabButton";
import { GlassPlusButton } from "../../src/components/ui/GlassPlusButton";
import { TabOverflowDrawer } from "../../src/components/ui/TabOverflowDrawer";
import { TabBarCrowdedBanner } from "../../src/components/ui/TabBarCrowdedBanner";
import { TAB_BAR_GRAIN_URI } from "../../src/components/ui/tabBarGrain";
import { MAX_CONTENT_WIDTH } from "../../src/components/ui/Screen";
import {
  usePreferencesStore,
  TAB_DEFAULTS,
  TAB_HINTS,
  TabId,
} from "../../src/store/usePreferencesStore";
import { useLocalItemsStore } from "../../src/store/useLocalItemsStore";

// Largeur minimale confortable pour un onglet de la barre liquid-glass
// (icône 22px + libellé 9px sur une ligne) — sous ce seuil les libellés se
// touchent ou se coupent. Mêmes valeurs que PPL Tracker (NavBar.tsx :
// MIN_TAB_WIDTH/GLASS_PADDING/TAB_GAP), padding+gap repris tels quels
// ci-dessous dans le style de la capsule pour que le calcul reste exact.
const MIN_TAB_WIDTH = 54;
const GLASS_PADDING = 12; // padding horizontal total de la capsule (6 + 6)
const TAB_GAP = 3;

// Résout l'onglet actif à partir du chemin courant, pour deux usages annexes
// uniquement (mise en avant du bouton "+" et protection de l'onglet actif
// dans "Ranger dans le +") — le focus réel de chaque bouton vient toujours
// du TabTrigger correspondant (isFocused via triggerMap), pas de cette
// approximation.
function resolveActiveTab(pathname: string, order: TabId[]): TabId {
  let best: TabId = order[0];
  let bestLen = -1;
  for (const id of order) {
    const href = TAB_DEFAULTS[id].href;
    if (href === "/") {
      if (pathname === "/" && href.length > bestLen) {
        best = id;
        bestLen = href.length;
      }
      continue;
    }
    if ((pathname === href || pathname.startsWith(href + "/")) && href.length > bestLen) {
      best = id;
      bestLen = href.length;
    }
  }
  return best;
}

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { tabBar } = theme.structure;
  const c = theme.colors;

  // Au lancement de l'app (et quand elle revient au premier plan via un
  // remontage), on récupère les éléments perso depuis Supabase si un code de
  // synchro est configuré. Les modifications locales, elles, sont repoussées
  // automatiquement par le store.
  const syncCode = useLocalItemsStore((s) => s.syncCode);
  const pullSync = useLocalItemsStore((s) => s.pullSync);
  useEffect(() => {
    if (syncCode) void pullSync();
  }, [syncCode, pullSync]);

  const tabOrder = usePreferencesStore((s) => s.tabOrder);
  const hiddenTabs = usePreferencesStore((s) => s.hiddenTabs);
  const tabLabels = usePreferencesStore((s) => s.tabLabels);
  const tabIcons = usePreferencesStore((s) => s.tabIcons);
  const tabOverflow = usePreferencesStore((s) => s.tabOverflow);
  const tabBarDismissedSignature = usePreferencesStore((s) => s.tabBarDismissedSignature);
  const setTabOverflow = usePreferencesStore((s) => s.setTabOverflow);
  const dismissTabBarCrowded = usePreferencesStore((s) => s.dismissTabBarCrowded);

  // "reglages" reste toujours visible même si l'état persisté est corrompu :
  // sinon, plus aucun moyen de rouvrir les réglages pour le réafficher.
  const visibleTabs = tabOrder.filter((id) => id === "reglages" || !hiddenTabs.includes(id));

  const isFloating = tabBar.treatment === "floating-pill";
  const isGlass = tabBar.treatment === "liquid-glass";

  // Parmi les onglets visibles, certains restent épinglés directement dans
  // la capsule ; les autres passent derrière le bouton + (voir Réglages →
  // Apparence → Barre du bas), pratique quand la barre est trop chargée.
  // "reglages" reste toujours épinglé — sinon on perdrait l'accès au réglage
  // qui permet justement de gérer cette répartition. Ce découpage n'existe
  // (et n'a de sens visuellement) que pour le traitement liquid-glass ; les
  // 8 autres styles gardent leur barre inchangée avec tous les onglets
  // visibles côte à côte.
  const pinnedTabs = isGlass ? visibleTabs.filter((id) => id === "reglages" || !tabOverflow.includes(id)) : visibleTabs;
  const overflowTabs = isGlass ? visibleTabs.filter((id) => id !== "reglages" && tabOverflow.includes(id)) : [];

  const activeTabId = useMemo(() => resolveActiveTab(pathname, tabOrder), [pathname, tabOrder]);
  const isOverflowActive = overflowTabs.includes(activeTabId);

  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => setMoreOpen(false), [pathname]);

  // Mesure la largeur (et la hauteur, pour positionner tiroir/bandeau juste
  // au-dessus) réelle de la capsule pour savoir combien d'onglets tiennent
  // vraiment à l'écran. onLayout plutôt que le ResizeObserver de PPL (pas
  // d'équivalent DOM en RN) — se déclenche aussi bien au montage qu'à une
  // rotation d'écran.
  const [capsuleSize, setCapsuleSize] = useState({ width: 0, height: 0 });
  const onCapsuleLayout = useCallback((e: any) => {
    const { width, height } = e.nativeEvent.layout;
    setCapsuleSize((prev) =>
      Math.abs(prev.width - width) > 1 || Math.abs(prev.height - height) > 1 ? { width, height } : prev
    );
  }, []);

  // Nombre de "cases" occupées : les onglets épinglés + le bouton "+" s'il
  // existe. Puis nombre de cases qui tiennent réellement dans la largeur.
  const slotCount = pinnedTabs.length + (overflowTabs.length > 0 ? 1 : 0);
  const fittingSlots = capsuleSize.width > 0
    ? Math.max(1, Math.floor((capsuleSize.width - GLASS_PADDING + TAB_GAP) / (MIN_TAB_WIDTH + TAB_GAP)))
    : slotCount;
  const crowded = capsuleSize.width > 0 && slotCount > fittingSlots;

  // Signature de la config actuelle : si la personne ignore le bandeau puis
  // épingle d'autres onglets plus tard, le bandeau revient (signature
  // différente).
  const pinnedSig = useMemo(() => pinnedTabs.join(","), [pinnedTabs]);
  const showCrowdedBanner = isGlass && crowded && !moreOpen && tabBarDismissedSignature !== pinnedSig;

  const dismissBanner = () => dismissTabBarCrowded(pinnedSig);

  // Range les onglets en trop derrière le "+" : garde épinglés les premiers
  // de la liste (ordre de tabOrder) + "reglages" (jamais dépinglable) +
  // l'onglet actif, et réserve une case pour le bouton "+".
  const tidyIntoOverflow = () => {
    const keepSlots = Math.max(1, fittingSlots - 1);
    const others = pinnedTabs.filter((id) => id !== "reglages") as TabId[];
    const activeIsOther = others.includes(activeTabId);
    const budget = Math.max(0, keepSlots - 1 - (activeIsOther ? 1 : 0));
    const next = [...tabOverflow];
    let used = 0;
    others.forEach((id) => {
      if (id === activeTabId) return;
      if (used < budget) {
        used += 1;
        return;
      }
      if (!next.includes(id)) next.push(id);
    });
    setTabOverflow(next);
  };

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
      ? {
          backgroundColor: glass!.bg,
          borderWidth: 1,
          borderColor: glass!.border,
          // Padding + espace entre onglets directement sur la capsule (et non
          // sur une View intermédiaire) : expo-router/ui ne détecte les
          // <TabTrigger> que s'ils sont enfants directs de <TabList> (via des
          // Fragments uniquement) — toute View entre les deux les rend
          // invisibles au routeur ("Couldn't find any screens for the
          // navigator"). Voir plus bas pour le détail.
          paddingHorizontal: 6,
          paddingVertical: 6,
          gap: 3,
        }
      : { backgroundColor: c.surface, borderWidth: isFloating ? 0 : 1, borderColor: c.border }),
  };

  // Décalage au-dessus de la barre pour le tiroir "+" et le bandeau "trop
  // chargée" : marge basse de la capsule + sa hauteur mesurée + un petit
  // espace, comme le calc() de PPL (drawerLayer/bannerLayer dans
  // NavBar.tsx). 58 en repli tant que la capsule n'a pas encore été mesurée
  // (jamais utilisé en pratique : tiroir/bandeau exigent tous deux une
  // mesure déjà faite pour s'ouvrir).
  const overlayBottomOffset = Math.max(insets.bottom, 12) + (capsuleSize.height || 58) + 10;

  const overflowRows = overflowTabs.map((id) => ({
    id,
    label: tabLabels[id] ?? TAB_DEFAULTS[id].label,
    icon: tabIcons[id] ?? TAB_DEFAULTS[id].icon,
    hint: TAB_HINTS[id],
  }));

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
  // Onglets rangés dans le "+" (overflowTabs) : leur TabTrigger doit malgré
  // tout être déclaré ici, à l'intérieur de <TabList> — c'est cette
  // déclaration qui enregistre la route auprès du navigateur (triggerMap),
  // sans quoi on ne pourrait pas du tout naviguer vers ces onglets. On les
  // rend donc quand même, mais réduits à un Pressable de taille nulle
  // (invisible, hors accessibilité) : le VRAI bouton pour ces onglets vit
  // dans le tiroir (TabOverflowDrawer.tsx), qui utilise un second
  // <TabTrigger name=...> SANS href, en dehors de <TabList> — c'est un usage
  // officiellement supporté par expo-router/ui pour des déclencheurs
  // personnalisés qui n'ont pas leur place dans la barre elle-même.
  //
  // IMPORTANT (même piège qu'au-dessus, un cran plus bas) : à l'intérieur du
  // <BlurView>, les <TabTrigger> doivent eux aussi être des enfants DIRECTS
  // (le parseur d'expo-router/ui ne traverse, là encore, que les Fragments —
  // pas une <View> "conteneur" ajoutée pour le padding/l'espacement). Le
  // reflet, le grain, le padding et l'espacement entre onglets sont donc
  // portés directement par le style du <BlurView> (voir listStyle) plutôt
  // que par une View intermédiaire.
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
        <>
          <TabList asChild style={listStyle} onLayout={onCapsuleLayout}>
            <BlurView intensity={38} tint={theme.isDark ? "dark" : "light"}>
              {/* Reflet spéculaire du haut — fonctionne partout (pur dégradé
                  CSS), façon lentille (sheen dans NavBar.tsx). N'atteint pas
                  les coins (inset 8% de chaque côté) donc n'a pas besoin
                  d'être recadré à l'arrondi de la capsule. */}
              <LinearGradient
                colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]}
                style={{ position: "absolute", top: 0, left: "8%", right: "8%", height: "46%" }}
                pointerEvents="none"
              />
              {/* Grain très fin pour casser l'aspect trop lisse du flou —
                  voir tabBarGrain.ts pour pourquoi c'est un PNG et pas le
                  filtre SVG feTurbulence de PPL (pas d'équivalent RN). Le
                  overflow:hidden déjà présent sur listStyle (ci-dessus)
                  recadre ce calque aux coins arrondis de la capsule. */}
              <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                <Image
                  source={{ uri: TAB_BAR_GRAIN_URI }}
                  resizeMode="repeat"
                  style={{ width: "100%", height: "100%", opacity: 0.4 }}
                />
              </View>

              {pinnedTabs.map((id) => (
                <TabTrigger key={id} name={id} href={TAB_DEFAULTS[id].href} asChild>
                  <GlassTabButton icon={tabIcons[id] ?? TAB_DEFAULTS[id].icon} label={tabLabels[id] ?? TAB_DEFAULTS[id].label} />
                </TabTrigger>
              ))}

              {overflowTabs.map((id) => (
                <TabTrigger key={id} name={id} href={TAB_DEFAULTS[id].href} asChild>
                  <Pressable
                    style={{ width: 0, height: 0, opacity: 0, flexGrow: 0, flexShrink: 0 }}
                    pointerEvents="none"
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                </TabTrigger>
              ))}

              {overflowTabs.length > 0 && (
                <GlassPlusButton open={moreOpen} active={isOverflowActive} onPress={() => setMoreOpen((v) => !v)} />
              )}
            </BlurView>
          </TabList>

          {moreOpen && overflowTabs.length > 0 && (
            <TabOverflowDrawer tabs={overflowRows} bottomOffset={overlayBottomOffset} onClose={() => setMoreOpen(false)} />
          )}

          {showCrowdedBanner && (
            <TabBarCrowdedBanner
              slotCount={slotCount}
              fittingSlots={fittingSlots}
              bottomOffset={overlayBottomOffset}
              onTidy={tidyIntoOverflow}
              onDismiss={dismissBanner}
            />
          )}
        </>
      ) : (
        <TabList style={listStyle}>{triggers}</TabList>
      )}
    </Tabs>
  );
}
