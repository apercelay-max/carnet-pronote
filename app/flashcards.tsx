import React, { useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../src/theme/ThemeProvider";
import { usePreferencesStore } from "../src/store/usePreferencesStore";
import { Screen } from "../src/components/ui/Screen";
import { T } from "../src/components/ui/Text";
import { Card } from "../src/components/ui/Card";
import { Icon } from "../src/components/ui/Icon";
import { Eyebrow, Chip, StatTile, StatRow, Bar } from "../src/components/ui/Stats";
import { colorForSubject, hexToRgba } from "../src/theme/palette";
import { cartesDepuisFiche, type Carte } from "../src/lib/fiches";
import { useFichesStore } from "../src/store/useFichesStore";

export default function FlashcardsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ fiche?: string }>();
  const fiches = useFichesStore((s) => s.fiches);
  const subjectColors = usePreferencesStore((s) => s.subjectColors);

  const ficheChoisie = fiches.find((f) => f.id === params.fiche);

  if (!ficheChoisie) {
    return <ChoixDeFiche fiches={fiches} subjectColors={subjectColors} />;
  }

  return <Revision fiche={ficheChoisie} />;
}

// --- Écran 1 : choisir la fiche à réviser -------------------------------

function ChoixDeFiche({ fiches, subjectColors }: { fiches: any[]; subjectColors: Record<string, string> }) {
  const theme = useTheme();
  const router = useRouter();

  // On calcule le nombre de cartes de chaque fiche AVANT de l'afficher : une
  // fiche sans définition ni mot-clé ne donne aucune carte, autant le dire
  // tout de suite plutôt que d'ouvrir un écran vide.
  const avecCartes = useMemo(
    () => fiches.map((f) => ({ fiche: f, nb: cartesDepuisFiche(f.genere).length })),
    [fiches]
  );
  const jouables = avecCartes.filter((x) => x.nb > 0);

  return (
    <Screen>
      <EnTete titre="Flashcards" eyebrow="Révision active" />

      <Card style={{ marginBottom: theme.spacing(5) }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Icon name="sparkle" size={18} color={theme.colors.accent} />
          <T variant="caption" tone="secondary" style={{ flex: 1, lineHeight: 18 }}>
            Les cartes viennent de tes fiches : chaque définition devient une question, et les points
            clés deviennent des textes à trou. Se tester de mémoire fait bien mieux retenir que relire.
          </T>
        </View>
      </Card>

      <View style={{ marginBottom: theme.spacing(3) }}>
        <Eyebrow>Choisis une fiche</Eyebrow>
      </View>

      <View style={{ gap: theme.spacing(3) }}>
        {jouables.map(({ fiche, nb }) => {
          const color = colorForSubject(fiche.matiere, subjectColors);
          return (
            <Card
              key={fiche.id}
              tint={color}
              padded
              onPress={() => router.push(`/flashcards?fiche=${fiche.id}`)}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ flex: 1, gap: 5 }}>
                  <T variant="body" weight="semibold" numberOfLines={1}>
                    {fiche.titre}
                  </T>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <Chip color={color} label={fiche.matiere} />
                    <Chip color={theme.colors.textTertiary} label={`${nb} carte${nb > 1 ? "s" : ""}`} />
                  </View>
                </View>
                <Icon name="chevronRight" size={16} color={theme.colors.textTertiary} />
              </View>
            </Card>
          );
        })}

        {jouables.length === 0 && (
          <Card>
            <T variant="body" tone="secondary" style={{ lineHeight: 21 }}>
              {fiches.length === 0
                ? "Crée d'abord une fiche de révision, les cartes se fabriquent à partir de son contenu."
                : "Aucune de tes fiches ne contient de définition ni de mot-clé répété — il n'y a rien dont je puisse faire une question honnête. Ajoute du cours et régénère la fiche."}
            </T>
          </Card>
        )}
      </View>
    </Screen>
  );
}

// --- Écran 2 : réviser ---------------------------------------------------

function Revision({ fiche }: { fiche: any }) {
  const theme = useTheme();
  const router = useRouter();
  const subjectColors = usePreferencesStore((s) => s.subjectColors);
  const color = colorForSubject(fiche.matiere, subjectColors);

  const cartes = useMemo<Carte[]>(() => cartesDepuisFiche(fiche.genere), [fiche]);

  const [index, setIndex] = useState(0);
  const [retournee, setRetournee] = useState(false);
  const [sues, setSues] = useState<number[]>([]);
  const [ratees, setRatees] = useState<number[]>([]);

  const carte = cartes[index];
  const fini = index >= cartes.length;

  const repondre = (su: boolean) => {
    if (su) setSues((v) => [...v, index]);
    else setRatees((v) => [...v, index]);
    setRetournee(false);
    setIndex((i) => i + 1);
  };

  const recommencer = () => {
    setIndex(0);
    setRetournee(false);
    setSues([]);
    setRatees([]);
  };

  if (fini) {
    const total = sues.length + ratees.length;
    return (
      <Screen>
        <EnTete titre="Terminé" eyebrow={fiche.matiere} eyebrowColor={color} />

        <Card elevated style={{ marginBottom: theme.spacing(4) }}>
          <Eyebrow color={color}>Ton score</Eyebrow>
          <View style={{ marginTop: 10, marginBottom: 12 }}>
            <T
              style={{
                fontSize: 46 * theme.fontScale,
                lineHeight: 50 * theme.fontScale,
                fontWeight: "800",
                letterSpacing: -1.5,
                color: theme.colors.textPrimary,
              }}
            >
              {sues.length} / {total}
            </T>
          </View>
          <View style={{ marginBottom: 12 }}>
            <Bar value={total ? sues.length / total : 0} color={theme.colors.success} />
          </View>
          <StatRow>
            <StatTile label="Sues" value={String(sues.length)} color={theme.colors.success} />
            <StatTile label="À revoir" value={String(ratees.length)} color={theme.colors.danger} />
          </StatRow>
        </Card>

        <View style={{ gap: theme.spacing(3) }}>
          <BoutonPlein label="Recommencer" onPress={recommencer} color={color} />
          <BoutonCreux label="Retour aux fiches" onPress={() => router.replace("/flashcards")} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <EnTete titre={fiche.titre} eyebrow={fiche.matiere} eyebrowColor={color} />

      <View style={{ marginBottom: theme.spacing(4), gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <T variant="caption" tone="tertiary" weight="semibold">
            Carte {index + 1} / {cartes.length}
          </T>
          <T variant="caption" tone="tertiary">
            {sues.length} sue{sues.length > 1 ? "s" : ""}
          </T>
        </View>
        <Bar value={index / cartes.length} color={color} />
      </View>

      <Pressable onPress={() => setRetournee((v) => !v)}>
        <Card elevated style={{ minHeight: 220, justifyContent: "center" }}>
          <View style={{ gap: 12, paddingVertical: theme.spacing(4) }}>
            <Eyebrow color={retournee ? theme.colors.success : color}>
              {retournee ? "Réponse" : carte.source === "definition" ? "Définis" : "Complète"}
            </Eyebrow>
            <T
              variant="title"
              style={{ lineHeight: 30, color: retournee ? theme.colors.success : theme.colors.textPrimary }}
            >
              {retournee ? carte.verso : carte.recto}
            </T>
            {!retournee ? (
              <T variant="caption" tone="tertiary" style={{ marginTop: 4 }}>
                Appuie sur la carte pour voir la réponse.
              </T>
            ) : null}
          </View>
        </Card>
      </Pressable>

      {retournee ? (
        <View style={{ flexDirection: "row", gap: theme.spacing(3), marginTop: theme.spacing(4) }}>
          <View style={{ flex: 1 }}>
            <BoutonCreux label="À revoir" onPress={() => repondre(false)} color={theme.colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <BoutonPlein label="Je savais" onPress={() => repondre(true)} color={theme.colors.success} />
          </View>
        </View>
      ) : (
        <View style={{ marginTop: theme.spacing(4) }}>
          <BoutonCreux label="Voir la réponse" onPress={() => setRetournee(true)} color={color} />
        </View>
      )}
    </Screen>
  );
}

// --- Petits composants partagés -----------------------------------------

function EnTete({ titre, eyebrow, eyebrowColor }: { titre: string; eyebrow: string; eyebrowColor?: string }) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: theme.spacing(5) }}>
      <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: theme.spacing(3), marginTop: 6 }}>
        <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Eyebrow color={eyebrowColor ?? theme.colors.accent}>{eyebrow}</Eyebrow>
        <T variant="hero" style={{ marginTop: 2 }} numberOfLines={2}>
          {titre}
        </T>
      </View>
    </View>
  );
}

function BoutonPlein({ label, onPress, color }: { label: string; onPress: () => void; color?: string }) {
  const theme = useTheme();
  const c = color ?? theme.colors.accent;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: c,
        borderRadius: theme.radius.md,
        paddingVertical: 13,
        alignItems: "center",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <T variant="body" weight="semibold" style={{ color: "#FFFFFF" }}>
        {label}
      </T>
    </Pressable>
  );
}

function BoutonCreux({ label, onPress, color }: { label: string; onPress: () => void; color?: string }) {
  const theme = useTheme();
  const c = color ?? theme.colors.textSecondary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: hexToRgba(c, theme.isDark ? 0.12 : 0.08),
        borderWidth: 1,
        borderColor: hexToRgba(c, 0.28),
        borderRadius: theme.radius.md,
        paddingVertical: 12,
        alignItems: "center",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <T variant="body" weight="semibold" style={{ color: c }}>
        {label}
      </T>
    </Pressable>
  );
}
