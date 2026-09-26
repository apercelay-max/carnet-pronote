import React, { useEffect, useState } from "react";
import { Modal, View, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useNouveautesStore } from "../store/useNouveautesStore";
import { NOUVEAUTES, nouveautesNonVues } from "../lib/nouveautes";
import { hexToRgba } from "../theme/palette";
import { T } from "./ui/Text";
import { Icon } from "./ui/Icon";
import { Button } from "./ui/Button";
import { Eyebrow } from "./ui/Stats";

// Fenêtre « Quoi de neuf » : s'ouvre au démarrage quand il y a des nouveautés
// non vues, et se rouvre à la demande depuis Réglages (alors avec tout
// l'historique).
export function NouveautesModal() {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  // On attend la relecture du stockage avant d'afficher quoi que ce soit :
  // sinon la fenêtre clignoterait à chaque démarrage, le temps de savoir
  // qu'elle a déjà été vue.
  const [pret, setPret] = useState(() => useNouveautesStore.persist.hasHydrated());
  useEffect(() => {
    if (useNouveautesStore.persist.hasHydrated()) setPret(true);
    return useNouveautesStore.persist.onFinishHydration(() => setPret(true));
  }, []);
  const derniereVue = useNouveautesStore((s) => s.derniereVue);
  const manuelle = useNouveautesStore((s) => s.ouvertManuelle);
  const marquerVues = useNouveautesStore((s) => s.marquerVues);
  const fermerManuelle = useNouveautesStore((s) => s.fermerManuelle);

  const nonVues = nouveautesNonVues(derniereVue);
  const auto = pret && nonVues.length > 0;
  const visible = auto || manuelle;
  const liste = manuelle ? NOUVEAUTES : nonVues;

  const fermer = () => {
    marquerVues();
    fermerManuelle();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={fermer}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          alignItems: "center",
          justifyContent: "center",
          padding: theme.spacing(4),
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 480,
            maxHeight: height * 0.85,
            backgroundColor: theme.colors.surfaceElevated,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            overflow: "hidden",
          }}
        >
          <View style={{ padding: theme.spacing(5), paddingBottom: theme.spacing(3) }}>
            <Eyebrow color={theme.colors.accent}>Quoi de neuf</Eyebrow>
            <T variant="title" style={{ marginTop: 2 }}>
              {manuelle ? "Les nouveautés" : liste[0]?.titre}
            </T>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing(5), paddingBottom: theme.spacing(4), gap: theme.spacing(5) }}>
            {liste.map((n) => (
              <View key={n.id} style={{ gap: theme.spacing(3) }}>
                {liste.length > 1 ? (
                  <T variant="caption" tone="tertiary" weight="semibold">
                    {n.titre} · {n.date}
                  </T>
                ) : (
                  <T variant="caption" tone="tertiary" weight="semibold">
                    {n.date}
                  </T>
                )}
                {n.points.map((p) => (
                  <View key={p.titre} style={{ flexDirection: "row", gap: theme.spacing(3) }}>
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        backgroundColor: hexToRgba(theme.colors.accent, 0.12),
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name={p.icone} size={18} color={theme.colors.accent} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="body" weight="semibold">
                        {p.titre}
                      </T>
                      <T variant="caption" tone="secondary" style={{ lineHeight: 18 }}>
                        {p.texte}
                      </T>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>

          <View style={{ padding: theme.spacing(5), paddingTop: theme.spacing(3) }}>
            <Button label="C'est parti" onPress={fermer} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
