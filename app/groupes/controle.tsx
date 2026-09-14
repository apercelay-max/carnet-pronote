import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../src/theme/ThemeProvider";
import { colorForSubject, hexToRgba } from "../../src/theme/palette";
import { useAccountStore } from "../../src/store/useAccountStore";
import { useGroupesStore } from "../../src/store/useGroupesStore";
import { useFichesStore } from "../../src/store/useFichesStore";
import { usePreferencesStore } from "../../src/store/usePreferencesStore";
import { Screen } from "../../src/components/ui/Screen";
import { T } from "../../src/components/ui/Text";
import { Card } from "../../src/components/ui/Card";
import { Icon } from "../../src/components/ui/Icon";
import { Button } from "../../src/components/ui/Button";
import { Eyebrow, Chip, Bar, StatRow, StatTile } from "../../src/components/ui/Stats";
import { celebrate } from "../../src/components/ui/Celebration";
import { Bandeau, BoutonTeinte, Vide, confirmer, dateDepuisISO, pseudoDe } from "../../src/components/groupes/commun";
import { libelleDelai } from "../../src/components/groupes/RevisionGroupe";
import type { Carte } from "../../src/lib/fiches";
import { cartesDeFiche } from "../../src/lib/ficheGemini";
import { formatDayLabel } from "../../src/lib/format";
import { joursAvantISO, type FichePartagee, type Membre, type ScoreGroupe } from "../../src/lib/groupes";

// Révision d'un contrôle en groupe : les fiches partagées par la classe, un
// quiz commun construit à partir de ces fiches, et le classement.
//
// Les cartes viennent de cartesDepuisFiche, exactement comme les flashcards
// perso : aucune question inventée. Le quiz est un QCM dont les mauvaises
// réponses sont les réponses d'AUTRES cartes du même contrôle — c'est ce qui
// permet un score objectif (donc un classement qui a un sens) sans IA.

/** Nombre max de questions par partie : une partie doit tenir en 5 minutes. */
const QUESTIONS_PAR_PARTIE = 15;

type Question = { carte: Carte; options: string[] | null };

function melanger<T>(liste: T[]): T[] {
  const copie = liste.slice();
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

const cle = (s: string) => s.trim().toLowerCase();

/** Toutes les cartes des fiches partagées, sans doublon de question. */
function cartesDuControle(fiches: FichePartagee[]): Carte[] {
  const vues = new Set<string>();
  const out: Carte[] = [];
  for (const f of fiches) {
    let cartes: Carte[] = [];
    try {
      cartes = cartesDeFiche(f);
    } catch {
      // Une fiche partagée par une version plus ancienne (ou plus récente) de
      // l'app peut avoir une forme inattendue : on l'ignore plutôt que de
      // faire planter le quiz de toute la classe.
    }
    for (const c of cartes) {
      if (vues.has(cle(c.recto))) continue;
      vues.add(cle(c.recto));
      out.push(c);
    }
  }
  return out;
}

/**
 * QCM à 4 choix quand le contrôle a au moins 4 réponses différentes ; sinon la
 * question reste une carte à retourner (auto-évaluée), faute de leurres.
 */
function preparerPartie(cartes: Carte[]): Question[] {
  const reponses = Array.from(new Map(cartes.map((c) => [cle(c.verso), c.verso])).values());
  return melanger(cartes)
    .slice(0, QUESTIONS_PAR_PARTIE)
    .map((carte) => {
      const leurres = melanger(reponses.filter((r) => cle(r) !== cle(carte.verso))).slice(0, 3);
      return { carte, options: leurres.length === 3 ? melanger([carte.verso, ...leurres]) : null };
    });
}

export default function ControleGroupeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ groupe: string; id: string }>();
  const groupeId = String(params.groupe ?? "");
  const controleId = String(params.id ?? "");

  const statusCompte = useAccountStore((s) => s.status);
  const userId = useAccountStore((s) => s.userId);
  const bootstrapCompte = useAccountStore((s) => s.bootstrap);
  const subjectColors = usePreferencesStore((s) => s.subjectColors);
  const mesFiches = useFichesStore((s) => s.fiches);

  const actif = useGroupesStore((s) => s.actif);
  const ouvrir = useGroupesStore((s) => s.ouvrir);
  const chargerControle = useGroupesStore((s) => s.chargerControle);
  const partagerFiche = useGroupesStore((s) => s.partagerFiche);
  const retirerFiche = useGroupesStore((s) => s.retirerFiche);
  const retirerControle = useGroupesStore((s) => s.retirerControle);
  const enregistrerScore = useGroupesStore((s) => s.enregistrerScore);
  const fiches = useGroupesStore((s) => s.fichesParControle[controleId]);
  const scores = useGroupesStore((s) => s.scoresParControle[controleId]);

  const [choixOuvert, setChoixOuvert] = useState(false);
  const [partie, setPartie] = useState<Question[] | null>(null);

  const revenir = () => (router.canGoBack() ? router.back() : router.replace(`/groupes/${groupeId}`));

  useEffect(() => {
    if (statusCompte === "inconnu") bootstrapCompte();
  }, [statusCompte, bootstrapCompte]);

  // Ouvert par un lien direct (ou après un rechargement de page sur le web) :
  // le groupe n'est pas encore chargé, on l'ouvre. Pas de fermeture au
  // démontage ici : en navigation normale, c'est l'écran du groupe, resté
  // dessous, qui possède le canal temps réel.
  useEffect(() => {
    if (statusCompte !== "connecte" || !groupeId) return;
    if (actif?.groupeId !== groupeId) ouvrir(groupeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusCompte, groupeId]);

  useEffect(() => {
    if (statusCompte === "connecte" && controleId) chargerControle(controleId);
  }, [statusCompte, controleId, chargerControle]);

  const membres = actif?.groupeId === groupeId ? actif.membres : [];
  const controle = actif?.groupeId === groupeId ? actif.controles.find((c) => c.id === controleId) : undefined;
  const suisAdmin = membres.some((m) => m.userId === userId && m.role === "admin");
  const couleur = colorForSubject(controle?.matiere ?? "", subjectColors);

  const cartes = useMemo(() => cartesDuControle(fiches ?? []), [fiches]);

  // Mes fiches, celles de la même matière en premier : c'est presque toujours
  // celle-là qu'on veut partager.
  const fichesProposees = useMemo(() => {
    const m = cle(controle?.matiere ?? "");
    return mesFiches
      .map((f) => {
        let nb = 0;
        try {
          nb = cartesDeFiche(f).length;
        } catch {}
        const dejaPartagee = (fiches ?? []).some((p) => p.auteurId === userId && p.titre === f.titre);
        return { fiche: f, nb, dejaPartagee, memeMatiere: cle(f.matiere) === m };
      })
      .sort((a, b) => Number(b.memeMatiere) - Number(a.memeMatiere));
  }, [mesFiches, fiches, controle?.matiere, userId]);

  if (statusCompte !== "connecte" || !actif || actif.groupeId !== groupeId || (!controle && actif.chargement)) {
    return (
      <Screen>
        <View style={{ paddingTop: theme.spacing(10), alignItems: "center", gap: theme.spacing(4) }}>
          {statusCompte === "deconnecte" ? (
            <>
              <T variant="body" tone="secondary">
                Connecte-toi au compte Carnet pour ouvrir ce contrôle.
              </T>
              <Button label="Me connecter" icon="user" onPress={() => router.push("/compte")} />
            </>
          ) : (
            <ActivityIndicator color={theme.colors.accent} />
          )}
        </View>
      </Screen>
    );
  }

  if (!controle) {
    return (
      <Screen>
        <View style={{ gap: theme.spacing(4) }}>
          <Pressable onPress={revenir} hitSlop={10}>
            <Icon name="chevronLeft" size={22} color={theme.colors.textSecondary} />
          </Pressable>
          <Vide texte={actif.erreur ?? "Ce contrôle n'existe plus : il a peut-être été supprimé."} />
        </View>
      </Screen>
    );
  }

  if (partie) {
    return (
      <Quiz
        questions={partie}
        couleur={couleur}
        titre={controle.chapitre || controle.matiere}
        onTerminer={(bonnes, total) => enregistrerScore(controle.id, bonnes, total)}
        onRejouer={() => setPartie(preparerPartie(cartes))}
        onQuitter={() => setPartie(null)}
        classement={<Classement membres={membres} scores={scores ?? []} userId={userId} couleur={couleur} />}
      />
    );
  }

  const jours = joursAvantISO(controle.date);
  const peutSupprimerControle = controle.auteurId === userId || suisAdmin;

  return (
    <Screen onRefresh={() => chargerControle(controle.id)}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3), marginBottom: theme.spacing(5) }}>
        <Pressable onPress={revenir} hitSlop={10}>
          <Icon name="chevronLeft" size={22} color={theme.colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Eyebrow color={couleur}>{controle.matiere}</Eyebrow>
          <T variant="hero" style={{ marginTop: 2 }} numberOfLines={2}>
            {controle.chapitre || "Contrôle"}
          </T>
          <T variant="caption" tone="tertiary" style={{ marginTop: 4, textTransform: "capitalize" }}>
            {formatDayLabel(dateDepuisISO(controle.date))} · {libelleDelai(jours)}
          </T>
        </View>
      </View>

      {actif.erreur ? (
        <View style={{ marginBottom: theme.spacing(4) }}>
          <Bandeau ton="danger" texte={actif.erreur} />
        </View>
      ) : null}

      <Card elevated style={{ marginBottom: theme.spacing(5), gap: theme.spacing(3) }}>
        <StatRow>
          <StatTile label="Fiches" value={String(fiches?.length ?? 0)} color={couleur} />
          <StatTile label="Questions" value={String(cartes.length)} color={couleur} />
          <StatTile label="Joueurs" value={String((scores ?? []).length)} color={couleur} />
        </StatRow>
        {fiches === undefined ? (
          <ActivityIndicator color={couleur} />
        ) : cartes.length === 0 ? (
          <T variant="caption" tone="secondary" style={{ lineHeight: 18 }}>
            Pas encore de question : partage une fiche qui contient des définitions ou des mots-clés,
            le quiz se construit à partir d'elles.
          </T>
        ) : (
          <Button
            label={`Lancer le quiz (${Math.min(cartes.length, QUESTIONS_PAR_PARTIE)} questions)`}
            icon="target"
            onPress={() => setPartie(preparerPartie(cartes))}
          />
        )}
      </Card>

      <View style={{ marginBottom: theme.spacing(3) }}>
        <Eyebrow>Classement</Eyebrow>
      </View>
      <View style={{ marginBottom: theme.spacing(6) }}>
        <Classement membres={membres} scores={scores ?? []} userId={userId} couleur={couleur} />
      </View>

      <View style={{ marginBottom: theme.spacing(3) }}>
        <Eyebrow>Fiches partagées</Eyebrow>
      </View>
      <View style={{ gap: theme.spacing(3), marginBottom: theme.spacing(4) }}>
        {(fiches ?? []).length === 0 && fiches !== undefined ? (
          <Vide texte="Personne n'a encore partagé de fiche pour ce contrôle." />
        ) : null}
        {(fiches ?? []).map((f) => {
          let nb = 0;
          try {
            nb = cartesDeFiche(f).length;
          } catch {}
          const peutRetirer = f.auteurId === userId || suisAdmin;
          return (
            <Card key={f.id} padded tint={couleur}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ flex: 1, gap: 5 }}>
                  <T variant="body" weight="semibold" numberOfLines={1}>
                    {f.titre}
                  </T>
                  <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                    <Chip color={theme.colors.textTertiary} label={f.auteurId === userId ? "Toi" : pseudoDe(membres, f.auteurId)} />
                    <Chip color={couleur} label={`${nb} question${nb > 1 ? "s" : ""}`} />
                  </View>
                </View>
                {peutRetirer ? (
                  <Pressable
                    hitSlop={10}
                    onPress={() =>
                      confirmer("Retirer cette fiche ?", "Ses questions ne feront plus partie du quiz.", "Retirer", () =>
                        retirerFiche(controle.id, f.id)
                      )
                    }
                  >
                    <Icon name="trash" size={16} color={theme.colors.textTertiary} />
                  </Pressable>
                ) : null}
              </View>
            </Card>
          );
        })}
      </View>

      <BoutonTeinte
        label={choixOuvert ? "Fermer" : "Partager une de mes fiches"}
        icon={choixOuvert ? "close" : "share"}
        onPress={() => setChoixOuvert((v) => !v)}
        color={couleur}
      />

      {choixOuvert ? (
        <View style={{ gap: theme.spacing(2), marginTop: theme.spacing(3) }}>
          {fichesProposees.length === 0 ? (
            <Vide texte="Tu n'as aucune fiche sur cet appareil. Crée-en une dans l'espace révision." />
          ) : null}
          {fichesProposees.map(({ fiche, nb, dejaPartagee }) => (
            <Pressable
              key={fiche.id}
              disabled={dejaPartagee}
              onPress={async () => {
                if (await partagerFiche(controle.id, { titre: fiche.titre, matiere: fiche.matiere, genere: fiche.genere, ia: fiche.ia }))
                  setChoixOuvert(false);
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                padding: theme.spacing(3),
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: theme.colors.borderSoft,
                backgroundColor: theme.colors.surface,
                opacity: dejaPartagee ? 0.5 : pressed ? 0.8 : 1,
              })}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="caption" weight="semibold" numberOfLines={1}>
                  {fiche.titre}
                </T>
                <T variant="caption" tone="tertiary">
                  {[fiche.matiere, `${nb} question${nb > 1 ? "s" : ""}`, dejaPartagee ? "déjà partagée" : ""]
                    .filter(Boolean)
                    .join(" · ")}
                </T>
              </View>
              <Icon name={dejaPartagee ? "check" : "share"} size={15} color={couleur} />
            </Pressable>
          ))}
          <T variant="caption" tone="tertiary" style={{ lineHeight: 18 }}>
            On partage le contenu de la fiche (résumé, points, définitions, mots-clés), pas le texte
            du cours que tu as collé pour la créer.
          </T>
        </View>
      ) : null}

      {peutSupprimerControle ? (
        <Pressable
          onPress={() =>
            confirmer(
              "Supprimer ce contrôle ?",
              "Les fiches partagées et le classement seront supprimés pour tout le groupe.",
              "Supprimer",
              async () => {
                await retirerControle(controle.id);
                revenir();
              }
            )
          }
          style={{ marginTop: theme.spacing(8), alignItems: "center" }}
        >
          <T variant="caption" tone="danger">
            Supprimer ce contrôle
          </T>
        </Pressable>
      ) : null}
    </Screen>
  );
}

// --- Classement -------------------------------------------------------------

function Classement({
  membres,
  scores,
  userId,
  couleur,
}: {
  membres: Membre[];
  scores: ScoreGroupe[];
  userId: string | null;
  couleur: string;
}) {
  const theme = useTheme();

  // Tous les membres apparaissent, même ceux qui n'ont pas joué : voir « pas
  // encore joué » à côté de son nom est plus motivant qu'être absent.
  const lignes = useMemo(() => {
    const parUser = new Map(scores.map((s) => [s.userId, s]));
    return membres
      .map((m) => ({ membre: m, score: parUser.get(m.userId) ?? null }))
      .sort((a, b) => (b.score?.meilleurPct ?? -1) - (a.score?.meilleurPct ?? -1));
  }, [membres, scores]);

  return (
    <Card padded style={{ gap: theme.spacing(3) }}>
      {lignes.map(({ membre, score }, i) => {
        const moi = membre.userId === userId;
        return (
          <View key={membre.userId} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <T variant="body" weight="bold" style={{ width: 22, color: score && i < 3 ? couleur : theme.colors.textTertiary }}>
              {score ? i + 1 : "–"}
            </T>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <T variant="caption" weight={moi ? "bold" : "semibold"} numberOfLines={1} style={{ flex: 1 }}>
                  {membre.pseudo}
                  {moi ? " (toi)" : ""}
                </T>
                <T variant="caption" weight="semibold" style={{ color: score ? couleur : theme.colors.textTertiary }}>
                  {score ? `${score.meilleurPct} %` : "Pas encore joué"}
                </T>
              </View>
              {score ? (
                <>
                  <Bar value={score.meilleurPct / 100} color={couleur} height={4} />
                  <T variant="caption" tone="tertiary" style={{ fontSize: 11 }}>
                    Dernière partie {score.dernierScore}/{score.dernierTotal} · {score.parties} partie
                    {score.parties > 1 ? "s" : ""}
                  </T>
                </>
              ) : null}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

// --- Quiz -------------------------------------------------------------------

function Quiz({
  questions,
  couleur,
  titre,
  onTerminer,
  onRejouer,
  onQuitter,
  classement,
}: {
  questions: Question[];
  couleur: string;
  titre: string;
  onTerminer: (bonnes: number, total: number) => void;
  onRejouer: () => void;
  onQuitter: () => void;
  classement: React.ReactNode;
}) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [choix, setChoix] = useState<string | null>(null);
  const [retournee, setRetournee] = useState(false);
  const [bonnes, setBonnes] = useState(0);
  const envoye = useRef(false);

  const total = questions.length;
  const fini = index >= total;
  const q = questions[index];

  // Score envoyé UNE fois, à la fin : pas de score partiel si on quitte en
  // cours de route (sinon abandonner ferait baisser « dernière partie »).
  useEffect(() => {
    if (!fini || envoye.current || total === 0) return;
    envoye.current = true;
    onTerminer(bonnes, total);
    if (bonnes / total >= 0.8) celebrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fini]);

  function suivante(bonne: boolean) {
    if (bonne) setBonnes((b) => b + 1);
    setChoix(null);
    setRetournee(false);
    setIndex((i) => i + 1);
  }

  if (fini) {
    return (
      <Screen>
        <View style={{ marginBottom: theme.spacing(5) }}>
          <Eyebrow color={couleur}>{titre}</Eyebrow>
          <T variant="hero" style={{ marginTop: 2 }}>
            Terminé
          </T>
        </View>
        <Card elevated style={{ marginBottom: theme.spacing(5), gap: theme.spacing(3) }}>
          <Eyebrow color={couleur}>Ton score</Eyebrow>
          <T
            style={{
              fontSize: 46 * theme.fontScale,
              lineHeight: 50 * theme.fontScale,
              fontWeight: "800",
              letterSpacing: -1.5,
              color: theme.colors.textPrimary,
            }}
          >
            {bonnes} / {total}
          </T>
          <Bar value={total ? bonnes / total : 0} color={theme.colors.success} />
          <T variant="caption" tone="tertiary">
            Ton meilleur score compte pour le classement, et le groupe voit ta dernière partie.
          </T>
        </Card>
        <View style={{ marginBottom: theme.spacing(3) }}>
          <Eyebrow>Classement</Eyebrow>
        </View>
        <View style={{ marginBottom: theme.spacing(5) }}>{classement}</View>
        <View style={{ gap: theme.spacing(3) }}>
          <Button label="Rejouer" icon="refresh" onPress={onRejouer} />
          <Button label="Retour au contrôle" variant="secondary" onPress={onQuitter} />
        </View>
      </Screen>
    );
  }

  const repondu = choix !== null;

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3), marginBottom: theme.spacing(4) }}>
        <Pressable
          onPress={() => confirmer("Abandonner la partie ?", "Ce score ne sera pas enregistré.", "Abandonner", onQuitter)}
          hitSlop={10}
        >
          <Icon name="close" size={20} color={theme.colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <T variant="caption" tone="tertiary" weight="semibold">
              Question {index + 1} / {total}
            </T>
            <T variant="caption" tone="tertiary">
              {bonnes} bonne{bonnes > 1 ? "s" : ""}
            </T>
          </View>
          <Bar value={index / total} color={couleur} />
        </View>
      </View>

      <Card elevated style={{ marginBottom: theme.spacing(4) }}>
        <View style={{ gap: 12, paddingVertical: theme.spacing(3) }}>
          <Eyebrow color={couleur}>{q.carte.source === "definition" ? "Définis" : "Complète"}</Eyebrow>
          <T variant="title" style={{ lineHeight: 30 }}>
            {q.carte.recto}
          </T>
          {!q.options && retournee ? (
            <T variant="subtitle" style={{ color: theme.colors.success, lineHeight: 24 }}>
              {q.carte.verso}
            </T>
          ) : null}
        </View>
      </Card>

      {q.options ? (
        <View style={{ gap: theme.spacing(2) }}>
          {q.options.map((opt) => {
            const estBonne = cle(opt) === cle(q.carte.verso);
            const estChoisie = choix === opt;
            const teinte = !repondu
              ? theme.colors.border
              : estBonne
              ? theme.colors.success
              : estChoisie
              ? theme.colors.danger
              : theme.colors.borderSoft;
            return (
              <Pressable
                key={opt}
                disabled={repondu}
                onPress={() => setChoix(opt)}
                style={({ pressed }) => ({
                  padding: theme.spacing(3.5),
                  borderRadius: theme.radius.md,
                  borderWidth: 1.5,
                  borderColor: teinte,
                  backgroundColor:
                    repondu && (estBonne || estChoisie) ? hexToRgba(teinte, theme.isDark ? 0.14 : 0.1) : theme.colors.surface,
                  opacity: repondu && !estBonne && !estChoisie ? 0.55 : pressed ? 0.85 : 1,
                })}
              >
                <T variant="body" style={{ lineHeight: 21 }}>
                  {opt}
                </T>
              </Pressable>
            );
          })}
          {repondu ? (
            <View style={{ marginTop: theme.spacing(2) }}>
              <Button
                label={index + 1 === total ? "Voir mon score" : "Question suivante"}
                icon="chevronRight"
                onPress={() => suivante(cle(choix!) === cle(q.carte.verso))}
              />
            </View>
          ) : null}
        </View>
      ) : retournee ? (
        <View style={{ flexDirection: "row", gap: theme.spacing(3) }}>
          <View style={{ flex: 1 }}>
            <BoutonTeinte label="À revoir" onPress={() => suivante(false)} color={theme.colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <BoutonTeinte label="Je savais" onPress={() => suivante(true)} color={theme.colors.success} />
          </View>
        </View>
      ) : (
        <Button label="Voir la réponse" variant="secondary" onPress={() => setRetournee(true)} />
      )}
    </Screen>
  );
}
