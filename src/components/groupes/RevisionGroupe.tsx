import React, { useEffect, useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { useFichesStore } from "../../store/useFichesStore";
import { chargerFichesGroupe, messageErreurGroupe, type FichePartagee } from "../../lib/groupes";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme/ThemeProvider";
import { colorForSubject } from "../../theme/palette";
import { useGroupesStore } from "../../store/useGroupesStore";
import { usePreferencesStore } from "../../store/usePreferencesStore";
import { T } from "../ui/Text";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";
import { Eyebrow, Chip, BarreMatiere } from "../ui/Stats";
import { formatDayLabel } from "../../lib/format";
import { jourISO, joursAvantISO, type ControleGroupe } from "../../lib/groupes";
import { BoutonTeinte, Champ, ChoixJour, Colonne, ISO_JOUR, Vide, dateDepuisISO } from "./commun";

/** Même libellé que l'écran Contrôles de l'espace révision. */
export function libelleDelai(jours: number): string {
  if (jours < 0) return "Passé";
  if (jours === 0) return "Aujourd'hui";
  if (jours === 1) return "Demain";
  if (jours < 7) return `Dans ${jours} jours`;
  if (jours < 14) return "Dans 1 semaine";
  return `Dans ${Math.round(jours / 7)} semaines`;
}

export function RevisionGroupe() {
  const theme = useTheme();
  const router = useRouter();
  const actif = useGroupesStore((s) => s.actif);
  const rafraichir = useGroupesStore((s) => s.rafraichir);
  const ajouterControle = useGroupesStore((s) => s.ajouterControle);
  const subjectColors = usePreferencesStore((s) => s.subjectColors);

  const [formOuvert, setFormOuvert] = useState(false);
  const [matiere, setMatiere] = useState("");
  const [date, setDate] = useState(jourISO(new Date()));
  const [chapitre, setChapitre] = useState("");
  const [envoi, setEnvoi] = useState(false);

  // Bibliothèque : toutes les fiches partagées dans le groupe, par matière.
  // Chargée à part des contrôles, pour retrouver une fiche d'un vieux contrôle.
  const fichesPerso = useFichesStore((s) => s.fiches);
  const importerFiche = useFichesStore((s) => s.importerFiche);
  const [biblio, setBiblio] = useState<FichePartagee[] | null>(null);
  const [erreurBiblio, setErreurBiblio] = useState<string | null>(null);
  const [matiereBiblio, setMatiereBiblio] = useState<string | null>(null);
  const groupeId = actif?.groupeId;

  useEffect(() => {
    if (!groupeId) return;
    let annule = false;
    chargerFichesGroupe(groupeId)
      .then((f) => !annule && setBiblio(f))
      .catch((e) => !annule && setErreurBiblio(messageErreurGroupe(e)));
    return () => {
      annule = true;
    };
  }, [groupeId, actif?.controles.length]);

  const matieresBiblio = useMemo(
    () => [...new Set((biblio ?? []).map((f) => f.matiere || "Autre"))].sort(),
    [biblio]
  );
  const biblioFiltree = (biblio ?? []).filter((f) => !matiereBiblio || (f.matiere || "Autre") === matiereBiblio);

  const { aVenir, passes } = useMemo(() => {
    const liste = actif?.controles ?? [];
    return {
      aVenir: liste.filter((c) => joursAvantISO(c.date) >= 0),
      passes: liste.filter((c) => joursAvantISO(c.date) < 0).reverse(),
    };
  }, [actif?.controles]);

  const valide = matiere.trim().length > 0 && ISO_JOUR.test(date);

  async function enregistrer() {
    if (!valide) return;
    setEnvoi(true);
    const ok = await ajouterControle({ matiere, date, chapitre });
    setEnvoi(false);
    if (ok) {
      setMatiere("");
      setChapitre("");
      setFormOuvert(false);
    }
  }

  const carte = (c: ControleGroupe) => {
    const couleur = colorForSubject(c.matiere, subjectColors);
    const jours = joursAvantISO(c.date);
    return (
      <Card
        key={c.id}
        padded
        tint={couleur}
        onPress={() => router.push(`/groupes/controle?groupe=${c.groupeId}&id=${c.id}`)}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <BarreMatiere color={couleur} />
          <View style={{ flex: 1, gap: 5 }}>
            <T variant="body" weight="semibold" numberOfLines={1}>
              {c.chapitre || c.matiere}
            </T>
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <Chip color={couleur} label={c.matiere} />
              <Chip color={jours <= 2 && jours >= 0 ? theme.colors.danger : theme.colors.textTertiary} label={libelleDelai(jours)} />
              <T variant="caption" tone="tertiary" style={{ textTransform: "capitalize" }}>
                {formatDayLabel(dateDepuisISO(c.date))}
              </T>
            </View>
          </View>
          <Icon name="chevronRight" size={16} color={theme.colors.textTertiary} />
        </View>
      </Card>
    );
  };

  return (
    <Colonne onRefresh={rafraichir} refreshing={!!actif?.chargement}>
      {formOuvert ? (
        <Card style={{ gap: theme.spacing(4) }}>
          <Champ label="Matière" value={matiere} onChangeText={setMatiere} placeholder="Ex. Histoire" maxLength={60} />
          <ChoixJour label="Date du contrôle" value={date} onChange={setDate} nbJours={45} />
          <Champ
            label="Chapitre (facultatif)"
            value={chapitre}
            onChangeText={setChapitre}
            placeholder="Ex. La Révolution française"
            maxLength={120}
          />
          <Button label="Créer le contrôle" icon="check" onPress={enregistrer} disabled={!valide} loading={envoi} />
          <BoutonTeinte label="Annuler" onPress={() => setFormOuvert(false)} color={theme.colors.textSecondary} />
        </Card>
      ) : (
        <BoutonTeinte label="Nouveau contrôle à réviser" icon="plus" onPress={() => setFormOuvert(true)} />
      )}

      <T variant="caption" tone="tertiary" style={{ lineHeight: 18 }}>
        Chacun partage ses fiches dans le contrôle, puis tout le monde fait le même quiz : un
        classement montre où en est la classe.
      </T>

      <Eyebrow>À réviser</Eyebrow>
      {aVenir.length === 0 ? (
        <Vide texte="Aucun contrôle à réviser ensemble. Crée le prochain pour y rassembler les fiches de la classe." />
      ) : (
        aVenir.map(carte)
      )}

      {passes.length > 0 ? (
        <>
          <View style={{ marginTop: theme.spacing(2) }}>
            <Eyebrow>Déjà passés</Eyebrow>
          </View>
          <View style={{ gap: theme.spacing(3), opacity: 0.6 }}>{passes.slice(0, 10).map(carte)}</View>
        </>
      ) : null}

      <View style={{ marginTop: theme.spacing(4) }}>
        <Eyebrow>{`Fiches de la classe${biblio ? ` (${biblio.length})` : ""}`}</Eyebrow>
      </View>
      {erreurBiblio ? (
        <T variant="caption" tone="danger">
          {erreurBiblio}
        </T>
      ) : biblio === null ? (
        <T variant="caption" tone="tertiary">
          Chargement…
        </T>
      ) : biblio.length === 0 ? (
        <Vide texte="Aucune fiche partagée pour l'instant. Ouvre un contrôle pour y partager les tiennes." />
      ) : (
        <>
          {matieresBiblio.length > 1 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {[null, ...matieresBiblio].map((m) => {
                const on = matiereBiblio === m;
                const c = m ? colorForSubject(m, subjectColors) : theme.colors.accent;
                return (
                  <Pressable key={m ?? "toutes"} onPress={() => setMatiereBiblio(m)}>
                    <Chip color={on ? c : theme.colors.textTertiary} label={m ?? "Toutes"} />
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {biblioFiltree.map((f) => {
            const couleur = colorForSubject(f.matiere || "Autre", subjectColors);
            const locale = fichesPerso.find((x) => x.partageeId === f.id);
            return (
              <Card key={f.id} padded tint={couleur}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <BarreMatiere color={couleur} />
                  <View style={{ flex: 1, gap: 5 }}>
                    <T variant="body" weight="semibold" numberOfLines={2}>
                      {f.titre}
                    </T>
                    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                      <Chip color={couleur} label={f.matiere || "Autre"} />
                      {f.ia ? <Chip color={theme.colors.accent} label="Gemini" /> : null}
                    </View>
                  </View>
                  <BoutonTeinte
                    label={locale ? "Ouvrir" : "Ajouter"}
                    icon={locale ? "book" : "plus"}
                    color={couleur}
                    onPress={() => {
                      const fiche =
                        locale ??
                        importerFiche({ partageeId: f.id, titre: f.titre, matiere: f.matiere, genere: f.genere, ia: f.ia });
                      router.push(`/fiche/${fiche.id}`);
                    }}
                  />
                </View>
              </Card>
            );
          })}
        </>
      )}
    </Colonne>
  );
}
