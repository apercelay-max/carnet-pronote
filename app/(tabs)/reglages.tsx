import React, { useMemo, useState } from "react";
import { View, Switch, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
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
  TAB_BUBBLE_ACTIONS,
  CARD_SHAPE_RADIUS,
  CardShape,
  CardLayout,
  TabBarChoice,
  TabBubbleAction,
} from "../../src/store/usePreferencesStore";
import { ACCENTS, ACCENT_ORDER, SUBJECT_PALETTE, colorForSubject } from "../../src/theme/palette";
import { STYLE_ORDER, STYLE_META, STYLE_STRUCTURE } from "../../src/theme/styles";
import { allKnownSubjects } from "../../src/lib/subjects";
import { useLocalItemsStore } from "../../src/store/useLocalItemsStore";
import { confirmer } from "../../src/lib/confirmer";
import { Screen } from "../../src/components/ui/Screen";
import { T } from "../../src/components/ui/Text";
import { Card } from "../../src/components/ui/Card";
import { Icon } from "../../src/components/ui/Icon";
import { Button } from "../../src/components/ui/Button";
import { SegmentedControl } from "../../src/components/ui/SegmentedControl";
import { SwatchPicker } from "../../src/components/ui/SwatchPicker";
import { MotionSettings } from "../../src/components/ui/MotionSettings";
import { useAccountStore } from "../../src/store/useAccountStore";

export default function ReglagesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const compteEmail = useAccountStore((s) => s.email);
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
  const tabOverflow = usePreferencesStore((s) => s.tabOverflow);
  const reorderTabs = usePreferencesStore((s) => s.reorderTabs);
  const toggleTab = usePreferencesStore((s) => s.toggleTab);
  const setTabLabel = usePreferencesStore((s) => s.setTabLabel);
  const setTabIcon = usePreferencesStore((s) => s.setTabIcon);
  const setTabPinned = usePreferencesStore((s) => s.setTabPinned);
  const cardShape = usePreferencesStore((s) => s.cardShape);
  const setCardShape = usePreferencesStore((s) => s.setCardShape);
  const cardLayout = usePreferencesStore((s) => s.cardLayout);
  const setCardLayout = usePreferencesStore((s) => s.setCardLayout);
  const tabBarChoice = usePreferencesStore((s) => s.tabBarChoice);
  const setTabBarChoice = usePreferencesStore((s) => s.setTabBarChoice);
  const tabBubble = usePreferencesStore((s) => s.tabBubble);
  const setTabBubble = usePreferencesStore((s) => s.setTabBubble);
  const tabBubbleAction = usePreferencesStore((s) => s.tabBubbleAction);
  const setTabBubbleAction = usePreferencesStore((s) => s.setTabBubbleAction);

  // Le choix "épinglé dans la barre / rangé dans le +" n'a de sens visuel
  // que pour le traitement liquid-glass (Forge) — les 8 autres styles
  // affichent toujours tous les onglets visibles côte à côte, sans tiroir.
  const hasOverflowTabBar = theme.structure.tabBar.treatment === "liquid-glass";

  const [iconPickerTab, setIconPickerTab] = useState<TabId | null>(null);
  const [materialsOpenFor, setMaterialsOpenFor] = useState<string | null>(null);
  const [materialDraft, setMaterialDraft] = useState("");

  const syncCode = useLocalItemsStore((s) => s.syncCode);
  const syncMessage = useLocalItemsStore((s) => s.syncMessage);
  const nbPerso = useLocalItemsStore(
    (s) => s.penseBetes.length + s.devoirsManuels.length + s.creneauxPerso.length
  );
  const creerSyncCode = useLocalItemsStore((s) => s.creerSyncCode);
  const lierSyncCode = useLocalItemsStore((s) => s.lierSyncCode);
  const delierSync = useLocalItemsStore((s) => s.delierSync);
  const [codeDraft, setCodeDraft] = useState("");

  function confirmerDelier() {
    confirmer(
      "Délier cet appareil ?",
      "Il garde tes pense-bêtes, devoirs et créneaux perso actuels, mais ne se synchronisera plus avec tes autres appareils.",
      "Délier",
      () => delierSync()
    );
  }

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
    confirmer("Se déconnecter ?", "Tu devras te reconnecter avec ton identifiant Pronote.", "Se déconnecter", () =>
      logout()
    );
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
        {/* Le compte Carnet est SÉPARÉ du compte Pronote : il ne sert qu'à
            retrouver ses réglages et ses fiches sur un autre appareil. Les
            deux sont côte à côte ici pour que la différence saute aux yeux. */}
        <Pressable
          onPress={() => router.push("/compte")}
          style={{
            marginTop: theme.spacing(4),
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing(3),
            paddingTop: theme.spacing(4),
            borderTopWidth: 1,
            borderTopColor: theme.colors.borderSoft,
          }}
        >
          <Icon name="device" size={18} color={theme.colors.accent} />
          <View style={{ flex: 1 }}>
            <T variant="body">Compte Carnet</T>
            <T variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
              {compteEmail ?? "Retrouve tes réglages et tes fiches sur un autre appareil"}
            </T>
          </View>
          <Icon name="chevronRight" size={16} color={theme.colors.textTertiary} />
        </Pressable>

        <View style={{ marginTop: theme.spacing(4) }}>
          <Button label="Se déconnecter de Pronote" variant="secondary" onPress={confirmLogout} icon="close" />
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

      <SectionTitle icon="dashboard" title="Cartes" />
      <Card style={{ marginBottom: theme.spacing(6) }}>
        <View style={{ gap: theme.spacing(5) }}>
        <View style={{ gap: theme.spacing(2) }}>
          <T variant="caption" tone="secondary" weight="medium">
            Forme des cartes (partout dans l'appli)
          </T>
          <ChoiceGrid<CardShape>
            value={cardShape}
            onChange={setCardShape}
            options={[
              { value: "style", label: "Du style", preview: <ShapePreview radius={STYLE_STRUCTURE[styleId].card.radius} /> },
              { value: "carre", label: "Carrée", preview: <ShapePreview radius={CARD_SHAPE_RADIUS.carre} /> },
              { value: "doux", label: "Douce", preview: <ShapePreview radius={CARD_SHAPE_RADIUS.doux} /> },
              { value: "arrondi", label: "Arrondie", preview: <ShapePreview radius={CARD_SHAPE_RADIUS.arrondi} /> },
              { value: "bulle", label: "Bulle", preview: <ShapePreview radius={CARD_SHAPE_RADIUS.bulle} /> },
            ]}
          />
        </View>

        <View style={{ gap: theme.spacing(2) }}>
          <T variant="caption" tone="secondary" weight="medium">
            Disposition du tableau de bord (« Auto » suit la largeur de l'écran)
          </T>
          <ChoiceGrid<CardLayout>
            value={cardLayout}
            onChange={setCardLayout}
            options={[
              { value: "auto", label: "Auto", preview: <LayoutPreview layout="auto" /> },
              { value: "liste", label: "Liste", preview: <LayoutPreview layout="liste" /> },
              { value: "grille", label: "Grille", preview: <LayoutPreview layout="grille" /> },
              { value: "colonnes", label: "Colonnes", preview: <LayoutPreview layout="colonnes" /> },
              { value: "compact", label: "Compacte", preview: <LayoutPreview layout="compact" /> },
            ]}
          />
        </View>
        </View>
      </Card>

      <SectionTitle icon="sparkle" title="Animations" />
      <MotionSettings />

      <SectionTitle icon="grip" title="Barre du bas" />
      <Card style={{ marginBottom: theme.spacing(3) }}>
        <View style={{ gap: theme.spacing(5) }}>
        <View style={{ gap: theme.spacing(2) }}>
          <T variant="caption" tone="secondary" weight="medium">
            Style de la barre
          </T>
          <ChoiceGrid<TabBarChoice>
            value={tabBarChoice}
            onChange={setTabBarChoice}
            options={[
              { value: "style", label: "Du style", preview: <BarPreview treatment={STYLE_STRUCTURE[styleId].tabBar.treatment} /> },
              { value: "liquid-glass", label: "Verre", preview: <BarPreview treatment="liquid-glass" /> },
              { value: "floating-pill", label: "Pilule", preview: <BarPreview treatment="floating-pill" /> },
              { value: "bordered-panel", label: "Panneau", preview: <BarPreview treatment="bordered-panel" /> },
              { value: "solid-block", label: "Blocs", preview: <BarPreview treatment="solid-block" /> },
              { value: "tabbed-ruler", label: "Règle", preview: <BarPreview treatment="tabbed-ruler" /> },
            ]}
          />
        </View>

        <View style={{ gap: theme.spacing(3) }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3) }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: theme.colors.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name={TAB_BUBBLE_ACTIONS[tabBubbleAction].icon} size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <T weight="semibold">Bulle colorée séparée</T>
              <T variant="caption" tone="secondary">
                Un rond de couleur détaché à droite de la barre, comme sur PPL.
              </T>
            </View>
            <Switch
              value={tabBubble}
              onValueChange={setTabBubble}
              trackColor={{ false: theme.colors.borderSoft, true: theme.colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
          {tabBubble ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(Object.keys(TAB_BUBBLE_ACTIONS) as TabBubbleAction[]).map((id) => {
                const a = TAB_BUBBLE_ACTIONS[id];
                const active = id === tabBubbleAction;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setTabBubbleAction(id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? theme.colors.accent : theme.colors.borderSoft,
                      backgroundColor: active ? theme.colors.accentGlass : "transparent",
                    }}
                  >
                    <Icon name={a.icon} size={14} color={active ? theme.colors.accent : theme.colors.textSecondary} />
                    <T variant="caption" weight="semibold" style={{ color: active ? theme.colors.accent : theme.colors.textSecondary }}>
                      {a.label}
                    </T>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
        </View>
      </Card>
      <Card style={{ marginBottom: theme.spacing(6) }}>
        <T variant="caption" tone="secondary" style={{ marginBottom: theme.spacing(3) }}>
          Renomme, change l'icône, réordonne ou masque les catégories. « Réglages » reste
          toujours accessible pour ne pas te bloquer dehors.
          {hasOverflowTabBar
            ? " Avec la barre Verre, l'épingle garde l'onglet directement dans la barre — désépingle-le pour le ranger derrière le bouton +."
            : ""}
        </T>
        <View>
          {tabOrder.map((id, i) => {
            const hidden = hiddenTabs.includes(id);
            const locked = id === "reglages";
            const label = tabLabels[id] ?? TAB_DEFAULTS[id].label;
            const icon = tabIcons[id] ?? TAB_DEFAULTS[id].icon;
            const pickerOpen = iconPickerTab === id;
            // "reglages" reste toujours épinglé (voir setTabPinned) : pas la
            // peine d'afficher un contrôle qu'on ne peut pas actionner.
            const pinned = !tabOverflow.includes(id);
            const canTogglePin = hasOverflowTabBar && id !== "reglages" && !hidden;

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
                  {hasOverflowTabBar ? (
                    <Pressable
                      onPress={() => canTogglePin && setTabPinned(id, !pinned)}
                      disabled={!canTogglePin}
                      hitSlop={8}
                      accessibilityLabel={pinned ? "Épinglé dans la barre" : "Rangé dans le +"}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        marginRight: 8,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: pinned && !locked ? theme.colors.accentGlass : "transparent",
                        opacity: canTogglePin || locked ? 1 : 0.35,
                      }}
                    >
                      <Icon
                        name="pin"
                        size={15}
                        color={locked || pinned ? theme.colors.accent : theme.colors.textTertiary}
                      />
                    </Pressable>
                  ) : null}
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

      <SectionTitle icon="refresh" title="Synchro entre appareils" />
      <Card style={{ marginBottom: theme.spacing(6) }}>
        <T variant="caption" tone="secondary" style={{ marginBottom: theme.spacing(3), lineHeight: 18 }}>
          Retrouve tes pense-bêtes, devoirs et créneaux perso sur tes autres appareils. Un code
          suffit — aucun compte. Ça ne concerne que ce que tu ajoutes à la main : les données
          Pronote viennent toujours de ta connexion.
        </T>

        {syncCode ? (
          <View style={{ gap: theme.spacing(3) }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3) }}>
              <View
                style={{
                  paddingHorizontal: theme.spacing(4),
                  paddingVertical: theme.spacing(2),
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.surfaceElevated,
                  borderWidth: 1,
                  borderColor: theme.colors.borderSoft,
                }}
              >
                <T variant="subtitle" weight="semibold" style={{ letterSpacing: 3 }}>
                  {syncCode}
                </T>
              </View>
              <T variant="caption" tone="tertiary" style={{ flex: 1 }}>
                Saisis ce code sur ton autre appareil, dans ce même écran.
              </T>
            </View>
            <T variant="caption" tone={syncMessage.startsWith("Échec") ? "danger" : "tertiary"}>
              {syncMessage || `${nbPerso} élément${nbPerso > 1 ? "s" : ""} synchronisé${nbPerso > 1 ? "s" : ""}`}
            </T>
            <Pressable onPress={confirmerDelier}>
              <T variant="caption" tone="danger">
                Délier cet appareil
              </T>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: theme.spacing(3) }}>
            <Button label="Créer un code de synchro" icon="plus" onPress={creerSyncCode} />
            <T variant="caption" tone="tertiary">
              Ou entre un code déjà créé sur un autre appareil :
            </T>
            <View style={{ flexDirection: "row", gap: theme.spacing(2) }}>
              <TextInput
                value={codeDraft}
                onChangeText={(t) => setCodeDraft(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                placeholder="ABC123"
                autoCapitalize="characters"
                placeholderTextColor={theme.colors.textTertiary}
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.radius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  paddingHorizontal: theme.spacing(3),
                  paddingVertical: theme.spacing(3),
                  color: theme.colors.textPrimary,
                  fontSize: theme.type.body,
                  letterSpacing: 3,
                }}
              />
              <Pressable
                onPress={() => {
                  void lierSyncCode(codeDraft);
                  setCodeDraft("");
                }}
                disabled={codeDraft.length < 4}
                style={{
                  paddingHorizontal: theme.spacing(4),
                  justifyContent: "center",
                  borderRadius: theme.radius.md,
                  backgroundColor: codeDraft.length < 4 ? theme.colors.surfaceElevated : theme.colors.accent,
                }}
              >
                <T variant="caption" weight="semibold" style={{ color: codeDraft.length < 4 ? theme.colors.textTertiary : "#0B0D12" }}>
                  Lier
                </T>
              </Pressable>
            </View>
            {syncMessage ? (
              <T variant="caption" tone={syncMessage.startsWith("Échec") ? "danger" : "tertiary"}>
                {syncMessage}
              </T>
            ) : null}
          </View>
        )}
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

type Choice<V extends string> = { value: V; label: string; preview: React.ReactNode };

// Grille de choix avec un petit aperçu dessiné au-dessus du libellé : plus
// parlant qu'un simple SegmentedControl quand on choisit une forme.
function ChoiceGrid<V extends string>({
  options,
  value,
  onChange,
}: {
  options: Choice<V>[];
  value: V;
  onChange: (v: V) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              width: 76,
              alignItems: "center",
              gap: 6,
              paddingVertical: 10,
              borderRadius: theme.radius.md,
              borderWidth: active ? 1.5 : 1,
              borderColor: active ? theme.colors.accent : theme.colors.borderSoft,
              backgroundColor: active ? theme.colors.accentGlass : "transparent",
            }}
          >
            <View style={{ height: 36, justifyContent: "center", alignItems: "center" }}>{opt.preview}</View>
            <T
              variant="caption"
              weight="semibold"
              numberOfLines={1}
              style={{ fontSize: 11, color: active ? theme.colors.accent : theme.colors.textSecondary }}
            >
              {opt.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

function ShapePreview({ radius }: { radius: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 44,
        height: 32,
        // Aperçu 2x plus petit qu'une vraie carte : on divise l'arrondi pareil.
        borderRadius: Math.min(radius / 2, 16),
        backgroundColor: theme.colors.surfaceElevated,
        borderWidth: 1.5,
        borderColor: theme.colors.textTertiary,
      }}
    />
  );
}

function LayoutPreview({ layout }: { layout: CardLayout }) {
  const theme = useTheme();
  const block = (h: number, key: number) => (
    <View key={key} style={{ height: h, borderRadius: 2, backgroundColor: theme.colors.textTertiary, opacity: 0.7 }} />
  );
  if (layout === "grille") {
    return (
      <View style={{ width: 40, gap: 3 }}>
        {[0, 1].map((r) => (
          <View key={r} style={{ flexDirection: "row", gap: 3 }}>
            <View style={{ flex: 1 }}>{block(14, 0)}</View>
            <View style={{ flex: 1 }}>{block(14, 1)}</View>
          </View>
        ))}
      </View>
    );
  }
  if (layout === "colonnes") {
    return (
      <View style={{ width: 40, flexDirection: "row", gap: 3 }}>
        <View style={{ flex: 1, gap: 3 }}>{[block(18, 0), block(10, 1)]}</View>
        <View style={{ flex: 1, gap: 3 }}>{[block(9, 0), block(19, 1)]}</View>
      </View>
    );
  }
  if (layout === "auto") {
    // Téléphone (1 colonne) → écran large (2 colonnes), côte à côte.
    return (
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
        <View style={{ width: 12, gap: 2, padding: 1.5, borderRadius: 2, borderWidth: 1, borderColor: theme.colors.textTertiary }}>
          {[0, 1, 2].map((i) => block(4, i))}
        </View>
        <View style={{ width: 26, flexDirection: "row", gap: 2, padding: 1.5, borderRadius: 2, borderWidth: 1, borderColor: theme.colors.textTertiary }}>
          <View style={{ flex: 1, gap: 2 }}>{[block(7, 0), block(4, 1)]}</View>
          <View style={{ flex: 1, gap: 2 }}>{[block(4, 0), block(7, 1)]}</View>
        </View>
      </View>
    );
  }
  const compact = layout === "compact";
  return (
    <View style={{ width: 40, gap: compact ? 2 : 4 }}>
      {Array.from({ length: compact ? 4 : 3 }).map((_, i) => block(compact ? 6 : 8, i))}
    </View>
  );
}

function BarPreview({ treatment }: { treatment: string }) {
  const theme = useTheme();
  const c = theme.colors;
  const glass = treatment === "liquid-glass";
  const block = treatment === "solid-block";
  return (
    <View
      style={{
        width: 56,
        height: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-evenly",
        borderRadius: block ? 3 : treatment === "bordered-panel" ? 6 : 9,
        backgroundColor: glass ? c.accentGlass : c.surfaceElevated,
        borderWidth: treatment === "floating-pill" ? 0 : 1,
        borderColor: glass ? c.accent : c.border,
        shadowColor: "#000",
        shadowOpacity: treatment === "floating-pill" || glass ? 0.18 : 0,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      {[0, 1, 2].map((i) => {
        const active = i === 0;
        if (block) {
          return (
            <View key={i} style={{ width: 8, height: 8, borderRadius: 1, backgroundColor: active ? c.accent : c.textTertiary }} />
          );
        }
        return (
          <View key={i} style={{ alignItems: "center", gap: 1 }}>
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: active ? c.accent : c.textTertiary }} />
            {treatment === "tabbed-ruler" && active ? (
              <View style={{ width: 8, height: 1.5, backgroundColor: c.accent }} />
            ) : null}
          </View>
        );
      })}
    </View>
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
