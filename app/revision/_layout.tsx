import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../src/theme/ThemeProvider";
import { RevisionTabButton } from "../../src/components/ui/RevisionTabButton";
import { RevisionSessionBar } from "../../src/components/ui/RevisionSessionBar";
import { MAX_CONTENT_WIDTH } from "../../src/components/ui/Screen";
import { useRevisionPreferencesStore, type RevisionTabId } from "../../src/store/useRevisionPreferencesStore";
import { useRevisionSessionStore } from "../../src/store/useRevisionSessionStore";

// Noms de TabTrigger volontairement préfixés "revision" : "index"/"reglages"
// entrent en collision avec les noms utilisés par la barre à onglets
// globale (app/(tabs)/_layout.tsx), ce qui semble perturber la résolution
// de route d'expo-router/ui quand on navigue hors de ce groupe.
const TAB_DEFS: { id: RevisionTabId; routeName: string; href: string; label: string; icon: "school" | "book" | "clock" }[] = [
  { id: "accueil", routeName: "revisionIndex", href: "/revision", label: "Accueil", icon: "school" },
  { id: "flashcards", routeName: "revisionFlashcards", href: "/revision/flashcards", label: "Flashcards", icon: "book" },
  { id: "controles", routeName: "revisionControles", href: "/revision/controles", label: "Contrôles", icon: "clock" },
];

// Barre "verre liquide" dédiée à la section révision, calquée sur celle de
// PPL Tracker (voir NavBar.tsx dans le repo ppl-tracker) : contrairement à
// la barre globale de Carnet (qui ne prend ce traitement qu'avec le style
// Forge), celle-ci garde TOUJOURS le rendu verre/flou de PPL, quel que soit
// le style choisi ailleurs dans l'appli — seule la couleur d'accent (onglet
// actif) suit le réglage de personnalisation de la personne. C'est un choix
// délibéré : la demande était "la barre du bas, la même que PPL" pour cette
// section précise, pas "selon le style actif".
const RADIUS = 22;

export default function RevisionLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabsEnabled = useRevisionPreferencesStore((s) => s.tabsEnabled);
  const sessionActive = useRevisionSessionStore((s) => s.active);

  const glass = {
    bg: theme.isDark ? "rgba(40,40,52,0.55)" : "rgba(255,255,255,0.55)",
    border: theme.isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.6)",
  };

  const visibleTabs = TAB_DEFS.filter((t) => tabsEnabled[t.id] !== false);

  const triggers = [
    ...visibleTabs.map((t) => (
      <TabTrigger key={t.id} name={t.routeName} href={t.href} asChild>
        <RevisionTabButton icon={t.icon} label={t.label} />
      </TabTrigger>
    )),
    // "Réglages" n'est pas dans tabsEnabled : toujours visible, même logique
    // que NON_HIDEABLE_TAB dans usePreferencesStore (on ne s'enferme jamais
    // dehors de ses propres réglages).
    <TabTrigger key="reglages" name="revisionReglages" href="/revision/reglages" asChild>
      <RevisionTabButton icon="settings" label="Réglages" />
    </TabTrigger>,
  ];

  const shellStyle = {
    flexDirection: "row" as const,
    overflow: "hidden" as const,
    alignSelf: "center" as const,
    width: "100%" as const,
    maxWidth: MAX_CONTENT_WIDTH - 20,
    borderRadius: RADIUS,
    marginHorizontal: 14,
    marginBottom: Math.max(insets.bottom, 12),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 10,
    backgroundColor: glass.bg,
    borderWidth: 1,
    borderColor: glass.border,
  };

  // Important : <TabList> doit rester TOUJOURS monté, même pendant une
  // session de flashcards. Ce n'est pas qu'une barre de boutons : c'est ce
  // qui enregistre les écrans auprès du navigateur <Tabs> (via ses
  // <TabTrigger>). La retirer conditionnellement (comme un premier essai
  // l'avait fait) casse la navigation entière ("Couldn't find any screens
  // for the navigator"). On la garde donc montée en permanence, juste
  // rendue invisible et non-interactive pendant une session, avec
  // RevisionSessionBar superposée par-dessus au même endroit — même
  // contrainte que app/(tabs)/_layout.tsx : <TabList> doit rester un enfant
  // DIRECT de <Tabs> (au même niveau que <TabSlot/>), donc pas de View ni de
  // composant intermédiaire autour d'elle, seulement des props conditionnels
  // sur elle-même.
  return (
    <Tabs style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <TabSlot style={{ flexShrink: 1, flexBasis: 0, overflow: "hidden" }} />
      <TabList asChild style={sessionActive ? [shellStyle, { opacity: 0 }] : shellStyle}>
        <BlurView
          intensity={38}
          tint={theme.isDark ? "dark" : "light"}
          pointerEvents={sessionActive ? "none" : "auto"}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]}
            style={{
              position: "absolute",
              top: 0,
              left: "8%",
              right: "8%",
              height: "46%",
              borderTopLeftRadius: RADIUS,
              borderTopRightRadius: RADIUS,
            }}
            pointerEvents="none"
          />
          {triggers}
        </BlurView>
      </TabList>
      {sessionActive && (
        <RevisionSessionBar style={[shellStyle, { position: "absolute", left: 0, right: 0, bottom: 0 }]} />
      )}
    </Tabs>
  );
}
