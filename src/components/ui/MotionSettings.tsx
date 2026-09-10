import React, { useState } from "react";
import { View, Pressable, Switch } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { useMotionStore } from "../../store/useMotionStore";
import {
  INTENSITY_LABELS,
  MOTIONS,
  MOTION_ORDER,
  SPEED_LABELS,
  type MotionId,
} from "../../lib/motion";
import { T } from "./Text";
import { Card } from "./Card";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { SegmentedControl } from "./SegmentedControl";
import { Reveal } from "./Motion";
import { celebrate } from "./Celebration";

/**
 * Bloc « Animations » des Réglages.
 *
 * Chaque animation se choisit sur sa propre vignette, qui la joue en boucle à
 * la demande : impossible de savoir ce que « Balayage » ou « Dépliage » veut
 * dire sans le voir, et aller-retour entre les Réglages et l'accueil pour
 * essayer les 12 serait vite pénible.
 */
export function MotionSettings() {
  const theme = useTheme();
  const motionId = useMotionStore((s) => s.motionId);
  const setMotionId = useMotionStore((s) => s.setMotionId);
  const speed = useMotionStore((s) => s.speed);
  const setSpeed = useMotionStore((s) => s.setSpeed);
  const intensity = useMotionStore((s) => s.intensity);
  const setIntensity = useMotionStore((s) => s.setIntensity);
  const cards = useMotionStore((s) => s.cards);
  const setCards = useMotionStore((s) => s.setCards);
  const screens = useMotionStore((s) => s.screens);
  const setScreens = useMotionStore((s) => s.setScreens);
  const press = useMotionStore((s) => s.press);
  const setPress = useMotionStore((s) => s.setPress);
  const celebrations = useMotionStore((s) => s.celebrations);
  const setCelebrations = useMotionStore((s) => s.setCelebrations);
  const reset = useMotionStore((s) => s.reset);

  // Un compteur par animation : le rejouer relance l'aperçu de cette
  // vignette-là uniquement.
  const [plays, setPlays] = useState<Record<string, number>>({});
  const replay = (id: MotionId) => setPlays((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));

  return (
    <>
      <Card style={{ marginBottom: theme.spacing(4) }} animate={false}>
        <T variant="caption" tone="secondary" style={{ marginBottom: theme.spacing(3) }}>
          L'animation choisie s'applique partout : arrivée sur un onglet, apparition de chaque
          carte, ouverture d'une page. Touche une vignette pour la voir jouer.
        </T>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing(3) }}>
          {MOTION_ORDER.map((id) => {
            const meta = MOTIONS[id];
            const active = motionId === id;
            return (
              <Pressable
                key={id}
                onPress={() => {
                  setMotionId(id);
                  replay(id);
                }}
                style={{
                  flexBasis: "47%",
                  flexGrow: 1,
                  borderRadius: theme.radius.md,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? theme.colors.accent : theme.colors.borderSoft,
                  padding: theme.spacing(3),
                  backgroundColor: theme.colors.surfaceElevated,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 46,
                    marginBottom: theme.spacing(2),
                    justifyContent: "center",
                  }}
                >
                  <MotionPreview id={id} play={plays[id] ?? 0} />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <T variant="body" weight="semibold" style={{ flex: 1 }}>
                    {meta.label}
                  </T>
                  {active ? (
                    <Icon name="checkCircle" size={18} color={theme.colors.accent} />
                  ) : null}
                </View>
                <T variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                  {meta.description}
                </T>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ marginBottom: theme.spacing(4), gap: theme.spacing(5) }} animate={false}>
        <View style={{ gap: theme.spacing(2) }}>
          <T variant="caption" tone="secondary" weight="medium">
            Vitesse
          </T>
          <SegmentedControl
            value={speed}
            onChange={setSpeed}
            options={(["lente", "normale", "rapide"] as const).map((v) => ({
              value: v,
              label: SPEED_LABELS[v],
            }))}
          />
        </View>
        <View style={{ gap: theme.spacing(2) }}>
          <T variant="caption" tone="secondary" weight="medium">
            Amplitude
          </T>
          <SegmentedControl
            value={intensity}
            onChange={setIntensity}
            options={(["discrete", "normale", "marquee"] as const).map((v) => ({
              value: v,
              label: INTENSITY_LABELS[v],
            }))}
          />
        </View>
      </Card>

      <Card style={{ marginBottom: theme.spacing(4) }} animate={false}>
        <ToggleRow
          label="Cartes en cascade"
          hint="Chaque carte arrive juste après la précédente."
          value={cards}
          onChange={setCards}
          first
        />
        <ToggleRow
          label="Changements d'écran"
          hint="L'écran entier s'anime en arrivant sur un onglet."
          value={screens}
          onChange={setScreens}
        />
        <ToggleRow
          label="Retour au toucher"
          hint="Léger enfoncement et vibration quand tu appuies."
          value={press}
          onChange={setPress}
        />
        <ToggleRow
          label="Confettis"
          hint="Quand tu coches un devoir."
          value={celebrations}
          onChange={(v) => {
            setCelebrations(v);
            if (v) celebrate();
          }}
        />
      </Card>

      <View style={{ marginBottom: theme.spacing(6) }}>
        <Button
          label="Réinitialiser les animations"
          variant="secondary"
          icon="close"
          onPress={reset}
        />
      </View>
    </>
  );
}

/**
 * Petite scène animée dans une vignette : trois barres qui rejouent
 * l'animation `id`, indépendamment de celle actuellement choisie dans l'app.
 */
function MotionPreview({ id, play }: { id: MotionId; play: number }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 5 }}>
      {[0, 1, 2].map((i) => (
        <Reveal key={i} motionId={id} index={i} replayKey={`${id}-${play}`}>
          <View
            style={{
              height: 10,
              width: i === 1 ? "72%" : i === 2 ? "52%" : "100%",
              borderRadius: 3,
              backgroundColor: i === 0 ? theme.colors.accent : theme.colors.border,
            }}
          />
        </Reveal>
      ))}
    </View>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
  first,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
  first?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing(3),
        paddingVertical: theme.spacing(2.5),
        borderTopWidth: first ? 0 : 1,
        borderTopColor: theme.colors.borderSoft,
      }}
    >
      <View style={{ flex: 1 }}>
        <T variant="body">{label}</T>
        <T variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
          {hint}
        </T>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.colors.borderSoft, true: theme.colors.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}
