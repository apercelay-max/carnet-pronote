import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AccentKey } from "../theme/palette";
import { StyleId } from "../theme/styles";
import { IconName } from "../components/ui/Icon";

export type ThemeMode = "system" | "dark" | "light";
export type FontScaleKey = "sm" | "md" | "lg";

export type WidgetId =
  | "penseBete"
  | "prochainCours"
  | "moyenneGenerale"
  | "devoirsAVenir"
  | "controlesAVenir"
  | "dernieresNotes"
  | "vieScolaire"
  | "sacDeCours"
  | "competences"
  | "messagerie"
  | "actualites";

export const WIDGET_LABELS: Record<WidgetId, string> = {
  penseBete: "Pense-bête",
  prochainCours: "Prochain cours",
  moyenneGenerale: "Moyenne générale",
  devoirsAVenir: "Devoirs à venir",
  controlesAVenir: "Contrôles à venir",
  dernieresNotes: "Dernières notes",
  vieScolaire: "Vie scolaire",
  sacDeCours: "Sac de cours",
  competences: "Compétences évaluées",
  messagerie: "Messagerie",
  actualites: "Actualités",
};

const DEFAULT_WIDGET_ORDER: WidgetId[] = [
  "penseBete",
  "prochainCours",
  "moyenneGenerale",
  "sacDeCours",
  "devoirsAVenir",
  "controlesAVenir",
  "dernieresNotes",
  "vieScolaire",
  "competences",
  "messagerie",
  "actualites",
];

// Complète un ordre de widgets persisté (ancienne version de l'appli) avec
// les widgets ajoutés depuis -> on garde l'ordre choisi par la personne pour
// les widgets existants, et on ajoute les nouveaux à la fin plutôt que de les
// faire disparaître silencieusement.
function backfillWidgetOrder(persisted: WidgetId[] | undefined): WidgetId[] {
  if (!persisted) return DEFAULT_WIDGET_ORDER;
  const known = persisted.filter((id) => DEFAULT_WIDGET_ORDER.includes(id));
  const missing = DEFAULT_WIDGET_ORDER.filter((id) => !known.includes(id));
  return [...known, ...missing];
}

// Les 5 catégories de la barre du bas correspondent chacune à un vrai écran
// (fichier de route) : on ne peut pas en créer de nouvelles à la volée, mais
// on peut entièrement personnaliser celles qui existent — nom, icône, ordre,
// visibilité. "reglages" reste toujours accessible pour ne pas s'enfermer
// dehors des réglages en le masquant par erreur.
export type TabId = "index" | "notes" | "emploi-du-temps" | "devoirs" | "extensions" | "reglages";

export type TabDefaults = { href: string; label: string; icon: IconName };

export const TAB_DEFAULTS: Record<TabId, TabDefaults> = {
  index: { href: "/", label: "Accueil", icon: "dashboard" },
  notes: { href: "/notes", label: "Notes", icon: "notes" },
  // Libellé court : avec 6 onglets, « Emploi du temps » ne tient pas dans la
  // barre du bas et se retrouve tronqué. « EDT » est l'abréviation usuelle,
  // et le libellé reste renommable depuis les Réglages.
  "emploi-du-temps": { href: "/emploi-du-temps", label: "EDT", icon: "timetable" },
  devoirs: { href: "/devoirs", label: "Devoirs", icon: "homework" },
  extensions: { href: "/extensions", label: "Extensions", icon: "sparkle" },
  reglages: { href: "/reglages", label: "Réglages", icon: "settings" },
};

export const DEFAULT_TAB_ORDER: TabId[] = [
  "index",
  "notes",
  "emploi-du-temps",
  "devoirs",
  "extensions",
  "reglages",
];

// Une phrase courte par onglet, affichée uniquement dans le tiroir "+" de la
// barre liquid-glass (voir TabOverflowDrawer.tsx) — même esprit que
// TAB_HINTS dans PPL Tracker (NavBar.tsx) : ça évite d'avoir à deviner ce que
// contient un onglet qu'on a rangé et qu'on ouvre rarement.
export const TAB_HINTS: Record<TabId, string> = {
  index: "Ton tableau de bord du jour",
  notes: "Toutes tes notes et moyennes",
  "emploi-du-temps": "Ton emploi du temps de la semaine",
  devoirs: "Devoirs et contrôles à venir",
  extensions: "Flashcards, révisions et plus",
  reglages: "Apparence, barre de menus…",
};

// Même logique que backfillWidgetOrder : quelqu'un qui utilisait déjà l'app
// avant l'ajout d'un onglet a un tabOrder persisté qui ne le contient pas.
// Sans ce complément, le nouvel onglet n'apparaîtrait JAMAIS chez cette
// personne — bug silencieux et très difficile à repérer.
function backfillTabOrder(persisted: TabId[] | undefined): TabId[] {
  if (!persisted) return DEFAULT_TAB_ORDER;
  const known = persisted.filter((id) => DEFAULT_TAB_ORDER.includes(id));
  const missing = DEFAULT_TAB_ORDER.filter((id) => !known.includes(id));
  // Les nouveaux onglets s'insèrent avant "reglages", qui reste le dernier.
  const sansReglages = known.filter((id) => id !== "reglages");
  const avaitReglages = known.includes("reglages");
  return [
    ...sansReglages,
    ...missing.filter((id) => id !== "reglages"),
    ...(avaitReglages || missing.includes("reglages") ? (["reglages"] as TabId[]) : []),
  ];
}

// Choix d'icônes proposés pour personnaliser un onglet.
export const TAB_ICON_CHOICES: IconName[] = [
  "dashboard",
  "notes",
  "timetable",
  "homework",
  "settings",
  "book",
  "clock",
  "pin",
  "sparkle",
  "school",
  "bell",
  "checkCircle",
];

const NON_HIDEABLE_TAB: TabId = "reglages";

type PreferencesState = {
  themeMode: ThemeMode;
  styleId: StyleId;
  accent: AccentKey;
  fontScale: FontScaleKey;
  subjectColors: Record<string, string>;
  // Matériel à prendre par matière, saisi une fois dans Réglages. Aucune
  // valeur par défaut inventée : Pronote ne donne pas cette info, donc tant
  // que la personne n'a rien configuré pour une matière, le sac de cours le
  // signale au lieu d'inventer une liste plausible.
  subjectMaterials: Record<string, string[]>;
  widgetOrder: WidgetId[];
  hiddenWidgets: WidgetId[];
  tabOrder: TabId[];
  hiddenTabs: TabId[];
  tabLabels: Partial<Record<TabId, string>>;
  tabIcons: Partial<Record<TabId, IconName>>;
  // Onglets "rangés" derrière le bouton + de la barre liquid-glass (voir
  // _layout.tsx). Absence de cette liste = épinglé directement dans la
  // capsule ; c'est volontairement l'inverse d'une liste "pinnedTabs" pour
  // qu'un onglet ajouté plus tard (nouvel onglet, ou onglet qui réapparaît
  // après un backfill de tabOrder) soit épinglé par défaut sans rien à faire
  // ici. "reglages" ne doit jamais s'y trouver (toujours épinglé).
  tabOverflow: TabId[];
  // Signature (liste d'ids épinglés, jointe) de la config pour laquelle la
  // personne a déjà fermé le bandeau "barre trop chargée" — le bandeau ne
  // revient pas tant que la config épinglée ne change pas (même logique que
  // le localStorage de PPL Tracker, voir NavBar.tsx / DISMISS_KEY).
  tabBarDismissedSignature: string | null;
  setThemeMode: (mode: ThemeMode) => void;
  setStyle: (id: StyleId) => void;
  setAccent: (accent: AccentKey) => void;
  setFontScale: (scale: FontScaleKey) => void;
  setSubjectColor: (subject: string, color: string) => void;
  resetSubjectColor: (subject: string) => void;
  setSubjectMaterials: (subject: string, items: string[]) => void;
  addSubjectMaterial: (subject: string, item: string) => void;
  removeSubjectMaterial: (subject: string, item: string) => void;
  toggleWidget: (id: WidgetId) => void;
  reorderWidgets: (order: WidgetId[]) => void;
  reorderTabs: (order: TabId[]) => void;
  toggleTab: (id: TabId) => void;
  setTabLabel: (id: TabId, label: string) => void;
  resetTabLabel: (id: TabId) => void;
  setTabIcon: (id: TabId, icon: IconName) => void;
  resetTabIcon: (id: TabId) => void;
  // Épingle/dépingle un onglet dans la capsule liquid-glass. "reglages" est
  // ignoré (toujours épinglé) — sinon on perdrait l'accès au réglage qui
  // permet justement de gérer cette répartition.
  setTabPinned: (id: TabId, pinned: boolean) => void;
  // Remplace la liste complète des onglets rangés (utilisé par le bouton
  // "Ranger dans le +" du bandeau "barre trop chargée" : voir _layout.tsx).
  // Réinitialise aussi le bandeau ignoré, pour qu'il puisse réapparaître si
  // la config redevient trop chargée plus tard.
  setTabOverflow: (ids: TabId[]) => void;
  dismissTabBarCrowded: (signature: string) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      themeMode: "system",
      styleId: "forge",
      accent: "ciel",
      fontScale: "md",
      subjectColors: {},
      subjectMaterials: {},
      widgetOrder: DEFAULT_WIDGET_ORDER,
      hiddenWidgets: [],
      tabOrder: DEFAULT_TAB_ORDER,
      hiddenTabs: [],
      tabLabels: {},
      tabIcons: {},
      tabOverflow: [],
      tabBarDismissedSignature: null,
      setThemeMode: (themeMode) => set({ themeMode }),
      setStyle: (styleId) => set({ styleId }),
      setAccent: (accent) => set({ accent }),
      setFontScale: (fontScale) => set({ fontScale }),
      setSubjectColor: (subject, color) =>
        set((s) => ({ subjectColors: { ...s.subjectColors, [subject]: color } })),
      resetSubjectColor: (subject) =>
        set((s) => {
          const next = { ...s.subjectColors };
          delete next[subject];
          return { subjectColors: next };
        }),
      setSubjectMaterials: (subject, items) =>
        set((s) => ({ subjectMaterials: { ...s.subjectMaterials, [subject]: items } })),
      addSubjectMaterial: (subject, item) =>
        set((s) => {
          const trimmed = item.trim();
          if (!trimmed) return s;
          const current = s.subjectMaterials[subject] ?? [];
          if (current.includes(trimmed)) return s;
          return { subjectMaterials: { ...s.subjectMaterials, [subject]: [...current, trimmed] } };
        }),
      removeSubjectMaterial: (subject, item) =>
        set((s) => ({
          subjectMaterials: {
            ...s.subjectMaterials,
            [subject]: (s.subjectMaterials[subject] ?? []).filter((m) => m !== item),
          },
        })),
      toggleWidget: (id) =>
        set((s) => {
          const hidden = s.hiddenWidgets.includes(id);
          return {
            hiddenWidgets: hidden
              ? s.hiddenWidgets.filter((w) => w !== id)
              : [...s.hiddenWidgets, id],
          };
        }),
      reorderWidgets: (order) => set({ widgetOrder: order }),
      reorderTabs: (order) => set({ tabOrder: order }),
      toggleTab: (id) =>
        set((s) => {
          if (id === NON_HIDEABLE_TAB) return s;
          const hidden = s.hiddenTabs.includes(id);
          return {
            hiddenTabs: hidden ? s.hiddenTabs.filter((t) => t !== id) : [...s.hiddenTabs, id],
          };
        }),
      setTabLabel: (id, label) =>
        set((s) => ({ tabLabels: { ...s.tabLabels, [id]: label } })),
      resetTabLabel: (id) =>
        set((s) => {
          const next = { ...s.tabLabels };
          delete next[id];
          return { tabLabels: next };
        }),
      setTabIcon: (id, icon) =>
        set((s) => ({ tabIcons: { ...s.tabIcons, [id]: icon } })),
      resetTabIcon: (id) =>
        set((s) => {
          const next = { ...s.tabIcons };
          delete next[id];
          return { tabIcons: next };
        }),
      setTabPinned: (id, pinned) =>
        set((s) => {
          if (id === NON_HIDEABLE_TAB) return s;
          const isOverflow = s.tabOverflow.includes(id);
          if (pinned === !isOverflow) return s;
          return {
            tabOverflow: pinned ? s.tabOverflow.filter((t) => t !== id) : [...s.tabOverflow, id],
          };
        }),
      setTabOverflow: (ids) =>
        set({
          tabOverflow: ids.filter((id) => id !== NON_HIDEABLE_TAB),
          tabBarDismissedSignature: null,
        }),
      dismissTabBarCrowded: (signature) => set({ tabBarDismissedSignature: signature }),
    }),
    {
      name: "carnet-preferences",
      storage: createJSONStorage(() => AsyncStorage),
      // Les personnes qui avaient déjà l'app avant l'ajout des onglets
      // personnalisables n'ont pas tabOrder/hiddenTabs/etc. dans leur storage
      // persistant -> on les complète avec les valeurs par défaut au lieu de
      // planter ou de perdre la barre du bas.
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as object),
        tabOrder: backfillTabOrder((persisted as any)?.tabOrder),
        hiddenTabs: (persisted as any)?.hiddenTabs ?? current.hiddenTabs,
        tabLabels: (persisted as any)?.tabLabels ?? current.tabLabels,
        tabIcons: (persisted as any)?.tabIcons ?? current.tabIcons,
        // Les personnes qui avaient déjà l'app avant l'ajout des styles
        // n'ont pas styleId dans leur storage persistant -> Forge par défaut
        // (le style par défaut de l'app depuis la refonte de la présentation
        // des données). Celles qui en avaient choisi un gardent le leur.
        styleId: (persisted as any)?.styleId ?? current.styleId,
        widgetOrder: backfillWidgetOrder((persisted as any)?.widgetOrder),
        // Les personnes qui avaient déjà l'app avant l'ajout du sac de cours
        // n'ont pas subjectMaterials dans leur storage persistant -> objet vide.
        subjectMaterials: (persisted as any)?.subjectMaterials ?? current.subjectMaterials,
        // Les personnes qui avaient déjà l'app avant l'ajout des onglets
        // "rangés dans le +" n'ont pas tabOverflow dans leur storage persistant
        // -> tableau vide, donc TOUS leurs onglets restent épinglés (le
        // comportement d'avant), rien ne disparaît de la barre. On filtre
        // aussi les ids inconnus/"reglages" au cas où un ancien onglet aurait
        // été supprimé depuis, ou une valeur corrompue traînerait.
        tabOverflow: Array.isArray((persisted as any)?.tabOverflow)
          ? (persisted as any).tabOverflow.filter(
              (id: TabId) => DEFAULT_TAB_ORDER.includes(id) && id !== "reglages"
            )
          : current.tabOverflow,
        tabBarDismissedSignature:
          (persisted as any)?.tabBarDismissedSignature ?? current.tabBarDismissedSignature,
      }),
    }
  )
);
