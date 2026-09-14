import React, { useMemo, useRef, useState } from "react";
import { View, ScrollView, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { colorForSubject, hexToRgba } from "../../theme/palette";
import { useAccountStore } from "../../store/useAccountStore";
import { useGroupesStore } from "../../store/useGroupesStore";
import { useDataStore } from "../../store/useDataStore";
import { useLocalItemsStore } from "../../store/useLocalItemsStore";
import { usePreferencesStore } from "../../store/usePreferencesStore";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { Eyebrow, Chip } from "../ui/Stats";
import { MAX_CONTENT_WIDTH } from "../ui/Screen";
import { formatDayLabel, formatTime } from "../../lib/format";
import { stripHtml } from "../../lib/html";
import { jourISO, type DevoirPartage, type MessageGroupe } from "../../lib/groupes";
import { BoutonTeinte, Vide, confirmer, dateDepuisISO, pseudoDe } from "./commun";

export function ChatGroupe() {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const userId = useAccountStore((s) => s.userId);
  const actif = useGroupesStore((s) => s.actif);
  const envoyerTexte = useGroupesStore((s) => s.envoyerTexte);
  const partagerDevoir = useGroupesStore((s) => s.partagerDevoir);
  const supprimerMessage = useGroupesStore((s) => s.supprimerMessage);

  const [brouillon, setBrouillon] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [choixOuvert, setChoixOuvert] = useState(false);

  const messages = actif?.messages ?? [];
  const membres = actif?.membres ?? [];
  const suisAdmin = membres.some((m) => m.userId === userId && m.role === "admin");

  const peutEnvoyer = brouillon.trim().length > 0 && !envoi;

  async function envoyer() {
    if (!peutEnvoyer) return;
    setEnvoi(true);
    // Le brouillon n'est vidé qu'une fois le message accepté : en cas d'échec
    // réseau, la personne ne perd pas ce qu'elle a tapé.
    if (await envoyerTexte(brouillon)) setBrouillon("");
    setEnvoi(false);
  }

  async function partager(d: DevoirPartage) {
    setEnvoi(true);
    if (await partagerDevoir(d)) setChoixOuvert(false);
    setEnvoi(false);
  }

  function demanderSuppression(m: MessageGroupe) {
    confirmer("Supprimer ce message ?", "Il disparaîtra pour tout le groupe.", "Supprimer", () =>
      supprimerMessage(m.id)
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: theme.spacing(4), paddingBottom: theme.spacing(4), alignItems: "center" }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        <View style={{ width: "100%", maxWidth: MAX_CONTENT_WIDTH, gap: theme.spacing(2) }}>
          {messages.length === 0 && !actif?.chargement ? (
            <Vide texte="Aucun message pour l'instant. Dis bonjour, ou partage un devoir avec le bouton +." />
          ) : null}

          {messages.map((m, i) => {
            const precedent = messages[i - 1];
            const date = new Date(m.createdAt);
            const nouveauJour = !precedent || new Date(precedent.createdAt).toDateString() !== date.toDateString();
            // Pseudo affiché seulement quand l'auteur change : une rafale de
            // messages de la même personne se lit comme un seul bloc.
            const memeAuteur = !nouveauJour && precedent?.auteurId === m.auteurId;
            const deMoi = m.auteurId === userId;
            return (
              <View key={m.id} style={{ gap: theme.spacing(2) }}>
                {nouveauJour ? (
                  <View style={{ alignItems: "center", marginTop: i === 0 ? 0 : theme.spacing(2) }}>
                    <Eyebrow>{formatDayLabel(date)}</Eyebrow>
                  </View>
                ) : null}
                <Bulle
                  message={m}
                  deMoi={deMoi}
                  pseudo={memeAuteur ? null : pseudoDe(membres, m.auteurId)}
                  onLongPress={deMoi || suisAdmin ? () => demanderSuppression(m) : undefined}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>

      {choixOuvert ? <ChoixDevoir onChoisir={partager} occupe={envoi} /> : null}

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.colors.borderSoft,
          backgroundColor: theme.colors.backgroundElevated,
          paddingHorizontal: theme.spacing(4),
          paddingTop: theme.spacing(3),
          paddingBottom: theme.spacing(4),
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: MAX_CONTENT_WIDTH,
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "flex-end",
            gap: theme.spacing(2),
          }}
        >
          <Pressable
            onPress={() => setChoixOuvert((v) => !v)}
            accessibilityLabel="Partager un devoir"
            style={{
              width: 44,
              height: 44,
              borderRadius: theme.radius.md,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: choixOuvert ? theme.colors.accent : theme.colors.border,
              backgroundColor: choixOuvert ? theme.colors.accentSoft : theme.colors.surface,
            }}
          >
            <Icon name={choixOuvert ? "close" : "plus"} size={18} color={choixOuvert ? theme.colors.accent : theme.colors.textSecondary} />
          </Pressable>
          <TextInput
            value={brouillon}
            onChangeText={setBrouillon}
            placeholder="Écris au groupe…"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            maxLength={2000}
            onSubmitEditing={envoyer}
            style={{
              flex: 1,
              maxHeight: 120,
              minHeight: 44,
              color: theme.colors.textPrimary,
              fontSize: theme.type.body,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.spacing(3),
              paddingVertical: theme.spacing(2.5),
            }}
          />
          <Pressable
            onPress={envoyer}
            disabled={!peutEnvoyer}
            accessibilityLabel="Envoyer"
            style={{
              width: 44,
              height: 44,
              borderRadius: theme.radius.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.accent,
              opacity: peutEnvoyer ? 1 : 0.45,
            }}
          >
            {envoi ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Icon name="send" size={18} color="#FFFFFF" />}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Bulle({
  message,
  deMoi,
  pseudo,
  onLongPress,
}: {
  message: MessageGroupe;
  deMoi: boolean;
  pseudo: string | null;
  onLongPress?: () => void;
}) {
  const theme = useTheme();
  const heure = formatTime(new Date(message.createdAt));

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={450}
      style={{ alignSelf: deMoi ? "flex-end" : "flex-start", maxWidth: "86%", gap: 3 }}
    >
      {pseudo && !deMoi ? (
        <T variant="caption" tone="tertiary" weight="semibold" style={{ marginLeft: 4 }}>
          {pseudo}
        </T>
      ) : null}
      {message.type === "devoir" && message.devoir ? (
        <CarteDevoir devoir={message.devoir} auteur={deMoi ? "toi" : pseudo} />
      ) : (
        <View
          style={{
            paddingHorizontal: theme.spacing(3),
            paddingVertical: theme.spacing(2.5),
            borderRadius: theme.radius.md,
            backgroundColor: deMoi ? theme.colors.accentSoft : theme.colors.surface,
            borderWidth: 1,
            borderColor: deMoi ? hexToRgba(theme.colors.accent, 0.3) : theme.colors.borderSoft,
          }}
        >
          <T variant="body" style={{ lineHeight: 21 }} selectable>
            {message.texte}
          </T>
        </View>
      )}
      <T variant="caption" tone="tertiary" style={{ fontSize: 10.5, alignSelf: deMoi ? "flex-end" : "flex-start", marginHorizontal: 4 }}>
        {heure}
      </T>
    </Pressable>
  );
}

/**
 * Message-carte « devoir partagé ». Le bouton recopie le devoir dans les
 * devoirs perso de la personne qui le reçoit : il apparaît alors dans son
 * onglet Devoirs comme n'importe quel devoir ajouté à la main.
 */
function CarteDevoir({ devoir, auteur }: { devoir: DevoirPartage; auteur: string | null }) {
  const theme = useTheme();
  const subjectColors = usePreferencesStore((s) => s.subjectColors);
  const devoirsManuels = useLocalItemsStore((s) => s.devoirsManuels);
  const ajouterDevoirManuel = useLocalItemsStore((s) => s.ajouterDevoirManuel);
  const couleur = colorForSubject(devoir.matiere || "Perso", subjectColors);

  // « Déjà ajouté » se déduit des devoirs perso existants plutôt que d'un état
  // local : ça reste vrai après avoir quitté puis rouvert le chat.
  const dejaAjoute = devoirsManuels.some(
    (d) => d.titre === devoir.titre && d.date === devoir.date && d.matiere === devoir.matiere
  );
  const dateValide = /^\d{4}-\d{2}-\d{2}$/.test(devoir.date);

  return (
    <View
      style={{
        padding: theme.spacing(3),
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: hexToRgba(couleur, 0.35),
        gap: 8,
        minWidth: 230,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <Icon name="homework" size={15} color={couleur} />
        <Chip color={couleur} label={devoir.matiere || "Devoir"} />
        {dateValide ? (
          <T variant="caption" tone="tertiary">
            Pour {formatDayLabel(dateDepuisISO(devoir.date)).toLowerCase()}
          </T>
        ) : null}
      </View>
      <T variant="body" weight="semibold" style={{ lineHeight: 21 }}>
        {devoir.titre}
      </T>
      {devoir.note ? (
        <T variant="caption" tone="secondary" style={{ lineHeight: 18 }} numberOfLines={6}>
          {devoir.note}
        </T>
      ) : null}
      {dejaAjoute ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="checkCircle" size={15} color={theme.colors.success} />
          <T variant="caption" tone="success">
            Dans tes devoirs
          </T>
        </View>
      ) : (
        <BoutonTeinte
          label="Ajouter à mes devoirs"
          icon="plus"
          color={couleur}
          disabled={!dateValide}
          onPress={() =>
            ajouterDevoirManuel({
              titre: devoir.titre,
              matiere: devoir.matiere,
              date: devoir.date,
              duree: null,
              note: [devoir.note, auteur && auteur !== "toi" ? `Partagé par ${auteur}` : ""]
                .filter(Boolean)
                .join("\n"),
            })
          }
        />
      )}
    </View>
  );
}

/** Liste des devoirs à venir (Pronote + perso) qu'on peut envoyer au groupe. */
function ChoixDevoir({ onChoisir, occupe }: { onChoisir: (d: DevoirPartage) => void; occupe: boolean }) {
  const theme = useTheme();
  const subjectColors = usePreferencesStore((s) => s.subjectColors);
  const assignments = useDataStore((s) => s.assignments);
  const devoirsManuels = useLocalItemsStore((s) => s.devoirsManuels);

  const choix = useMemo(() => {
    const aujourdhui = jourISO(new Date());
    const pronote = assignments
      .filter((a) => a.deadline && jourISO(a.deadline) >= aujourdhui)
      .map((a) => {
        // Les descriptions Pronote arrivent en HTML : première ligne comme
        // titre, le reste en note — c'est ce qui se lit le mieux sur la carte.
        const lignes = stripHtml(a.description ?? "")
          .split(/\n+/)
          .map((l) => l.trim())
          .filter(Boolean);
        return {
          cle: `p-${a.id}`,
          source: "Pronote",
          devoir: {
            matiere: a.subject?.name ?? "",
            titre: (lignes[0] ?? "Devoir").slice(0, 140),
            date: jourISO(a.deadline),
            note: lignes.slice(1).join("\n").slice(0, 1000),
          },
        };
      });
    const perso = devoirsManuels
      .filter((d) => !d.fait && d.date >= aujourdhui)
      .map((d) => ({
        cle: `m-${d.id}`,
        source: "Perso",
        devoir: { matiere: d.matiere, titre: d.titre.slice(0, 140), date: d.date, note: d.note.slice(0, 1000) },
      }));
    return [...pronote, ...perso].sort((a, b) => a.devoir.date.localeCompare(b.devoir.date)).slice(0, 40);
  }, [assignments, devoirsManuels]);

  return (
    <View
      style={{
        maxHeight: 260,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderSoft,
        backgroundColor: theme.colors.backgroundElevated,
      }}
    >
      <ScrollView contentContainerStyle={{ padding: theme.spacing(4), alignItems: "center" }} keyboardShouldPersistTaps="handled">
        <View style={{ width: "100%", maxWidth: MAX_CONTENT_WIDTH, gap: theme.spacing(2) }}>
          <Eyebrow>Partager un devoir</Eyebrow>
          {choix.length === 0 ? (
            <T variant="caption" tone="secondary" style={{ lineHeight: 18 }}>
              Aucun devoir à venir, ni dans Pronote ni dans tes devoirs perso.
            </T>
          ) : null}
          {choix.map((c) => {
            const couleur = colorForSubject(c.devoir.matiere || "Perso", subjectColors);
            return (
              <Pressable
                key={c.cle}
                disabled={occupe}
                onPress={() => onChoisir(c.devoir)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: theme.spacing(3),
                  borderRadius: theme.radius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.borderSoft,
                  backgroundColor: theme.colors.surface,
                  opacity: occupe ? 0.5 : pressed ? 0.8 : 1,
                })}
              >
                <View style={{ width: 4, alignSelf: "stretch", borderRadius: 2, backgroundColor: couleur }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="caption" weight="semibold" numberOfLines={1}>
                    {c.devoir.titre}
                  </T>
                  <T variant="caption" tone="tertiary" numberOfLines={1}>
                    {[c.devoir.matiere, formatDayLabel(dateDepuisISO(c.devoir.date)), c.source].filter(Boolean).join(" · ")}
                  </T>
                </View>
                <Icon name="send" size={15} color={theme.colors.accent} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
