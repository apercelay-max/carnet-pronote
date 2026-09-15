import React, { useEffect, useMemo, useState } from "react";
import { View, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../theme/ThemeProvider";
import { useDataStore } from "../store/useDataStore";
import { useLocalItemsStore } from "../store/useLocalItemsStore";
import { useFichesStore } from "../store/useFichesStore";
import { useAccountStore } from "../store/useAccountStore";
import { useDevoirsClasseStore, devoirsClasseEnAssignments } from "../store/useDevoirsClasseStore";
import { usePreferencesStore } from "../store/usePreferencesStore";
import { devoirManuelToAssignment } from "../lib/persoItems";
import { rappelsDuJour, semaineAVenir } from "../lib/rappels";
import {
  demanderPermissionNotifications,
  notifierUneFoisParJour,
  permissionNotifications,
} from "../lib/notifications";
import { colorForSubject } from "../theme/palette";
import { formatDayLabel } from "../lib/format";
import { Card } from "./ui/Card";
import { T } from "./ui/Text";
import { Icon } from "./ui/Icon";
import { Eyebrow } from "./ui/Stats";

// Carte « Aujourd'hui » en tête de l'accueil : le plan de révision Gemini
// n'a de valeur que si quelqu'un rappelle de le suivre. Le vendredi soir et le
// week-end, elle montre aussi la semaine qui arrive.

const ICONES = { devoir: "homework", controle: "clock", revision: "sparkle" } as const;

export function AujourdhuiCard() {
  const theme = useTheme();
  const router = useRouter();
  const { assignments, timetable } = useDataStore();
  const devoirsManuels = useLocalItemsStore((s) => s.devoirsManuels);
  const fiches = useFichesStore((s) => s.fiches);
  const userId = useAccountStore((s) => s.userId);
  const devoirsClasse = useDevoirsClasseStore((s) => s.items);
  const chargerDevoirsClasse = useDevoirsClasseStore((s) => s.charger);
  const subjectColors = usePreferencesStore((s) => s.subjectColors);
  const [permission, setPermission] = useState(permissionNotifications());

  useEffect(() => {
    if (userId) chargerDevoirsClasse();
  }, [userId, chargerDevoirsClasse]);

  const tous = useMemo(
    () => [
      ...(assignments ?? []),
      ...devoirsManuels.map(devoirManuelToAssignment),
      ...devoirsClasseEnAssignments(devoirsClasse, userId),
    ],
    [assignments, devoirsManuels, devoirsClasse, userId]
  );

  const rappels = useMemo(() => rappelsDuJour({ assignments: tous, timetable, fiches }), [tous, timetable, fiches]);

  const maintenant = new Date();
  const jour = maintenant.getDay();
  const weekEnd = jour === 6 || jour === 0 || (jour === 5 && maintenant.getHours() >= 16);
  const semaine = useMemo(
    () => (weekEnd ? semaineAVenir({ assignments: tous, timetable }) : null),
    [weekEnd, tous, timetable]
  );

  // Récapitulatif en notification, une fois par jour, à partir de 16h : c'est
  // le moment où l'élève rentre et peut encore s'y mettre.
  useEffect(() => {
    if (permission !== "granted" || rappels.length === 0 || new Date().getHours() < 16) return;
    const corps = rappels
      .slice(0, 4)
      .map((r) => `• ${r.titre}${r.type === "devoir" ? "" : ` — ${r.detail}`}`)
      .join("\n");
    notifierUneFoisParJour("recap", `Carnet — ${rappels.length} chose${rappels.length > 1 ? "s" : ""} pour aujourd'hui`, corps);
  }, [permission, rappels]);

  if (rappels.length === 0 && !semaine) return null;

  return (
    <Card elevated style={{ marginBottom: theme.spacing(4) }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Eyebrow color={theme.colors.accent}>Aujourd'hui</Eyebrow>
        {Platform.OS === "web" && permission === "default" && rappels.length > 0 ? (
          <Pressable
            hitSlop={8}
            onPress={async () => {
              await demanderPermissionNotifications();
              setPermission(permissionNotifications());
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Icon name="bell" size={14} color={theme.colors.accent} />
            <T variant="caption" weight="semibold" style={{ color: theme.colors.accent }}>
              Me le rappeler
            </T>
          </Pressable>
        ) : null}
      </View>

      {rappels.length === 0 ? (
        <T variant="body" tone="secondary">
          Rien d'urgent aujourd'hui.
        </T>
      ) : (
        <View style={{ gap: 12 }}>
          {rappels.slice(0, 6).map((r) => {
            const color = r.urgent
              ? theme.colors.danger
              : r.matiere
                ? colorForSubject(r.matiere, subjectColors)
                : theme.colors.accent;
            return (
              <Pressable key={r.id} onPress={() => router.push(r.lien as any)} style={{ flexDirection: "row", gap: 10 }}>
                <Icon name={ICONES[r.type]} size={18} color={color} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="body" weight="semibold" numberOfLines={1}>
                    {r.titre}
                  </T>
                  <T variant="caption" tone="secondary" numberOfLines={3} style={{ lineHeight: 18 }}>
                    {r.detail}
                  </T>
                </View>
                <Icon name="chevronRight" size={14} color={theme.colors.textTertiary} />
              </Pressable>
            );
          })}
        </View>
      )}

      {semaine && (semaine.controles.length > 0 || semaine.nbDevoirs > 0) ? (
        <View
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: theme.colors.borderSoft,
            gap: 6,
          }}
        >
          <Eyebrow>Ta semaine qui arrive</Eyebrow>
          <T variant="caption" tone="secondary">
            {semaine.nbDevoirs} devoir{semaine.nbDevoirs > 1 ? "s" : ""} à rendre
            {semaine.controles.length
              ? ` · ${semaine.controles.length} contrôle${semaine.controles.length > 1 ? "s" : ""}`
              : ""}
          </T>
          {semaine.controles.map((c, i) => (
            <T key={i} variant="caption" style={{ color: colorForSubject(c.matiere, subjectColors) }}>
              • {c.matiere} — {formatDayLabel(c.date)}
            </T>
          ))}
        </View>
      ) : null}

      {permission === "granted" ? (
        <T variant="caption" tone="tertiary" style={{ marginTop: 12 }}>
          Rappel en notification quand tu ouvres l'app après 16h (une fois par jour).
        </T>
      ) : null}
    </Card>
  );
}
