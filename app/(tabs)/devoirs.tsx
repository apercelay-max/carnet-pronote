import React, { useEffect, useCallback, useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTheme } from "../../src/theme/ThemeProvider";
import { useSessionStore } from "../../src/store/useSessionStore";
import { useDataStore } from "../../src/store/useDataStore";
import { usePreferencesStore } from "../../src/store/usePreferencesStore";
import { useLocalItemsStore } from "../../src/store/useLocalItemsStore";
import { devoirManuelToAssignment } from "../../src/lib/persoItems";
import { useDevoirsClasseStore, devoirsClasseEnAssignments } from "../../src/store/useDevoirsClasseStore";
import { useAccountStore } from "../../src/store/useAccountStore";
import { Screen } from "../../src/components/ui/Screen";
import { T } from "../../src/components/ui/Text";
import { RichText } from "../../src/components/ui/RichText";
import { celebrate } from "../../src/components/ui/Celebration";
import { Card } from "../../src/components/ui/Card";
import { Icon } from "../../src/components/ui/Icon";
import { SegmentedControl } from "../../src/components/ui/SegmentedControl";
import { Eyebrow, Chip, BigStat, StatTile, StatRow, Bar } from "../../src/components/ui/Stats";
import { colorForSubject } from "../../src/theme/palette";
import { formatDayLabel, formatShortDay } from "../../src/lib/format";
import {
  analyserDevoir,
  cleRecurrence,
  controleLie,
  dureeDevoir,
  JOURS_LONGS,
  jourRecurrent,
  LIBELLE_TYPE,
  planifier,
  prochainJourSemaine,
  scorePriorite,
  texteBrut,
  type TypeDevoir,
} from "../../src/lib/devoirsIntelligents";
import { ficheLiee, trouverLecon } from "../../src/lib/leconDevoir";
import { useDevoirsIntelStore } from "../../src/store/useDevoirsIntelStore";
import { useFichesStore } from "../../src/store/useFichesStore";
import type { Assignment } from "pawnote";

// Pronote donne un vrai signal de difficulté par devoir (mis par le prof) et
// une durée estimée. On s'en sert pour un classement par importance honnête
// -- pas de note inventée, juste ces deux signaux + l'urgence de la date.
function difficultyLabel(d: number): string | null {
  if (d === 1) return "Facile";
  if (d === 2) return "Moyen";
  if (d === 3) return "Difficile";
  return null;
}

function daysUntil(deadline: Date): number {
  const now = new Date();
  const ms = new Date(deadline).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0);
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

type SortMode = "date" | "importance";

export default function DevoirsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const isDemo = useSessionStore((s) => s.isDemo);
  const { assignments: assignmentsPronote, timetable, loading, refreshAll, toggleAssignmentDone } = useDataStore();
  const subjectColors = usePreferencesStore((s) => s.subjectColors);
  const devoirsManuels = useLocalItemsStore((s) => s.devoirsManuels);
  const toggleDevoirManuelFait = useLocalItemsStore((s) => s.toggleDevoirManuelFait);
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [masquerFaits, setMasquerFaits] = useState(false);
  const userId = useAccountStore((s) => s.userId);
  const devoirsClasse = useDevoirsClasseStore((s) => s.items);
  const chargerDevoirsClasse = useDevoirsClasseStore((s) => s.charger);
  const basculerDevoirClasse = useDevoirsClasseStore((s) => s.basculer);

  // Les devoirs ajoutés à la main ET ceux des groupes de classe sont fusionnés
  // avec ceux de Pronote et traités exactement pareil (tri, stats, regroupement
  // par date). Les drapeaux `perso` / `classe` servent juste à router l'action
  // « cocher » vers le bon store et à afficher une puce.
  const assignments = useMemo(
    () =>
      [
        ...assignmentsPronote,
        ...devoirsManuels.map(devoirManuelToAssignment),
        ...devoirsClasseEnAssignments(devoirsClasse, userId),
      ] as unknown as Assignment[],
    [assignmentsPronote, devoirsManuels, devoirsClasse, userId]
  );

  // Rechargé à chaque retour sur l'onglet : un camarade a pu ajouter un devoir
  // entre-temps, et c'est aussi là qu'on revient après en avoir publié un.
  useFocusEffect(
    useCallback(() => {
      if (userId) chargerDevoirsClasse();
    }, [userId, chargerDevoirsClasse])
  );

  const sync = useCallback(() => {
    if (session) refreshAll(session);
    if (userId) chargerDevoirsClasse();
  }, [session, refreshAll, userId, chargerDevoirsClasse]);

  // Confettis seulement quand on COCHE : décocher un devoir n'a rien d'une
  // victoire, et une volée de confettis à ce moment-là serait juste pénible.
  const toggle = useCallback(
    (a: Assignment, done: boolean) => {
      if ((a as any).classe) basculerDevoirClasse((a as any).devoirId);
      else if ((a as any).perso) toggleDevoirManuelFait(a.id);
      else toggleAssignmentDone(session, a.id, done);
      if (done) celebrate();
    },
    [session, toggleAssignmentDone, toggleDevoirManuelFait, basculerDevoirClasse]
  );

  const ouvrir = (a: Assignment) => {
    if ((a as any).classe) return () => router.push(`/groupes/${(a as any).groupeId}` as any);
    if ((a as any).perso) return () => router.push(`/perso/devoir?id=${a.id}`);
    return undefined;
  };

  useEffect(() => {
    if (session && assignmentsPronote.length === 0) sync();
  }, [session]);

  // Les devoirs faits peuvent être masqués pour ne garder que le reste à faire.
  // Les stats du haut restent calculées sur la liste complète.
  const visibles = useMemo(
    () => (masquerFaits ? assignments.filter((a) => !a.done) : assignments),
    [assignments, masquerFaits]
  );

  const groups = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of visibles) {
      const key = a.deadline.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries()).sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );
  }, [visibles]);

  const byImportance = useMemo(() => {
    const todo = visibles.filter((a) => !a.done);
    const done = visibles.filter((a) => a.done);
    todo.sort((a, b) => scorePriorite(b, timetable) - scorePriorite(a, timetable));
    done.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
    return [...todo, ...done];
  }, [visibles, timetable]);

  // Devoirs qui reviennent chaque semaine : on retient à chaque synchro les
  // dates où l'on a vu un devoir « du même genre », puis on repère ceux qui
  // tombent toujours le même jour de la semaine.
  const noterVus = useDevoirsIntelStore((s) => s.noterVus);
  const vus = useDevoirsIntelStore((s) => s.vus);
  const ajouterDevoirManuel = useLocalItemsStore((s) => s.ajouterDevoirManuel);

  useEffect(() => {
    const releves: { cle: string; date: string }[] = [];
    for (const a of assignments) {
      const cle = cleRecurrence(a.subject?.name, a.description);
      if (cle) releves.push({ cle, date: isoDay(a.deadline) });
    }
    if (releves.length) noterVus(releves);
  }, [assignments, noterVus]);

  const recurrences = useMemo(() => {
    const res = new Map<string, { jour: number; prochaine: Date; dejaPrevu: boolean }>();
    for (const a of assignments) {
      const cle = cleRecurrence(a.subject?.name, a.description);
      const jour = cle ? jourRecurrent(vus[cle]) : null;
      if (!cle || jour == null) continue;
      const prochaine = prochainJourSemaine(jour);
      const dejaPrevu = assignments.some(
        (b) => cleRecurrence(b.subject?.name, b.description) === cle && isoDay(b.deadline) === isoDay(prochaine)
      );
      res.set(a.id, { jour, prochaine, dejaPrevu });
    }
    return res;
  }, [assignments, vus]);

  const prevoirProchain = useCallback(
    (a: Assignment, prochaine: Date) => {
      ajouterDevoirManuel({
        titre: texteBrut(a.description).slice(0, 120) || a.subject.name,
        matiere: a.subject.name,
        date: isoDay(prochaine),
        duree: a.length ?? null,
        note: "",
      });
    },
    [ajouterDevoirManuel]
  );

  const planning = useMemo(() => planifier(assignments), [assignments]);

  // Chiffres calculés uniquement sur ce que Pronote fournit vraiment :
  // la durée estimée n'est comptée que pour les devoirs qui en ont une.
  const stats = useMemo(() => {
    const restants = assignments.filter((a) => !a.done);
    // Durée du prof quand elle existe, sinon estimée d'après le texte du devoir.
    const durees = restants.map((a) => dureeDevoir(a));
    const minutes = durees.reduce((acc, d) => acc + (d.minutes ?? 0), 0);
    const avecDuree = durees.filter((d) => d.minutes != null).length;
    const estimees = durees.filter((d) => d.estimee).length;
    const urgents = restants.filter((a) => daysUntil(a.deadline) <= 1).length;
    return {
      total: assignments.length,
      restants: restants.length,
      faits: assignments.length - restants.length,
      minutes,
      avecDuree,
      estimees,
      urgents,
    };
  }, [assignments]);

  return (
    <Screen onRefresh={isDemo ? undefined : sync} refreshing={loading}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: theme.spacing(5),
        }}
      >
        <View>
          <Eyebrow color={theme.colors.accent}>Mon travail</Eyebrow>
          <T variant="hero" style={{ marginTop: 2 }}>
            Devoirs
          </T>
        </View>
        <Pressable
          onPress={() => router.push("/perso/devoir")}
          hitSlop={8}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: theme.spacing(3),
            height: 34,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.borderSoft,
          }}
        >
          <Icon name="plus" size={15} color={theme.colors.textPrimary} />
          <T variant="caption" weight="semibold">
            Ajouter
          </T>
        </Pressable>
      </View>

      {assignments.length > 0 && (
        <Card elevated style={{ marginBottom: theme.spacing(4) }}>
          <Eyebrow color={theme.colors.accent}>Reste à faire</Eyebrow>
          <View style={{ marginTop: 8, marginBottom: 12 }}>
            <BigStat
              value={String(stats.restants)}
              unit={stats.restants > 1 ? "devoirs" : "devoir"}
            />
          </View>
          <View style={{ marginBottom: 12 }}>
            <Bar value={stats.total ? stats.faits / stats.total : 0} color={theme.colors.accent} />
          </View>
          <StatRow>
            <StatTile label="Faits" value={`${stats.faits} / ${stats.total}`} color={theme.colors.success} />
            <StatTile
              label="Urgents"
              value={String(stats.urgents)}
              color={stats.urgents > 0 ? theme.colors.danger : undefined}
            />
            {/* On n'affiche le temps estimé que si Pronote en donne un :
                sinon ce serait un "0 min" trompeur. */}
            <StatTile
              label="Temps"
              value={stats.avecDuree > 0 ? `${stats.estimees > 0 ? "~" : ""}${formatMinutes(stats.minutes)}` : "—"}
            />
          </StatRow>
          {stats.avecDuree > 0 && stats.avecDuree < stats.restants ? (
            <T variant="caption" tone="tertiary" style={{ marginTop: 8 }}>
              Temps estimé sur {stats.avecDuree} devoir{stats.avecDuree > 1 ? "s" : ""} seulement — les
              autres n'ont pas de durée connue.
            </T>
          ) : null}
        </Card>
      )}

      {planning.length > 0 ? <PlanningCard planning={planning} subjectColors={subjectColors} /> : null}

      {assignments.length > 0 ? (
        <View style={{ marginBottom: theme.spacing(5) }}>
          <SegmentedControl
            value={sortMode}
            onChange={setSortMode}
            options={[
              { value: "date", label: "Par date" },
              { value: "importance", label: "Par importance" },
            ]}
          />
          {stats.faits > 0 ? (
            <Pressable
              onPress={() => setMasquerFaits((v) => !v)}
              hitSlop={8}
              accessibilityRole="switch"
              accessibilityState={{ checked: masquerFaits }}
              accessibilityLabel="Masquer les devoirs faits"
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                gap: 6,
                marginTop: theme.spacing(3),
              }}
            >
              <Icon
                name={masquerFaits ? "eyeOff" : "eye"}
                size={15}
                color={masquerFaits ? theme.colors.accent : theme.colors.textTertiary}
              />
              <T
                variant="caption"
                weight="semibold"
                style={{ color: masquerFaits ? theme.colors.accent : theme.colors.textTertiary }}
              >
                {masquerFaits
                  ? `${stats.faits} fait${stats.faits > 1 ? "s" : ""} masqué${stats.faits > 1 ? "s" : ""}`
                  : "Masquer les devoirs faits"}
              </T>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {groups.length === 0 ? (
        <Card>
          <T variant="body" tone="secondary">
            {assignments.length > 0 ? "Tout est fait, bravo !" : "Rien à rendre pour l'instant."}
          </T>
        </Card>
      ) : sortMode === "importance" ? (
        <View style={{ gap: theme.spacing(2.5) }}>
          {byImportance.map((a) => (
            <AssignmentRow
              key={a.id}
              assignment={a}
              color={colorForSubject(a.subject.name, subjectColors)}
              onToggle={() => toggle(a, !a.done)}
              onEdit={ouvrir(a)}
              recurrence={recurrences.get(a.id)}
              onPrevoir={prevoirProchain}
              showDate
            />
          ))}
        </View>
      ) : (
        <View style={{ gap: theme.spacing(6) }}>
          {groups.map(([dateKey, items]) => {
            const restants = items.filter((a) => !a.done).length;
            return (
              <View key={dateKey}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: theme.spacing(2),
                  }}
                >
                  {/* Rouge seulement s'il RESTE du travail à cette date : un jour
                      passé dont tout est fait n'a rien d'alarmant. */}
                  <Eyebrow
                    color={
                      restants > 0 && daysUntil(new Date(dateKey)) <= 1 ? theme.colors.danger : undefined
                    }
                  >
                    {formatDayLabel(new Date(dateKey))}
                  </Eyebrow>
                  <T variant="caption" tone="tertiary" weight="semibold">
                    {items.length - restants} / {items.length}
                  </T>
                </View>
                <View style={{ gap: theme.spacing(2.5) }}>
                  {items.map((a) => (
                    <AssignmentRow
                      key={a.id}
                      assignment={a}
                      color={colorForSubject(a.subject.name, subjectColors)}
                      onToggle={() => toggle(a, !a.done)}
                      onEdit={ouvrir(a)}
                      recurrence={recurrences.get(a.id)}
                      onPrevoir={prevoirProchain}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function isoDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

// Ce que l'analyse du devoir permet d'ajouter à sa carte : une puce par type,
// et une couleur pour les distinguer d'un coup d'œil.
const COULEUR_TYPE: Record<TypeDevoir, "accent" | "warning" | "success" | "danger" | "tertiary"> = {
  lecon: "accent",
  exercices: "tertiary",
  apporter: "warning",
  redaction: "success",
  expose: "success",
  papier: "danger",
};

function PlanningCard({
  planning,
  subjectColors,
}: {
  planning: ReturnType<typeof planifier>;
  subjectColors: Record<string, string>;
}) {
  const theme = useTheme();
  const [ouvert, setOuvert] = useState(true);
  const aujourdhui = new Date().toDateString();
  const jours = planning.slice(0, 4);
  return (
    <Card style={{ marginBottom: theme.spacing(4) }}>
      <Pressable
        onPress={() => setOuvert((o) => !o)}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
      >
        <Eyebrow color={theme.colors.accent}>Planning conseillé</Eyebrow>
        <Icon name={ouvert ? "chevronUp" : "chevronDown"} size={16} color={theme.colors.textTertiary} />
      </Pressable>
      {ouvert ? (
        <View style={{ marginTop: theme.spacing(3), gap: theme.spacing(4) }}>
          {jours.map((j) => (
            <View key={j.date.toISOString()} style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <T
                  variant="caption"
                  weight="semibold"
                  style={j.date.toDateString() === aujourdhui ? undefined : { textTransform: "capitalize" }}
                >
                  {j.date.toDateString() === aujourdhui ? "Ce soir" : formatDayLabel(j.date)}
                </T>
                <T variant="caption" tone={j.total > j.capacite ? "danger" : "tertiary"} weight="semibold">
                  {formatMinutes(j.total)}
                </T>
              </View>
              {j.taches.map((t) => (
                <View key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: colorForSubject(t.matiere, subjectColors),
                    }}
                  />
                  <T variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                    {t.matiere} · {t.titre}
                  </T>
                  <T variant="caption" tone="tertiary">
                    {t.estimee ? "~" : ""}
                    {t.minutes} min
                  </T>
                </View>
              ))}
            </View>
          ))}
          <T variant="caption" tone="tertiary">
            Charge répartie avant chaque échéance ; les durées marquées ~ sont estimées d'après le texte du devoir.
          </T>
        </View>
      ) : null}
    </Card>
  );
}

function AssignmentRow({
  assignment,
  color,
  onToggle,
  onEdit,
  recurrence,
  onPrevoir,
  showDate = false,
}: {
  assignment: Assignment;
  color: string;
  onToggle: () => void;
  onEdit?: () => void;
  recurrence?: { jour: number; prochaine: Date; dejaPrevu: boolean };
  onPrevoir?: (a: Assignment, prochaine: Date) => void;
  showDate?: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const timetable = useDataStore((s) => s.timetable);
  const resources = useDataStore((s) => s.resources);
  const fiches = useFichesStore((s) => s.fiches);
  const faites = useDevoirsIntelStore((s) => s.sousTachesFaites[assignment.id]);
  const basculerSousTache = useDevoirsIntelStore((s) => s.basculerSousTache);
  const [voirLecon, setVoirLecon] = useState(false);

  const perso = (assignment as any).perso === true;
  const groupeNom: string | undefined = (assignment as any).classe ? (assignment as any).groupeNom : undefined;
  const niveau = assignment.difficulty as unknown as number;
  const difficulty = difficultyLabel(niveau);
  const difficultyColor =
    niveau === 3 ? theme.colors.danger : niveau === 2 ? theme.colors.warning : theme.colors.success;
  const jours = daysUntil(assignment.deadline);
  const urgent = !assignment.done && jours <= 1;

  const analyse = useMemo(
    () => analyserDevoir(assignment.description, assignment.length),
    [assignment.description, assignment.length]
  );
  const actif = !assignment.done;
  const controle = useMemo(
    () => (actif ? controleLie(assignment.subject.name, timetable) : null),
    [actif, assignment.subject.name, timetable]
  );
  const lecon = useMemo(
    () => (actif && analyse.types.includes("lecon") ? trouverLecon(assignment.subject.name, analyse.leconCitee, resources) : null),
    [actif, analyse, assignment.subject.name, resources]
  );
  const fiche = useMemo(
    () => (actif && analyse.types.includes("lecon") ? ficheLiee(assignment.subject.name, analyse.leconCitee, fiches) : null),
    [actif, analyse, assignment.subject.name, fiches]
  );

  const sousTaches = analyse.sousTaches;
  const nbFaites = sousTaches.filter((t) => faites?.includes(t)).length;
  const cocherSousTache = (t: string) => {
    basculerSousTache(assignment.id, t);
    // La dernière sous-tâche cochée termine le devoir : inutile de cocher deux fois.
    const deviendraTout = !faites?.includes(t) && nbFaites + 1 === sousTaches.length;
    if (deviendraTout && !assignment.done) onToggle();
  };

  const couleurType = (t: TypeDevoir) => {
    const c = COULEUR_TYPE[t];
    return c === "accent"
      ? theme.colors.accent
      : c === "warning"
        ? theme.colors.warning
        : c === "success"
          ? theme.colors.success
          : c === "danger"
            ? theme.colors.danger
            : theme.colors.textTertiary;
  };
  const duree = dureeDevoir(assignment);

  return (
    <Card padded style={{ opacity: assignment.done ? 0.55 : 1 }} onPress={onEdit}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing(3) }}>
        <Pressable onPress={onToggle} hitSlop={8}>
          <Icon
            name={assignment.done ? "checkCircle" : "circle"}
            size={22}
            color={assignment.done ? theme.colors.success : urgent ? theme.colors.danger : theme.colors.textTertiary}
          />
        </Pressable>

        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
            <T variant="caption" weight="semibold" style={{ color }} numberOfLines={1}>
              {assignment.subject.name}
            </T>
            {perso ? <Chip color={theme.colors.accent} label="Perso" /> : null}
            {groupeNom ? <Chip color={theme.colors.accent} label={`Classe · ${groupeNom}`} /> : null}
          </View>

          {/* Pronote renvoie souvent la description en HTML : passer par
              RichText (et pas <T> directement) sinon les balises s'affichent. */}
          <RichText
            variant="body"
            style={
              assignment.done
                ? { textDecorationLine: "line-through", color: theme.colors.textTertiary, lineHeight: 21 }
                : { lineHeight: 21 }
            }
          >
            {assignment.description}
          </RichText>

          {/* Les métadonnées passent en puces teintées plutôt qu'en ligne de
              texte gris : c'est la présentation de PPL, et ça rend la
              difficulté lisible d'un coup d'œil grâce à la couleur. */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {showDate ? (
              <Chip
                color={urgent ? theme.colors.danger : theme.colors.textTertiary}
                label={formatDayLabel(assignment.deadline)}
              />
            ) : null}
            {analyse.types.map((t) => (
              <Chip key={t} color={couleurType(t)} label={LIBELLE_TYPE[t]} />
            ))}
            {duree.minutes ? (
              <Chip color={theme.colors.textTertiary} label={`${duree.estimee ? "≈" : "~"}${duree.minutes} min`} />
            ) : null}
            {difficulty ? <Chip color={difficultyColor} label={difficulty} /> : null}
            {controle ? (
              <Chip
                color={controle.jours <= 3 ? theme.colors.danger : theme.colors.warning}
                label={controle.jours === 0 ? "Contrôle aujourd'hui" : `Contrôle dans ${controle.jours} j`}
              />
            ) : null}
            {recurrence ? <Chip color={theme.colors.accent} label={`Chaque ${JOURS_LONGS[recurrence.jour]}`} /> : null}
          </View>

          {analyse.types.includes("apporter") && actif && analyse.objets.length > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="backpack" size={14} color={theme.colors.warning} />
              <T variant="caption" tone="secondary" style={{ flex: 1 }}>
                Dans le sac : {analyse.objets.join(", ")}
              </T>
            </View>
          ) : null}

          {sousTaches.length >= 2 && actif ? (
            <View style={{ gap: 6, marginTop: 2 }}>
              <T variant="caption" tone="tertiary" weight="semibold">
                {nbFaites} / {sousTaches.length} faits
              </T>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {sousTaches.map((t) => {
                  const fait = faites?.includes(t) ?? false;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => cocherSousTache(t)}
                      hitSlop={4}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: fait }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: theme.radius.sm,
                        borderWidth: 1,
                        borderColor: fait ? theme.colors.success : theme.colors.borderSoft,
                        backgroundColor: theme.colors.surface,
                      }}
                    >
                      <Icon
                        name={fait ? "checkCircle" : "circle"}
                        size={13}
                        color={fait ? theme.colors.success : theme.colors.textTertiary}
                      />
                      <T
                        variant="caption"
                        style={fait ? { textDecorationLine: "line-through", color: theme.colors.textTertiary } : undefined}
                      >
                        {t.replace("Exercice ", "Ex. ")}
                      </T>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {lecon ? (
            <View style={{ gap: 6, marginTop: 2 }}>
              <Pressable onPress={() => setVoirLecon((v) => !v)} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Icon name="book" size={14} color={theme.colors.accent} />
                <T variant="caption" weight="semibold" style={{ color: theme.colors.accent }}>
                  {voirLecon ? "Masquer la leçon" : "Voir la leçon"} · {lecon.titre}
                </T>
              </Pressable>
              {voirLecon ? (
                <View
                  style={{
                    padding: theme.spacing(3),
                    borderRadius: theme.radius.sm,
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.borderSoft,
                    gap: 4,
                  }}
                >
                  <T variant="caption" tone="tertiary">
                    Cahier de textes · {formatShortDay(lecon.date)}
                  </T>
                  <T variant="caption" style={{ lineHeight: 18 }}>
                    {lecon.texte ? lecon.texte.slice(0, 1200) : "Le prof n'a pas détaillé le contenu de ce cours."}
                  </T>
                </View>
              ) : null}
            </View>
          ) : null}

          {actif && (fiche || (controle && (analyse.types.includes("lecon") || analyse.types.includes("exercices")))) ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 2 }}>
              {fiche ? (
                <Pressable onPress={() => router.push(`/fiche/${fiche.id}` as any)} hitSlop={6}>
                  <T variant="caption" weight="semibold" style={{ color: theme.colors.accent }}>
                    Ouvrir ma fiche →
                  </T>
                </Pressable>
              ) : null}
              {controle && (analyse.types.includes("lecon") || analyse.types.includes("exercices")) ? (
                <Pressable onPress={() => router.push("/revision/controles" as any)} hitSlop={6}>
                  <T variant="caption" weight="semibold" style={{ color: theme.colors.accent }}>
                    Réviser pour le contrôle →
                  </T>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {recurrence && !recurrence.dejaPrevu && onPrevoir ? (
            <Pressable onPress={() => onPrevoir(assignment, recurrence.prochaine)} hitSlop={6}>
              <T variant="caption" weight="semibold" style={{ color: theme.colors.accent }}>
                + Prévoir le même devoir {formatShortDay(recurrence.prochaine)}
              </T>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
