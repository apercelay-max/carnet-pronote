import React, { useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { useAccountStore } from "../../store/useAccountStore";
import { useGroupesStore } from "../../store/useGroupesStore";
import { T } from "../ui/Text";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";
import { Eyebrow } from "../ui/Stats";
import { formatDayLabel, formatTime } from "../../lib/format";
import { jourISO, type EvenementGroupe } from "../../lib/groupes";
import { BoutonTeinte, Champ, ChoixJour, Colonne, ISO_JOUR, Vide, confirmer, pseudoDe } from "./commun";

const HEURE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function EvenementsGroupe() {
  const theme = useTheme();
  const userId = useAccountStore((s) => s.userId);
  const actif = useGroupesStore((s) => s.actif);
  const rafraichir = useGroupesStore((s) => s.rafraichir);
  const ajouterEvenement = useGroupesStore((s) => s.ajouterEvenement);
  const retirerEvenement = useGroupesStore((s) => s.retirerEvenement);

  const [formOuvert, setFormOuvert] = useState(false);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [jour, setJour] = useState(jourISO(new Date()));
  const [heure, setHeure] = useState("08:00");
  const [envoi, setEnvoi] = useState(false);
  const [voirPasses, setVoirPasses] = useState(false);

  const membres = actif?.membres ?? [];
  const suisAdmin = membres.some((m) => m.userId === userId && m.role === "admin");

  // « Passé » = avant le début de la journée : un événement de ce matin reste
  // dans « À venir » jusqu'à ce soir, c'est là qu'on le cherche.
  const { aVenir, passes } = useMemo(() => {
    const debutJour = new Date();
    debutJour.setHours(0, 0, 0, 0);
    const liste = actif?.evenements ?? [];
    return {
      aVenir: liste.filter((e) => new Date(e.debut) >= debutJour),
      passes: liste.filter((e) => new Date(e.debut) < debutJour).reverse(),
    };
  }, [actif?.evenements]);

  const valide = titre.trim().length > 0 && ISO_JOUR.test(jour) && HEURE.test(heure.trim());

  async function enregistrer() {
    if (!valide) return;
    const [y, m, d] = jour.split("-").map(Number);
    const [, h, min] = heure.trim().match(HEURE)!;
    const debut = new Date(y, m - 1, d, Number(h), Number(min), 0, 0);
    setEnvoi(true);
    const ok = await ajouterEvenement({ titre, description, debut });
    setEnvoi(false);
    if (ok) {
      setTitre("");
      setDescription("");
      setFormOuvert(false);
    }
  }

  const carte = (e: EvenementGroupe) => {
    const date = new Date(e.debut);
    const peutSupprimer = e.auteurId === userId || suisAdmin;
    return (
      <Card key={e.id} padded>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ alignItems: "center", minWidth: 46 }}>
            <T variant="title" weight="bold">
              {date.getDate()}
            </T>
            <T variant="caption" tone="tertiary">
              {formatTime(date)}
            </T>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <T variant="caption" tone="accent" weight="semibold" style={{ textTransform: "capitalize" }}>
              {formatDayLabel(date)}
            </T>
            <T variant="body" weight="semibold">
              {e.titre}
            </T>
            {e.description ? (
              <T variant="caption" tone="secondary" style={{ lineHeight: 18 }}>
                {e.description}
              </T>
            ) : null}
            <T variant="caption" tone="tertiary">
              Ajouté par {e.auteurId === userId ? "toi" : pseudoDe(membres, e.auteurId)}
            </T>
          </View>
          {peutSupprimer ? (
            <Pressable
              hitSlop={10}
              onPress={() =>
                confirmer("Supprimer cet événement ?", "Il disparaîtra pour tout le groupe.", "Supprimer", () =>
                  retirerEvenement(e.id)
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
          <Champ label="Titre" value={titre} onChangeText={setTitre} placeholder="Ex. Sortie au musée" maxLength={80} />
          <ChoixJour label="Jour" value={jour} onChange={setJour} nbJours={60} />
          <Champ label="Heure (HH:MM)" value={heure} onChangeText={setHeure} placeholder="08:00" maxLength={5} />
          <Champ
            label="Description (facultatif)"
            value={description}
            onChangeText={setDescription}
            placeholder="Lieu, ce qu'il faut apporter…"
            multiline
            maxLength={2000}
          />
          <Button label="Ajouter l'événement" icon="check" onPress={enregistrer} disabled={!valide} loading={envoi} />
          <BoutonTeinte label="Annuler" onPress={() => setFormOuvert(false)} color={theme.colors.textSecondary} />
        </Card>
      ) : (
        <BoutonTeinte label="Nouvel événement" icon="plus" onPress={() => setFormOuvert(true)} />
      )}

      <Eyebrow>À venir</Eyebrow>
      {aVenir.length === 0 ? (
        <Vide texte="Aucun événement prévu. Sortie, réunion, date limite d'inscription : ajoute-le pour que toute la classe le voie." />
      ) : (
        aVenir.map(carte)
      )}

      {passes.length > 0 ? (
        <>
          <Pressable onPress={() => setVoirPasses((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: theme.spacing(2) }}>
            <Eyebrow>{`Passés (${passes.length})`}</Eyebrow>
            <Icon name={voirPasses ? "chevronUp" : "chevronDown"} size={14} color={theme.colors.textTertiary} />
          </Pressable>
          {voirPasses ? <View style={{ gap: theme.spacing(3), opacity: 0.6 }}>{passes.map(carte)}</View> : null}
        </>
      ) : null}
    </Colonne>
  );
}
