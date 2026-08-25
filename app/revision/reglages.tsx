import React from "react";
import { View, Switch } from "react-native";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Screen } from "../../src/components/ui/Screen";
import { T } from "../../src/components/ui/Text";
import { Card } from "../../src/components/ui/Card";
import { Icon } from "../../src/components/ui/Icon";
import { SegmentedControl } from "../../src/components/ui/SegmentedControl";
import { useRevisionPreferencesStore, type RevisionTabId } from "../../src/store/useRevisionPreferencesStore";

const TAB_LABELS: Record<RevisionTabId, string> = {
  accueil: "Accueil",
  flashcards: "Flashcards",
  controles: "Contrôles",
};
const TAB_ORDER: RevisionTabId[] = ["accueil", "flashcards", "controles"];

export default function RevisionReglagesScreen() {
  const theme = useTheme();
  const tabsEnabled = useRevisionPreferencesStore((s) => s.tabsEnabled);
  const toggleTab = useRevisionPreferencesStore((s) => s.toggleTab);
  const animationsEnabled = useRevisionPreferencesStore((s) => s.animationsEnabled);
  const setAnimationsEnabled = useRevisionPreferencesStore((s) => s.setAnimationsEnabled);
  const readingFontScale = useRevisionPreferencesStore((s) => s.readingFontScale);
  const setReadingFontScale = useRevisionPreferencesStore((s) => s.setReadingFontScale);

  return (
    <Screen>
      <T variant="hero" style={{ marginBottom: theme.spacing(6) }}>
        Réglages de révision
      </T>

      <SectionTitle icon="grip" title="Barre de navigation" />
      <Card style={{ marginBottom: theme.spacing(6) }}>
        <T variant="caption" tone="secondary" style={{ marginBottom: theme.spacing(3) }}>
          Masque les onglets dont tu ne te sers pas. « Réglages » reste toujours accessible.
        </T>
        <View>
          {TAB_ORDER.map((id, i) => (
            <View
              key={id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: theme.spacing(2.5),
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: theme.colors.borderSoft,
              }}
            >
              <T variant="body" style={{ flex: 1 }}>
                {TAB_LABELS[id]}
              </T>
              <Switch
                value={tabsEnabled[id] !== false}
                onValueChange={() => toggleTab(id)}
                trackColor={{ false: theme.colors.borderSoft, true: theme.colors.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>
      </Card>

      <SectionTitle icon="sparkle" title="Animations et vibrations" />
      <Card style={{ marginBottom: theme.spacing(6) }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <T variant="body" style={{ flex: 1 }}>
            Rebonds, transitions et retour haptique
          </T>
          <Switch
            value={animationsEnabled}
            onValueChange={setAnimationsEnabled}
            trackColor={{ false: theme.colors.borderSoft, true: theme.colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      <SectionTitle icon="text" title="Confort de lecture" />
      <Card style={{ marginBottom: theme.spacing(8) }}>
        <T variant="caption" tone="secondary" style={{ marginBottom: theme.spacing(3) }}>
          Taille du texte des fiches, en plus du réglage général de l'appli — utile pour une lecture
          quotidienne toute l'année.
        </T>
        <SegmentedControl
          value={readingFontScale}
          onChange={setReadingFontScale}
          options={[
            { value: "sm", label: "Petit" },
            { value: "md", label: "Moyen" },
            { value: "lg", label: "Grand" },
          ]}
        />
      </Card>
    </Screen>
  );
}

function SectionTitle({ icon, title }: { icon: any; title: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: theme.spacing(3) }}>
      <Icon name={icon} size={16} color={theme.colors.textSecondary} />
      <T variant="subtitle">{title}</T>
    </View>
  );
}
