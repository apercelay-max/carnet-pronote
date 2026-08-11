import React, { useMemo, useState } from "react";
import { View, Switch, Pressable, TextInput, Alert } from "react-native";
import { useTheme } from "../../src/theme/ThemeProvider";
import { useSessionStore } from "../../src/store/useSessionStore";
import { useDataStore } from "../../src/store/useDataStore";
import {
  usePreferencesStore,
  WIDGET_LABELS,
  WidgetId,
  TabId,
  TAB_DEFAULTS,
  TAB_ICON_CHOICES,
} from "../../src/store/usePreferencesStore";
import { ACCENTS, ACCENT_ORDER, SUBJECT_PALETTE, colorForSubject } from "../../src/theme/palette";
import { STYLE_ORDER, STYLE_META } from "../../src/theme/styles";
import { allKnownSubjects } from "../../src/lib/subjects";
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
  const { grades, timetable, assignments, evaluations, resources } = useDataStore();

  const themeMode = usePreferencesStore((s) => s.themeMode);
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);
  const styleId = usePreferencesStore((s) => s.styleId);
  const setStyle = usePreferencesStore((s) => s.setStyle);
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
  const subjectMaterials = usePreferencesStore((s) => s.subjectMaterials);
  const addSubjectMaterial = usePreferencesStore((s) => s.addSubjectMaterial);
  const removeSubjectMaterial = usePreferencesStore((s) => s.removeSubjectMaterial);

  const tabOrder = usePreferencesStore((s) => s.tabOrder);
  const hiddenTabs = usePreferencesStore((s) => s.hiddenTabs);
  const tabLabels = usePreferencesStore((s) => s.tabLabels);
  const tabIcons = usePreferencesStore((s) => s.tabIcons);
  const reorderTabs = usePreferencesStore((s) => s.reorderTabs);
  const toggleTab = usePreferencesStore((s) => s.toggleTab);
  const setTabLabel = usePreferencesStore((s) => s.setTabLabel);
  const setTabIcon = usePreferencesStore((s) => s.setTabIcon);

  const [iconPickerTab, setIconPickerTab] = useState<TabId | null>(null);
  const [materialsOpenFor, setMaterialsOpenFor] = useState<string | null>(null);
  const [materialDraft, setMaterialDraft] = useState("");

  const subjects = useMemo(
    () => (grades?.subjectsAverages ?? []).map((s) => s.subject.name),
    [grades]
  );

  const allSubjects = useMemo(
    () => allKnownSubjects({ grades, timetable, assignments, evaluations, resources }),
    [grades, timetable, assignments, evaluations, resources]
  );

  function submitMaterialDraft(subjectName: string) {
    const trimmed = materialDraft.trim();
    if (trimmed) addSubjectMaterial(subjectName, trimmed);
    setMaterialDraft("");
  }

  function move(id: WidgetId, dir: -1 | 1) {
    const idx = widgetOrder.indexOf(id);
    const next = idx + dir;
    if (next < 0 || next >= widgetOrder.length) return;
    const copy = [...widgetOrder];
    [copy[idx], copy[next]] = [copy[next], copy[idx]];
    reorderWidgets(copy);
  }

  function moveTab(id: TabId, dir: -1 | 1) {
    const idx = tabOrder.indexOf(id);
    const next = idx + dir;
    if (next < 0 || next >= tabOrder.length) return;
    const copy = [...tabOrder];
    [copy[idx], copy[next]] = [copy[next], copy[idx]];
    reorderTabs(copy);
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
              backgroundColor: theme.colors.accentGlass,
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

      <SectionTitle icon="sparkle" title="Style" />
      <Card style={{ marginBottom: theme.spacing(6) }}>
        <T variant="caption" tone="secondary" style={{ marginBottom: theme.spacing(3) }}>
          Change complètement l'habillage de l'appli — formes, cartes, barre du bas. Chaque style
          existe en clair et en sombre, indépendamment du réglage Thème ci-dessous.
        </T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing(3) }}>
          {STYLE_ORDER.map((id) => {
            const meta = STYLE_META[id];
            const active = styleId === id;
            return (
              <Pressable
                key={id}
                onPress={() => setStyle(id)}
                style={{
                  flexBasis: "47%",
                  flexGrow: 1,
                  borderRadius: theme.radius.md,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? theme.colors.accent : theme.colors.borderSoft,
                  padding: theme.spacing(3),
                  backgroundColor: theme.colors.surfaceElevated,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: theme.spacing(2),
                  }}
                >
                  <View style={{ flexDirection: "row" }}>
                    {meta.swatch.map((color, i) => (
                      <View
                        key={i}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: color,
                          borderWidth: 1.5,
                          borderColor: theme.colors.surfaceElevated,
                          marginLeft: i === 0 ? 0 : -8,
                        }}
                      />
                    ))}
                  </View>
                  {active ? <Icon name="checkCircle" size={18} color={theme.colors.accent} /> : null}
                </View>
                <T variant="body" weight="semibold">
                  {meta.label}
                </T>
                <T variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                  {meta.description}
                </T>
              </Pressable>
            );
          })}
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

      <SectionTitle icon="grip" title="Barre du bas" />
      <Card style={{ marginBottom: theme.spacing(6) }}>
        <T variant="caption" tone="secondary" style={{ marginBottom: theme.spacing(3) }}>
          Renomme, change l'icône, réordonne ou masque les catégories. « Réglages » reste
          toujours accessible pour ne pas te bloquer dehors.
        </T>
        <View>
          {tabOrder.map((id, i) => {
            const hidden = hiddenTabs.includes(id);
            const locked = id === "reglages";
            const label = tabLabels[id] ?? TAB_DEFAULTS[id].label;
            const icon = tabIcons[id] ?? TAB_DEFAULTS[id].icon;
            const pickerOpen = iconPickerTab === id;

            return (
              <View
                key={id}
                style={{
                  paddingVertical: theme.spacing(2.5),
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: theme.colors.borderSoft,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Icon name="grip" size={16} color={theme.colors.textTertiary} />
                  <Pressable
                    onPress={() => setIconPickerTab(pickerOpen ? null : id)}
                    hitSlop={6}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      marginLeft: 10,
                      backgroundColor: theme.colors.accentGlass,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={icon} size={15} color={theme.colors.accent} />
                  </Pressable>
                  <TextInput
                    value={label}
                    onChangeText={(text) => setTabLabel(id, text)}
                    placeholder={TAB_DEFAULTS[id].label}
                    placeholderTextColor={theme.colors.textTertiary}
                    style={{
                      flex: 1,
                      marginLeft: 10,
                      marginRight: 4,
                      fontSize: theme.type.body,
                      color: hidden ? theme.colors.textTertiary : theme.colors.textPrimary,
                      paddingVertical: 4,
                    }}
                  />
                  <Pressable onPress={() => moveTab(id, -1)} hitSlop={8} style={{ padding: 4 }}>
                    <Icon name="chevronUp" size={16} color={theme.colors.textTertiary} />
                  </Pressable>
                  <Pressable onPress={() => moveTab(id, 1)} hitSlop={8} style={{ padding: 4, marginRight: 8 }}>
                    <Icon name="chevronDown" size={16} color={theme.colors.textTertiary} />
                  </Pressable>
                  <Switch
                    value={!hidden}
                    disabled={locked}
                    onValueChange={() => toggleTab(id)}
                    trackColor={{ false: theme.colors.borderSoft, true: theme.colors.accent }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {pickerOpen ? (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 10,
                      marginTop: theme.spacing(3),
                      marginLeft: 42,
                    }}
                  >
                    {TAB_ICON_CHOICES.map((choice) => {
                      const active = choice === icon;
                      return (
                        <Pressable
                          key={choice}
                          onPress={() => {
                            setTabIcon(id, choice);
                            setIconPickerTab(null);
                          }}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: active ? theme.colors.accentGlass : theme.colors.surfaceElevated,
                            borderWidth: active ? 1.5 : 1,
                            borderColor: active ? theme.colors.accent : theme.colors.borderSoft,
                          }}
                        >
                          <Icon
                            name={choice}
                            size={14}
                            color={active ? theme.colors.accent : theme.colors.textSecondary}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
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

      <SectionTitle icon="backpack" title="Sac de cours" />
      <Card style={{ marginBottom: theme.spacing(6) }}>
        <T variant="caption" tone="secondary" style={{ marginBottom: theme.spacing(3) }}>
          Indique le matériel à prendre pour chaque matière : le widget « Sac de cours » de
          l'accueil s'en sert avec ton vrai emploi du temps pour préparer le sac du prochain jour
          de cours. Rien n'est deviné — tant qu'une matière n'a rien ici, elle reste marquée « pas
          encore configuré ».
        </T>
        {allSubjects.length === 0 ? (
          <T variant="body" tone="secondary">
            Connecte-toi pour configurer tes matières.
          </T>
        ) : (
          <View>
            {allSubjects.map((s, i) => {
              const items = subjectMaterials[s.name] ?? [];
              const open = materialsOpenFor === s.name;
              return (
                <View
                  key={s.id}
                  style={{
                    paddingVertical: theme.spacing(3),
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: theme.colors.borderSoft,
                  }}
                >
                  <Pressable
                    onPress={() => {
                      setMaterialsOpenFor(open ? null : s.name);
                      setMaterialDraft("");
                    }}
                    style={{ flexDirection: "row", alignItems: "center" }}
                  >
                    <View style={{ flex: 1 }}>
                      <T variant="body" weight="medium">
                        {s.name}
                      </T>
                      <T variant="caption" tone={items.length ? "secondary" : "tertiary"} numberOfLines={1}>
                        {items.length ? items.join(" · ") : "Pas encore configuré"}
                      </T>
                    </View>
                    <Icon name={open ? "chevronUp" : "chevronDown"} size={16} color={theme.colors.textTertiary} />
                  </Pressable>

                  {open ? (
                    <View style={{ marginTop: theme.spacing(3), gap: theme.spacing(2) }}>
                      {items.length > 0 ? (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                          {items.map((item) => (
                            <Pressable
                              key={item}
                              onPress={() => removeSubjectMaterial(s.name, item)}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                                paddingVertical: 6,
                                paddingHorizontal: 10,
                                borderRadius: theme.radius.pill,
                                backgroundColor: theme.colors.accentGlass,
                              }}
                            >
                              <T variant="caption" tone="accent">
                                {item}
                              </T>
                              <Icon name="close" size={11} color={theme.colors.accent} />
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <TextInput
                          value={materialDraft}
                          onChangeText={setMaterialDraft}
                          onSubmitEditing={() => submitMaterialDraft(s.name)}
                          placeholder="Ajouter (ex. cahier, calculatrice…)"
                          placeholderTextColor={theme.colors.textTertiary}
                          style={{
                            flex: 1,
                            fontSize: theme.type.body,
                            color: theme.colors.textPrimary,
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            borderRadius: theme.radius.sm,
                            borderWidth: 1,
                            borderColor: theme.colors.borderSoft,
                            backgroundColor: theme.colors.surfaceElevated,
                          }}
                        />
                        <Pressable
                          onPress={() => submitMaterialDraft(s.name)}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: theme.colors.accent,
                          }}
                        >
                          <Icon name="plus" size={16} color="#0B0D12" />
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
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
