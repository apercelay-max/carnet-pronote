import React, { useMemo, useState } from "react";
import { View, Pressable, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../src/theme/ThemeProvider";
import { useDataStore } from "../src/store/useDataStore";
import { usePreferencesStore } from "../src/store/usePreferencesStore";
import { Screen } from "../src/components/ui/Screen";
import { T } from "../src/components/ui/Text";
import { Card } from "../src/components/ui/Card";
import { Icon } from "../src/components/ui/Icon";
import { Button } from "../src/components/ui/Button";
import { Eyebrow, Chip } from "../src/components/ui/Stats";
import { colorForSubject, hexToRgba } from "../src/theme/palette";
import { stripHtml } from "../src/lib/fiches";
import { useFichesStore, type FicheMode } from "../src/store/useFichesStore";
import { formatDayLabel } from "../src/lib/format";
import { choisirPhotos, photosDisponibles, transcrireCours, MAX_PHOTOS } from "../src/lib/photos";
import { useGeminiStore } from "../src/store/useGeminiStore";
import { GeminiNotConfiguredError } from "../src/lib/gemini";

const TITRES: Record<FicheMode, string> = {
  fiche: "Nouvelle fiche",
  resume: "Nouveau résumé",
  points: "Points importants",
};

export default function FicheNouvelleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: FicheMode =
    params.mode === "resume" || params.mode === "points" ? params.mode : "fiche";

  const resources = useDataStore((s) => s.resources);
  const subjectColors = usePreferencesStore((s) => s.subjectColors);
  const creerFiche = useFichesStore((s) => s.creerFiche);

  const [titre, setTitre] = useState("");
  const [matiere, setMatiere] = useState("");
  const [texte, setTexte] = useState("");
  // Activé par défaut pour les fiches complètes : c'est là que l'IA apporte le
  // plus (méthodes, pièges, quiz). La fiche locale est créée quoi qu'il arrive,
  // Gemini ne fait que l'approfondir ensuite sur l'écran de la fiche.
  const [avecGemini, setAvecGemini] = useState(mode === "fiche");

  // Photo du cours → texte : la transcription s'AJOUTE au texte déjà saisi,
  // pour pouvoir photographier plusieurs pages en plusieurs fois.
  const loadKey = useGeminiStore((s) => s.loadKey);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErreur, setPhotoErreur] = useState<string | null>(null);
  const photographier = async () => {
    setPhotoErreur(null);
    try {
      const photos = await choisirPhotos();
      if (photos.length === 0) return;
      setPhotoBusy(true);
      if (!useGeminiStore.getState().keyLoaded) await loadKey();
      const transcription = await transcrireCours(photos, useGeminiStore.getState().apiKey);
      setTexte((t) => (t.trim() ? `${t.trim()}\n\n${transcription}` : transcription));
    } catch (err: any) {
      setPhotoErreur(
        err instanceof GeminiNotConfiguredError
          ? "Gemini n'est pas configuré : ajoute ta clé dans l'assistant pour lire les photos."
          : err?.message ?? "La photo n'a pas pu être lue."
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  // Contenus de cours récupérés depuis Pronote (cahier de textes). On les
  // propose comme point de départ, mais ils sont souvent courts : d'où la
  // grande zone de texte en dessous, où on colle son vrai cours.
  const contenus = useMemo(() => {
    return (resources ?? [])
      .flatMap((r) =>
        (r.contents ?? []).map((c) => ({
          id: c.id,
          matiere: r.subject?.name ?? "Cours",
          titre: c.title || r.subject?.name || "Contenu de cours",
          texte: stripHtml(`${c.title ?? ""}\n${c.description ?? ""}`),
          date: r.startDate,
        }))
      )
      .filter((c) => c.texte.length > 0)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 12);
  }, [resources]);

  const matieres = useMemo(() => {
    const set = new Set<string>();
    (resources ?? []).forEach((r) => r.subject?.name && set.add(r.subject.name));
    return [...set].sort();
  }, [resources]);

  const assezDeTexte = stripHtml(texte).length >= 80;

  const generer = () => {
    const fiche = creerFiche({
      mode,
      titre: titre || contenus.find((c) => c.texte === texte)?.titre || "Sans titre",
      matiere: matiere || "Général",
      texteSource: texte,
    });
    router.replace(avecGemini ? `/fiche/${fiche.id}?ia=1` : `/fiche/${fiche.id}`);
  };

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing(5) }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: theme.spacing(3) }}>
          <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <T variant="hero">{TITRES[mode]}</T>
      </View>

      {/* Message d'honnêteté : l'app n'invente rien, elle sélectionne. */}
      <Card style={{ marginBottom: theme.spacing(5) }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Icon name="warning" size={18} color={theme.colors.warning} />
          <T variant="caption" tone="secondary" style={{ flex: 1, lineHeight: 18 }}>
            {avecGemini
              ? "Gemini approfondit ta fiche : cours réorganisé, méthodes, pièges à éviter, questions et QCM. Ton cours est envoyé à Google pour ça. Il peut se tromper : garde ton cours sous la main."
              : "Tout se calcule sur ton téléphone, sans IA et sans connexion. L'app repère et réorganise les phrases de ton cours — elle n'en invente aucune. Plus le texte que tu colles est complet, meilleure sera la fiche."}
          </T>
        </View>
      </Card>

      {contenus.length > 0 && (
        <>
          <View style={{ marginBottom: theme.spacing(3) }}>
            <Eyebrow>Depuis le cahier de textes</Eyebrow>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: theme.spacing(5) }}
            contentContainerStyle={{ gap: 8, paddingRight: 8 }}
          >
            {contenus.map((c) => {
              const color = colorForSubject(c.matiere, subjectColors);
              const choisi = texte === c.texte;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setTexte(c.texte);
                    setTitre(c.titre);
                    setMatiere(c.matiere);
                  }}
                  style={{
                    width: 190,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: choisi ? color : theme.colors.border,
                    backgroundColor: choisi
                      ? hexToRgba(color, theme.isDark ? 0.12 : 0.08)
                      : theme.colors.surface,
                    gap: 6,
                  }}
                >
                  <Chip color={color} label={c.matiere} />
                  <T variant="caption" weight="semibold" numberOfLines={2}>
                    {c.titre}
                  </T>
                  <T variant="caption" tone="tertiary" numberOfLines={1}>
                    {formatDayLabel(c.date)}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      <View style={{ gap: theme.spacing(4), marginBottom: theme.spacing(5) }}>
        <View style={{ gap: 6 }}>
          <Eyebrow>Titre</Eyebrow>
          <TextInput
            value={titre}
            onChangeText={setTitre}
            placeholder="Ex. Les fonctions affines"
            placeholderTextColor={theme.colors.textTertiary}
            style={champ(theme)}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Eyebrow>Matière</Eyebrow>
          {matieres.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingVertical: 2, paddingRight: 8 }}
            >
              {matieres.map((m) => {
                const color = colorForSubject(m, subjectColors);
                const on = matiere === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMatiere(on ? "" : m)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: on ? color : theme.colors.border,
                      backgroundColor: on ? hexToRgba(color, 0.14) : "transparent",
                    }}
                  >
                    <T variant="caption" weight={on ? "semibold" : "regular"} style={{ color: on ? color : theme.colors.textSecondary }}>
                      {m}
                    </T>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <TextInput
            value={matiere}
            onChangeText={setMatiere}
            placeholder="Ou tape une matière"
            placeholderTextColor={theme.colors.textTertiary}
            style={champ(theme)}
          />
        </View>

        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Eyebrow>Ton cours</Eyebrow>
            <T variant="caption" tone="tertiary">
              {stripHtml(texte).length} caractères
            </T>
          </View>
          {photosDisponibles() && (
            <Pressable
              onPress={photographier}
              disabled={photoBusy}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 11,
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: theme.colors.accent,
                opacity: photoBusy ? 0.7 : 1,
              }}
            >
              {photoBusy ? (
                <ActivityIndicator color={theme.colors.accent} />
              ) : (
                <Icon name="plus" size={16} color={theme.colors.accent} />
              )}
              <T variant="caption" weight="semibold" style={{ color: theme.colors.accent }}>
                {photoBusy ? "Gemini lit ta photo…" : `Photo de mon cahier ou du manuel (jusqu'à ${MAX_PHOTOS})`}
              </T>
            </Pressable>
          )}
          {photoErreur && (
            <T variant="caption" tone="danger">
              {photoErreur}
            </T>
          )}
          <TextInput
            value={texte}
            onChangeText={setTexte}
            placeholder="Colle ici le texte de ta leçon, ou écris-le."
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            textAlignVertical="top"
            style={[champ(theme), { minHeight: 190, lineHeight: 21 }]}
          />
          {!assezDeTexte && texte.length > 0 && (
            <T variant="caption" tone="tertiary">
              C'est encore court : en dessous d'environ 80 caractères, il n'y a pas assez de
              matière pour sortir quelque chose d'utile.
            </T>
          )}
        </View>
      </View>

      <Pressable
        onPress={() => setAvecGemini((v) => !v)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          padding: 12,
          marginBottom: theme.spacing(4),
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: avecGemini ? theme.colors.accent : theme.colors.border,
          backgroundColor: avecGemini ? hexToRgba(theme.colors.accent, 0.08) : theme.colors.surface,
        }}
      >
        <Icon
          name={avecGemini ? "checkCircle" : "circle"}
          size={20}
          color={avecGemini ? theme.colors.accent : theme.colors.textTertiary}
        />
        <View style={{ flex: 1 }}>
          <T variant="body" weight="semibold">
            Approfondir avec Gemini
          </T>
          <T variant="caption" tone="secondary">
            Fiche détaillée, méthodes, pièges et quiz pour le contrôle
          </T>
        </View>
      </Pressable>

      <Button label="Générer" icon="sparkle" onPress={generer} disabled={!assezDeTexte} />
    </Screen>
  );
}

function champ(theme: ReturnType<typeof useTheme>) {
  return {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(3),
    color: theme.colors.textPrimary,
    fontSize: theme.type.body,
  } as const;
}
