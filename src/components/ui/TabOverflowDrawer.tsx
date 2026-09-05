import React from "react";
import { Pressable, View, ScrollView } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { TabTrigger } from "expo-router/ui";
import { useTheme } from "../../theme/ThemeProvider";
import { Icon, IconName } from "./Icon";
import { T } from "./Text";
import { DrawerRow } from "./DrawerRow";

type Row = { id: string; label: string; icon: IconName; hint: string };

type Props = {
  tabs: Row[];
  bottomOffset: number;
  onClose: () => void;
};

// Tiroir "+" façon PPL (drawer/drawerRow.. dans NavBar.tsx) : panneau en
// liste plein largeur plutôt que la grille d'icônes serrée d'avant, une ligne
// par onglet rangé (icône + libellé + description courte + coche sur
// l'onglet actif), qui s'anime en cascade à l'ouverture (Reanimated
// entering, voir DrawerRow.tsx).
//
// Contrairement à PPL (qui autorise le flou/la transparence partout dans sa
// UI), la règle du projet interdit tout flou/transparence en dehors de la
// capsule elle-même (régression de contraste passée) : le tiroir reste donc
// 100% opaque (theme.colors.surfaceElevated), pas de BlurView ici — comme
// les autres cartes de l'appli.
export function TabOverflowDrawer({ tabs, bottomOffset, onClose }: Props) {
  const theme = useTheme();
  const c = theme.colors;

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 4 }}>
      {/* Fond invisible pour fermer le tiroir en touchant en dehors. */}
      <Pressable
        onPress={onClose}
        accessibilityLabel="Fermer le menu"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", left: 0, right: 0, bottom: bottomOffset, alignItems: "center", paddingHorizontal: 14 }}
      >
        <Animated.View
          entering={FadeIn.duration(160)}
          style={{
            width: "100%",
            maxWidth: 460,
            borderRadius: theme.radius.xl,
            backgroundColor: c.surfaceElevated,
            borderWidth: 1,
            borderColor: c.border,
            maxHeight: "58%",
            paddingTop: 8,
            paddingBottom: 10,
            paddingHorizontal: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: theme.isDark ? 0.4 : 0.16,
            shadowRadius: 30,
            elevation: 12,
          }}
        >
          <View
            style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: c.borderSoft, alignSelf: "center", marginBottom: 8 }}
          />
          <T
            variant="caption"
            tone="tertiary"
            weight="bold"
            style={{ letterSpacing: 1.1, textTransform: "uppercase", paddingHorizontal: 10, paddingBottom: 6 }}
          >
            Plus
          </T>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={{ gap: 2 }}>
            {tabs.map((tab, i) => (
              <Animated.View key={tab.id} entering={FadeInDown.delay(Math.min(i, 8) * 28).duration(220)}>
                <TabTrigger name={tab.id} asChild>
                  <DrawerRow icon={tab.icon} label={tab.label} hint={tab.hint} onCloseAfterPress={onClose} />
                </TabTrigger>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}
