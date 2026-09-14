import React, { useEffect, useState } from "react";
import { View, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../src/theme/ThemeProvider";
import { useAccountStore } from "../../src/store/useAccountStore";
import { useGroupesStore } from "../../src/store/useGroupesStore";
import { T } from "../../src/components/ui/Text";
import { Card } from "../../src/components/ui/Card";
import { Icon } from "../../src/components/ui/Icon";
import { Button } from "../../src/components/ui/Button";
import { Eyebrow, Chip } from "../../src/components/ui/Stats";
import { SegmentedControl } from "../../src/components/ui/SegmentedControl";
import { MAX_CONTENT_WIDTH } from "../../src/components/ui/Screen";
import { Bandeau, BoutonTeinte, confirmer, partagerInvitation } from "../../src/components/groupes/commun";
import { ChatGroupe } from "../../src/components/groupes/ChatGroupe";
import { EvenementsGroupe } from "../../src/components/groupes/EvenementsGroupe";
import { DevoirsGroupe } from "../../src/components/groupes/DevoirsGroupe";
import { RevisionGroupe } from "../../src/components/groupes/RevisionGroupe";
import { formaterCode } from "../../src/lib/groupes";

type Onglet = "chat" | "evenements" | "devoirs" | "revision";

export default function GroupeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupeId = String(id ?? "");

  const statusCompte = useAccountStore((s) => s.status);
  const userId = useAccountStore((s) => s.userId);
  const bootstrapCompte = useAccountStore((s) => s.bootstrap);

  const actif = useGroupesStore((s) => s.actif);
  const busy = useGroupesStore((s) => s.busy);
  const ouvrir = useGroupesStore((s) => s.ouvrir);
  const fermer = useGroupesStore((s) => s.fermer);
  const quitter = useGroupesStore((s) => s.quitter);
  const effacerErreur = useGroupesStore((s) => s.effacerErreur);

  const [onglet, setOnglet] = useState<Onglet>("chat");
  const [infoOuverte, setInfoOuverte] = useState(false);
  const [infoPartage, setInfoPartage] = useState<string | null>(null);

  const revenir = () => (router.canGoBack() ? router.back() : router.replace("/groupes"));

  useEffect(() => {
    if (statusCompte === "inconnu") bootstrapCompte();
  }, [statusCompte, bootstrapCompte]);

  // Ouverture du groupe (chargement + canal temps réel) seulement une fois la
  // session du compte connue : sans elle, la RLS renverrait un groupe vide et
  // le canal s'abonnerait sans droits. Fermeture au démontage, sinon le canal
  // resterait ouvert après avoir quitté l'écran.
  useEffect(() => {
    if (statusCompte !== "connecte" || !groupeId) return;
    ouvrir(groupeId);
    return () => fermer();
  }, [statusCompte, groupeId, ouvrir, fermer]);

  const groupe = actif?.groupeId === groupeId ? actif.groupe : null;
  const membres = actif?.groupeId === groupeId ? actif.membres : [];
  const moi = membres.find((m) => m.userId === userId);

  async function inviter() {
    if (!groupe) return;
    setInfoPartage(await partagerInvitation(groupe.nom, groupe.code));
  }

  function demanderQuitter() {
    if (!groupe) return;
    confirmer(
      `Quitter « ${groupe.nom} » ?`,
      "Tu ne verras plus le chat ni le reste du groupe. Tu pourras revenir avec le code.",
      "Quitter",
      async () => {
        if (await quitter(groupe.id)) router.replace("/groupes");
      }
    );
  }

  if (statusCompte !== "connecte") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing(4) }}>
        {statusCompte === "inconnu" ? (
          <ActivityIndicator color={theme.colors.accent} />
        ) : (
          <View style={{ width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", gap: theme.spacing(4) }}>
            <T variant="title">Connexion nécessaire</T>
            <T variant="caption" tone="secondary" style={{ lineHeight: 19 }}>
              Les groupes de classe passent par le compte Carnet. Connecte-toi, puis rouvre ce groupe.
            </T>
            <Button label="Me connecter au compte Carnet" icon="user" onPress={() => router.push("/compte")} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* En-tête fixe : nom du groupe et onglets restent visibles quel que
            soit l'onglet et la longueur du fil. */}
        <View
          style={{
            width: "100%",
            maxWidth: MAX_CONTENT_WIDTH,
            alignSelf: "center",
            paddingHorizontal: theme.spacing(4),
            paddingTop: theme.spacing(2),
            gap: theme.spacing(3),
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3) }}>
            <Pressable onPress={revenir} hitSlop={10}>
              <Icon name="chevronLeft" size={22} color={theme.colors.textSecondary} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Eyebrow color={theme.colors.accent}>
                {membres.length ? `${membres.length} membre${membres.length > 1 ? "s" : ""}` : "Groupe"}
              </Eyebrow>
              <T variant="title" style={{ marginTop: 2 }} numberOfLines={1}>
                {groupe?.nom ?? "…"}
              </T>
            </View>
            {actif?.chargement ? <ActivityIndicator size="small" color={theme.colors.textTertiary} /> : null}
            <Pressable onPress={() => setInfoOuverte((v) => !v)} hitSlop={10}>
              <Icon name="users" size={20} color={infoOuverte ? theme.colors.accent : theme.colors.textTertiary} />
            </Pressable>
          </View>

          {infoOuverte && groupe ? (
            <Card animate={false} style={{ gap: theme.spacing(3) }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Eyebrow>Code d'invitation</Eyebrow>
                  <T variant="title" style={{ letterSpacing: 2, marginTop: 2 }} selectable>
                    {formaterCode(groupe.code)}
                  </T>
                </View>
                <BoutonTeinte label="Inviter" icon="share" onPress={inviter} />
              </View>
              {infoPartage ? <Bandeau ton="ok" texte={infoPartage} /> : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {membres.map((m) => (
                  <Chip
                    key={m.userId}
                    color={m.role === "admin" ? theme.colors.accent : theme.colors.textTertiary}
                    label={`${m.pseudo}${m.userId === userId ? " (toi)" : ""}${m.role === "admin" ? " · admin" : ""}`}
                  />
                ))}
              </View>
              <T variant="caption" tone="tertiary" style={{ lineHeight: 18 }}>
                Pour changer de pseudo, rejoins à nouveau le groupe avec le même code : ton pseudo
                sera mis à jour{moi ? ` (actuellement « ${moi.pseudo} »)` : ""}.
              </T>
              <Pressable onPress={demanderQuitter} disabled={busy} style={{ alignSelf: "flex-start" }}>
                <T variant="caption" tone="danger" weight="semibold">
                  Quitter le groupe
                </T>
              </Pressable>
            </Card>
          ) : null}

          <SegmentedControl
            value={onglet}
            onChange={setOnglet}
            options={[
              { value: "chat", label: "Chat" },
              { value: "evenements", label: "Événements" },
              { value: "devoirs", label: "Devoirs" },
              { value: "revision", label: "Révision" },
            ]}
          />

          {actif?.erreur ? (
            <Pressable onPress={effacerErreur}>
              <Bandeau ton="danger" texte={actif.erreur} />
            </Pressable>
          ) : null}
        </View>

        <View style={{ flex: 1 }}>
          {onglet === "chat" ? (
            <ChatGroupe />
          ) : onglet === "evenements" ? (
            <EvenementsGroupe />
          ) : onglet === "devoirs" ? (
            <DevoirsGroupe />
          ) : (
            <RevisionGroupe />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
