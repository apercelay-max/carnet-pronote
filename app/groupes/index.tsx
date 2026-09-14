import React, { useCallback, useEffect, useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../src/theme/ThemeProvider";
import { hexToRgba } from "../../src/theme/palette";
import { useAccountStore } from "../../src/store/useAccountStore";
import { useGroupesStore } from "../../src/store/useGroupesStore";
import { Screen } from "../../src/components/ui/Screen";
import { T } from "../../src/components/ui/Text";
import { Card } from "../../src/components/ui/Card";
import { Icon } from "../../src/components/ui/Icon";
import { Button } from "../../src/components/ui/Button";
import { TextField } from "../../src/components/ui/TextField";
import { Eyebrow, Chip } from "../../src/components/ui/Stats";
import { SegmentedControl } from "../../src/components/ui/SegmentedControl";
import { Bandeau } from "../../src/components/groupes/commun";
import { formaterCode, normaliserCode } from "../../src/lib/groupes";

type Mode = "rejoindre" | "creer";

export default function GroupesScreen() {
  const theme = useTheme();
  const router = useRouter();
  // `?code=` : ouvert depuis un lien d'invitation. On pré-remplit le code et
  // on se place sur « Rejoindre », pour qu'il ne reste qu'un bouton à toucher.
  const params = useLocalSearchParams<{ code?: string }>();

  const statusCompte = useAccountStore((s) => s.status);
  const email = useAccountStore((s) => s.email);
  const bootstrapCompte = useAccountStore((s) => s.bootstrap);

  const pseudo = useGroupesStore((s) => s.pseudo);
  const setPseudo = useGroupesStore((s) => s.setPseudo);
  const groupes = useGroupesStore((s) => s.groupes);
  const listeChargee = useGroupesStore((s) => s.listeChargee);
  const chargementListe = useGroupesStore((s) => s.chargementListe);
  const busy = useGroupesStore((s) => s.busy);
  const erreur = useGroupesStore((s) => s.erreur);
  const chargerListe = useGroupesStore((s) => s.chargerListe);
  const creer = useGroupesStore((s) => s.creer);
  const rejoindre = useGroupesStore((s) => s.rejoindre);
  const effacerErreur = useGroupesStore((s) => s.effacerErreur);

  const [mode, setMode] = useState<Mode>("rejoindre");
  const [code, setCode] = useState(params.code ? formaterCode(String(params.code)) : "");
  const [nom, setNom] = useState("");

  const revenir = () => (router.canGoBack() ? router.back() : router.replace("/extensions"));

  useEffect(() => {
    if (statusCompte === "inconnu") bootstrapCompte();
  }, [statusCompte, bootstrapCompte]);

  // Pseudo proposé à partir de l'email la première fois : c'est un point de
  // départ, pas un choix imposé — l'email lui-même n'est jamais montré.
  useEffect(() => {
    if (!pseudo && email) {
      const base = email.split("@")[0].replace(/[._-]+/g, " ").trim();
      if (base) setPseudo(base.charAt(0).toUpperCase() + base.slice(1));
    }
  }, [email, pseudo, setPseudo]);

  useFocusEffect(
    useCallback(() => {
      if (statusCompte === "connecte") chargerListe();
    }, [statusCompte, chargerListe])
  );

  function changerMode(next: Mode) {
    setMode(next);
    effacerErreur();
  }

  const pseudoOk = pseudo.trim().length > 0;
  const peutValider =
    !busy && pseudoOk && (mode === "creer" ? nom.trim().length > 0 : normaliserCode(code).length === 8);

  async function valider() {
    const id = mode === "creer" ? await creer(nom) : await rejoindre(code);
    if (!id) return;
    setNom("");
    setCode("");
    router.push(`/groupes/${id}`);
  }

  return (
    <Screen onRefresh={statusCompte === "connecte" ? chargerListe : undefined} refreshing={chargementListe}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3), marginBottom: theme.spacing(5) }}>
        <Pressable onPress={revenir} hitSlop={10}>
          <Icon name="chevronLeft" size={22} color={theme.colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Eyebrow color={theme.colors.accent}>Ensemble</Eyebrow>
          <T variant="hero" style={{ marginTop: 2 }}>
            Groupes de classe
          </T>
        </View>
      </View>

      {statusCompte === "inconnu" ? (
        <ActivityIndicator color={theme.colors.accent} />
      ) : statusCompte !== "connecte" ? (
        <Card style={{ gap: theme.spacing(4) }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Icon name="users" size={18} color={theme.colors.accent} />
            <T variant="caption" tone="secondary" style={{ flex: 1, lineHeight: 19 }}>
              Un groupe réunit ta classe : un chat, les événements, les devoirs de tout le monde et
              des révisions de contrôles à plusieurs.
              {"\n\n"}
              Pour savoir qui écrit quoi, il faut un compte Carnet. Ton compte Pronote n'est pas
              utilisé, et ton email n'est jamais montré aux autres : ils ne voient que ton pseudo.
            </T>
          </View>
          <Button label="Me connecter au compte Carnet" icon="user" onPress={() => router.push("/compte")} />
        </Card>
      ) : (
        <>
          <Card style={{ gap: theme.spacing(4), marginBottom: theme.spacing(6) }}>
            <SegmentedControl
              value={mode}
              onChange={changerMode}
              options={[
                { value: "rejoindre", label: "Rejoindre" },
                { value: "creer", label: "Créer un groupe" },
              ]}
            />

            <TextField
              label="Ton pseudo dans le groupe"
              icon="user"
              value={pseudo}
              onChangeText={setPseudo}
              maxLength={30}
              placeholder="Ex. Léo P."
            />

            {mode === "rejoindre" ? (
              <TextField
                label="Code d'invitation"
                icon="lock"
                value={code}
                onChangeText={(t) => {
                  // On affiche le code en deux blocs pendant la frappe, comme
                  // il est écrit sur l'invitation : plus facile à vérifier.
                  const brut = normaliserCode(t).slice(0, 8);
                  setCode(brut.length > 4 ? `${brut.slice(0, 4)} ${brut.slice(4)}` : brut);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="ABCD EFGH"
              />
            ) : (
              <TextField
                label="Nom du groupe"
                icon="school"
                value={nom}
                onChangeText={setNom}
                maxLength={40}
                placeholder="Ex. 3eB"
              />
            )}

            <T variant="caption" tone="tertiary" style={{ lineHeight: 18 }}>
              {mode === "rejoindre"
                ? "Demande le code à quelqu'un du groupe, ou ouvre le lien d'invitation qu'il t'a envoyé."
                : "Tu recevras un code à 8 caractères à donner à ta classe. Tout ce qui est écrit dans le groupe n'est visible que par ses membres."}
            </T>

            {erreur ? <Bandeau ton="danger" texte={erreur} /> : null}

            <Button
              label={mode === "creer" ? "Créer le groupe" : "Rejoindre le groupe"}
              icon={mode === "creer" ? "plus" : "check"}
              onPress={valider}
              disabled={!peutValider}
              loading={busy}
            />
          </Card>

          <View style={{ marginBottom: theme.spacing(3) }}>
            <Eyebrow>Mes groupes</Eyebrow>
          </View>

          <View style={{ gap: theme.spacing(3) }}>
            {groupes.map((g) => (
              <Card key={g.id} padded onPress={() => router.push(`/groupes/${g.id}`)}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: hexToRgba(theme.colors.accent, theme.isDark ? 0.14 : 0.1),
                    }}
                  >
                    <Icon name="users" size={19} color={theme.colors.accent} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <T variant="body" weight="semibold" numberOfLines={1}>
                      {g.nom}
                    </T>
                    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                      <Chip color={theme.colors.textTertiary} label={g.monPseudo} />
                      {g.monRole === "admin" ? <Chip color={theme.colors.accent} label="Admin" /> : null}
                    </View>
                  </View>
                  <Icon name="chevronRight" size={16} color={theme.colors.textTertiary} />
                </View>
              </Card>
            ))}

            {listeChargee && groupes.length === 0 && !erreur ? (
              <Card>
                <T variant="body" tone="secondary" style={{ lineHeight: 21 }}>
                  Tu ne fais partie d'aucun groupe pour l'instant. Crée celui de ta classe, ou
                  rejoins-le avec le code d'un camarade.
                </T>
              </Card>
            ) : null}
          </View>
        </>
      )}
    </Screen>
  );
}
