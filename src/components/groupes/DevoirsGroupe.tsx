import React, { useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { colorForSubject } from "../../theme/palette";
import { useAccountStore } from "../../store/useAccountStore";
import { useGroupesStore } from "../../store/useGroupesStore";
import { useLocalItemsStore } from "../../store/useLocalItemsStore";
import { usePreferencesStore } from "../../store/usePreferencesStore";
import { T } from "../ui/Text";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";
import { Eyebrow, Chip, Bar } from "../ui/Stats";
import { celebrate } from "../ui/Celebration";
import { formatDayLabel } from "../../lib/format";
import { jourISO, type DevoirGroupe } from "../../lib/groupes";
import { choisirPhotos, extraireDevoirs, photosDisponibles, type DevoirExtrait } from "../../lib/photos";
import { useGeminiStore } from "../../store/useGeminiStore";
import { GeminiNotConfiguredError } from "../../lib/gemini";
import { ActivityIndicator } from "react-native";
import {
  BoutonTeinte,
  Champ,
  ChoixJour,
  Colonne,
  ISO_JOUR,
  Vide,
  confirmer,
  dateDepuisISO,
  pseudoDe,
} from "./commun";

export function DevoirsGroupe() {
  const theme = useTheme();
  const userId = useAccountStore((s) => s.userId);
  const actif = useGroupesStore((s) => s.actif);
  const rafraichir = useGroupesStore((s) => s.rafraichir);
  const ajouterDevoir = useGroupesStore((s) => s.ajouterDevoir);
  const retirerDevoir = useGroupesStore((s) => s.retirerDevoir);
  const basculerFait = useGroupesStore((s) => s.basculerFait);
  const subjectColors = usePreferencesStore((s) => s.subjectColors);
  const devoirsManuels = useLocalItemsStore((s) => s.devoirsManuels);
  const ajouterDevoirManuel = useLocalItemsStore((s) => s.ajouterDevoirManuel);

  const [formOuvert, setFormOuvert] = useState(false);
  const [matiere, setMatiere] = useState("");
  const [echeance, setEcheance] = useState(jourISO(new Date()));
  const [description, setDescription] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [voirPasses, setVoirPasses] = useState(false);
  const envoyerTexte = useGroupesStore((s) => s.envoyerTexte);

  // Photo du tableau → devoirs proposés, que l'on coche avant de publier :
  // Gemini peut mal lire une date ou une matière, on ne publie rien sans relecture.
  const [lecture, setLecture] = useState(false);
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null);
  const [proposes, setProposes] = useState<(DevoirExtrait & { garde: boolean })[] | null>(null);
  const [publication, setPublication] = useState(false);
  const [aideEnvoyee, setAideEnvoyee] = useState<Set<string>>(new Set());

  async function photoTableau() {
    setErreurPhoto(null);
    try {
      const photos = await choisirPhotos();
      if (photos.length === 0) return;
      setLecture(true);
      if (!useGeminiStore.getState().keyLoaded) await useGeminiStore.getState().loadKey();
      const devoirs = await extraireDevoirs(photos, useGeminiStore.getState().apiKey);
      if (devoirs.length === 0) setErreurPhoto("Aucun devoir trouvé sur cette photo.");
      else setProposes(devoirs.map((d) => ({ ...d, garde: true })));
    } catch (err: any) {
      setErreurPhoto(
        err instanceof GeminiNotConfiguredError
          ? "Gemini n'est pas configuré : ajoute ta clé dans l'assistant."
          : err?.message ?? "La photo n'a pas pu être lue."
      );
    } finally {
      setLecture(false);
    }
  }

  async function publierProposes() {
    if (!proposes) return;
    setPublication(true);
    for (const d of proposes.filter((x) => x.garde)) {
      await ajouterDevoir({ matiere: d.matiere, echeance: d.echeance, description: d.description });
    }
    setPublication(false);
    setProposes(null);
  }

  const membres = actif?.membres ?? [];
  const suisAdmin = membres.some((m) => m.userId === userId && m.role === "admin");
  // Un membre parti ne compte plus : sinon on afficherait « 25 / 24 ».
  const idsMembres = new Set(membres.map((m) => m.userId));

  const { aVenir, passes } = useMemo(() => {
    const aujourdhui = jourISO(new Date());
    const liste = actif?.devoirs ?? [];
    return {
      aVenir: liste.filter((d) => d.echeance >= aujourdhui),
      passes: liste.filter((d) => d.echeance < aujourdhui).reverse(),
    };
  }, [actif?.devoirs]);

  const valide = description.trim().length > 0 && ISO_JOUR.test(echeance);

  async function enregistrer() {
    if (!valide) return;
    setEnvoi(true);
    const ok = await ajouterDevoir({ matiere, echeance, description });
    setEnvoi(false);
    if (ok) {
      setDescription("");
      setMatiere("");
      setFormOuvert(false);
    }
  }

  const carte = (d: DevoirGroupe) => {
    const couleur = colorForSubject(d.matiere || "Perso", subjectColors);
    const nbFaits = d.faits.filter((f) => f.fait && idsMembres.has(f.userId)).length;
    const total = Math.max(membres.length, 1);
    const faitParMoi = d.faits.some((f) => f.userId === userId && f.fait);
    const peutSupprimer = d.auteurId === userId || suisAdmin;
    const titrePerso = d.description.split(/\n+/)[0].slice(0, 140);
    const dejaPerso = devoirsManuels.some((m) => m.date === d.echeance && m.titre === titrePerso);

    return (
      <Card key={d.id} padded tint={couleur}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable
            hitSlop={8}
            accessibilityLabel={faitParMoi ? "Marquer comme pas fait" : "Marquer comme fait"}
            onPress={() => {
              // Confettis seulement en cochant, comme dans l'onglet Devoirs.
              if (!faitParMoi) celebrate();
              basculerFait(d.id);
            }}
            style={{ paddingTop: 2 }}
          >
            <Icon
              name={faitParMoi ? "checkCircle" : "circle"}
              size={22}
              color={faitParMoi ? theme.colors.success : theme.colors.textTertiary}
            />
          </Pressable>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {d.matiere ? <Chip color={couleur} label={d.matiere} /> : null}
              <T variant="caption" tone="tertiary" style={{ textTransform: "capitalize" }}>
                {formatDayLabel(dateDepuisISO(d.echeance))}
              </T>
            </View>
            <T
              variant="body"
              style={{
                lineHeight: 21,
                textDecorationLine: faitParMoi ? "line-through" : "none",
                opacity: faitParMoi ? 0.6 : 1,
              }}
            >
              {d.description}
            </T>
            <View style={{ gap: 4, marginTop: 2 }}>
              <Bar value={nbFaits / total} color={theme.colors.success} />
              <T variant="caption" tone="tertiary">
                {nbFaits === 0
                  ? "Personne ne l'a encore fait"
                  : `${nbFaits} / ${membres.length} l'${nbFaits > 1 ? "ont" : "a"} fait`}
                {" · "}ajouté par {d.auteurId === userId ? "toi" : pseudoDe(membres, d.auteurId)}
              </T>
            </View>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              {/* « J'ai besoin d'aide » : poste dans le chat en citant ceux qui
                  l'ont déjà fait — ce sont eux qui peuvent expliquer. */}
              {!faitParMoi && !aideEnvoyee.has(d.id) ? (
                <BoutonTeinte
                  label="J'ai besoin d'aide"
                  icon="chat"
                  color={theme.colors.warning}
                  onPress={async () => {
                    const ontFait = d.faits
                      .filter((f) => f.fait && f.userId !== userId && idsMembres.has(f.userId))
                      .map((f) => pseudoDe(membres, f.userId));
                    const appel = ontFait.length
                      ? `${ontFait.slice(0, 4).join(", ")}, vous l'avez fait : quelqu'un peut m'expliquer ?`
                      : "Quelqu'un peut m'expliquer ?";
                    const ok = await envoyerTexte(
                      `🆘 J'ai besoin d'aide pour ${d.matiere ? `${d.matiere} — ` : ""}« ${titrePerso} » (pour ${formatDayLabel(dateDepuisISO(d.echeance))}). ${appel}`
                    );
                    if (ok) setAideEnvoyee((s) => new Set(s).add(d.id));
                  }}
                />
              ) : aideEnvoyee.has(d.id) ? (
                <T variant="caption" tone="tertiary">
                  Demande d'aide envoyée dans le chat
                </T>
              ) : null}
              {dejaPerso ? (
                <T variant="caption" tone="success">
                  Dans tes devoirs perso
                </T>
              ) : (
                <BoutonTeinte
                  label="Dans mes devoirs perso"
                  icon="plus"
                  color={couleur}
                  onPress={() =>
                    ajouterDevoirManuel({
                      titre: titrePerso,
                      matiere: d.matiere,
                      date: d.echeance,
                      duree: null,
                      note: d.description.split(/\n+/).slice(1).join("\n"),
                    })
                  }
                />
              )}
            </View>
          </View>
          {peutSupprimer ? (
            <Pressable
              hitSlop={10}
              onPress={() =>
                confirmer("Supprimer ce devoir ?", "Il disparaîtra pour tout le groupe.", "Supprimer", () =>
                  retirerDevoir(d.id)
                )
              }
            >
              <Icon name="trash" size={16} color={theme.colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>
      </Card>
    );
  };

  return (
    <Colonne onRefresh={rafraichir} refreshing={!!actif?.chargement}>
      {formOuvert ? (
        <Card style={{ gap: theme.spacing(4) }}>
          <Champ label="Matière" value={matiere} onChangeText={setMatiere} placeholder="Ex. Maths" maxLength={60} />
          <ChoixJour label="Pour quand" value={echeance} onChange={setEcheance} />
          <Champ
            label="Ce qu'il y a à faire"
            value={description}
            onChangeText={setDescription}
            placeholder="Ex. Exercices 4 à 7 page 32"
            multiline
            maxLength={2000}
          />
          <Button label="Ajouter pour le groupe" icon="check" onPress={enregistrer} disabled={!valide} loading={envoi} />
          <BoutonTeinte label="Annuler" onPress={() => setFormOuvert(false)} color={theme.colors.textSecondary} />
        </Card>
      ) : (
        <View style={{ gap: 8 }}>
          <BoutonTeinte label="Nouveau devoir collectif" icon="plus" onPress={() => setFormOuvert(true)} />
          {photosDisponibles() && !proposes ? (
            <BoutonTeinte
              label={lecture ? "Gemini lit le tableau…" : "Photo du tableau → devoirs"}
              icon="sparkle"
              onPress={lecture ? () => {} : photoTableau}
            />
          ) : null}
          {lecture ? <ActivityIndicator color={theme.colors.accent} /> : null}
          {erreurPhoto ? (
            <T variant="caption" tone="danger">
              {erreurPhoto}
            </T>
          ) : null}
        </View>
      )}

      {proposes ? (
        <Card style={{ gap: theme.spacing(3) }}>
          <Eyebrow color={theme.colors.accent}>Devoirs lus sur la photo</Eyebrow>
          <T variant="caption" tone="tertiary">
            Vérifie les dates et décoche ce qui est faux avant de publier pour tout le groupe.
          </T>
          {proposes.map((d, i) => (
            <Pressable
              key={i}
              onPress={() => setProposes((l) => l && l.map((x, j) => (j === i ? { ...x, garde: !x.garde } : x)))}
              style={{ flexDirection: "row", gap: 10, opacity: d.garde ? 1 : 0.5 }}
            >
              <Icon
                name={d.garde ? "checkCircle" : "circle"}
                size={20}
                color={d.garde ? theme.colors.success : theme.colors.textTertiary}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="caption" weight="semibold" style={{ textTransform: "capitalize" }}>
                  {d.matiere || "Sans matière"} · {formatDayLabel(dateDepuisISO(d.echeance))}
                </T>
                <T variant="body" style={{ lineHeight: 20 }}>
                  {d.description}
                </T>
              </View>
            </Pressable>
          ))}
          <Button
            label={`Publier ${proposes.filter((x) => x.garde).length} devoir(s) pour le groupe`}
            icon="check"
            onPress={publierProposes}
            loading={publication}
            disabled={proposes.every((x) => !x.garde)}
          />
          <BoutonTeinte label="Annuler" onPress={() => setProposes(null)} color={theme.colors.textSecondary} />
        </Card>
      ) : null}

      <T variant="caption" tone="tertiary" style={{ lineHeight: 18 }}>
        Chacun coche pour lui-même : ta coche ne change rien pour les autres, mais tout le monde voit
        combien l'ont déjà fait.
      </T>

      <Eyebrow>À faire</Eyebrow>
      {aVenir.length === 0 ? (
        <Vide texte="Aucun devoir collectif à venir. Ajoute celui donné à l'oral que Pronote n'a pas." />
      ) : (
        aVenir.map(carte)
      )}

      {passes.length > 0 ? (
        <>
          <Pressable onPress={() => setVoirPasses((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: theme.spacing(2) }}>
            <Eyebrow>{`Échéance passée (${passes.length})`}</Eyebrow>
            <Icon name={voirPasses ? "chevronUp" : "chevronDown"} size={14} color={theme.colors.textTertiary} />
          </Pressable>
          {voirPasses ? <View style={{ gap: theme.spacing(3), opacity: 0.6 }}>{passes.map(carte)}</View> : null}
        </>
      ) : null}
    </Colonne>
  );
}
