import React, { useMemo } from "react";
import { View, Switch, Pressable, Alert } from "react-native";
import { useTheme } from "../../src/theme/ThemeProvider";
import { useSessionStore } from "../../src/store/useSessionStore";
import { useDataStore } from "../../src/store/useDataStore";
import {
  usePreferencesStore,
  WIDGET_LABELS,
  WidgetId,
} from "../../src/store/usePreferencesStore";
import { ACCENTS, ACCENT_ORDER, SUBJECT_PALETTE, colorForSubject } from "../../src/theme/palette";
import { Screen } from "../../src/components/ui/Screen";
import { T } from "../../src/components/ui/Text";
import { Card } from "../../src/components/ui/Card";
import { Icon } from "../../src/components/ui/Icon";
import { Button } from "../../src/components/ui/Button";
import { SegmentedControl } from "../../src/components/ui/SegmentedControl";
import { SwatchPicker } from "../../src/components/ui/SwatchPicker";

export default function ReglagesScreen() {
  const theme = useTheme();
  const displayName = useSessionStore((s) => s.displayName);
  const isDemo = useSessionStore((s) => s.isDemo);
  const logout = useSessionStore((s) => s.logout);
  const { grades } = useDataStore();

  const themeMode = usePreferencesStore((s) => s.themeMode);
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);
  const accent = usePreferencesStore((s) => s.accent);
  const setAccent = usePreferencesStore((s) => s.setAccent);
  const fontScale = usePreferencesStore((s) => s.fontScale);
  const setFontScale = usePreferencesStore((s) => s.setFontScale);
  const widgetOrder = usePreferencesStore((s) => s.widgetOrder);
  const hiddenWidgets = usePreferencesStore((s) => s.hiddenWidgets);
  const toggleWidget = usePreferencesStore((s) => s.toggleWidget);
  const reorderWidgets = usePreferencesStore((s) => s.reorderWidgets);
  const subjectColors = usePreferencesStore((s) => s.subjectColors);
  const setSubjectColor = usePreferencesStore((s) => s.setSubjectColor);
  const resetSubjectColor = usePreferencesStore((s) => s.resetSubjectColor);

  const subjects = useMemo(
    () => (grades?.subjectsAverages ?? []).map((s) => s.subject.name),
    [grades]
  );

  function move(id: WidgetId, dir: -1 | 1) {
    const idx = widgetOrder.indexOf(id);
    const next = idx + dir;
    if (next < 0 || next >= widgetOrder.length) return;
    const copy = [...widgetOrder];
    [copy[idx], copy[next]] = [copy[next], copy[idx]];
    reorderWidgets(copy);
  }

  function confirmLogout() {
    Alert.alert("Se déconnecter ?", "Tu devras te reconnecter avec ton identifiant Pronote.", [
      { text: "Annuler", style: "cancel" },
      { text: "Se déconnecter", style: "destructive", onPress: () => logout() },
    ]);
  }

  return (
    <Screen>
      <T variant="hero" style={{ marginBottom: theme.spacing(6) }}>
        Réglages
      </T>

      <SectionTitle icon="user" title="Compte" />
      <Card style={{ marginBottom: theme.spacing(6) }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3) }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.colors.accentSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="user" size={20} color={theme.colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="body" weight="semibold">
              {displayName ?? "—"}
            </T>
            <T variant="caption" tone="secondary">
              {isDemo ? "Mode démo" : "Connecté à Pronote"}
            </T>
          </View>
        </View>
        <View style={{ marginTop: theme.spacing(4) }}>
          <Button label="Se déconnecter" variant="secondary" onPress={confirmLogout} icon="close" />
        </View>
      </Card>

      <SectionTitle icon="palette" title="Apparence" />
      <Card style={{ marginBottom: theme.spacing(6), gap: theme.spacing(5) }}>
        <View style={{ gap: theme.spacing(2) }}>
          <T variant="caption" tone="secondary" weight="medium">
            Thème
          </T>
          <SegmentedControl
            value={themeMode}
            onChange={setThemeMode}
            options={[
              { value: "system", label: "Système" },
              { value: "dark", label: "Sombre" },
              { value: "light", label: "Clair" },
            ]}
          />
        </View>

        <View style={{ gap: theme.spacing(2) }}>
          <T variant="caption" tone="secondary" weight="medium">
            Taille du texte
          </T>
          <SegmentedControl
            value={fontScale}
            onChange={setFontScale}
            options={[
              { value: "sm", label: "Petit" },
              { value: "md", label: "Moyen" },
              { value: "lg", label: "Grand" },
            ]}
          />
        </View>

        <View style={{ gap: theme.spacing(2) }}>
          <T variant="caption" tone="secondary" weight="medium">
            Couleur d'accent
          </T>
          <SwatchPicker
            selected={accent}
            onSelect={(k) => setAccent(k as any)}
            swatches={ACCENT_ORDER.map((k) => ({ key: k, color: ACCENTS[k].value }))}
          />
        </View>
      </Card>

      <SectionTitle icon="dashboard" title="Tableau de bord" />
      <Card style={{ marginBottom: theme.spacing(6) }}>
        <View style={{ gap: theme.spacing(1) }}>
          {widgetOrder.map((id, i) => {
            const hidden = hiddenWidgets.includes(id);
            return (
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
                <Icon name="grip" size={16} color={theme.colors.textTertiary} />
                <T variant="body" style={{ flex: 1, marginLeft: 10 }} tone={hidden ? "tertiary" : "primary"}>
                  {WIDGET_LABELS[id]}
                </T>
                <Pressable onPress={() => move(id, -1)} hitSlop={8} style={{ padding: 4 }}>
                  <Icon name="chevronUp" size={16} color={theme.colors.textTertiary} />
                </Pressable>
                <Pressable onPress={() => move(id, 1)} hitSlop={8} style={{ padding: 4, marginRight: 8 }}>
                  <Icon name="chevronDown" size={16} color={theme.colors.textTertiary} />
                </Pressable>
                <Switch
                  value={!hidden}
                  onValueChange={() => toggleWidget(id)}
                  trackColor={{ false: theme.colors.borderSoft, true: theme.colors.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>
            );
          })}
        </View>
      </Card>

      <SectionTitle icon="notes" title="Couleurs des matières" />
      <Card style={{ marginBottom: theme.spacing(8) }}>
        {subjects.length === 0 ? (
          <T variant="body" tone="secondary">
            Connecte-toi pour personnaliser tes matières.
          </T>
        ) : (
          <View style={{ gap: theme.spacing(5) }}>
            {subjects.map((name) => (
              <View key={name} style={{ gap: theme.spacing(2) }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <T variant="body" weight="medium">
                    {name}
                  </T>
                  {subjectColors[name] ? (
                    <Pressable onPress={() => resetSubjectColor(name)}>
                      <T variant="caption" tone="accent">
                        Réinitialiser
                      </T>
                    </Pressable>
                  ) : null}
                </View>
                <SwatchPicker
                  size={26}
                  selected={colorForSubject(name, subjectColors)}
                  onSelect={(color) => setSubjectColor(name, color)}
                  swatches={SUBJECT_PALETTE.map((c) => ({ key: c, color: c }))}
                />
              </View>
            ))}
          </View>
        )}
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
