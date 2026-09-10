import React, { useState } from "react";
import { View, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../src/theme/ThemeProvider";
import { Screen } from "../src/components/ui/Screen";
import { T } from "../src/components/ui/Text";
import { Card } from "../src/components/ui/Card";
import { Icon } from "../src/components/ui/Icon";
import { Button } from "../src/components/ui/Button";
import { Eyebrow } from "../src/components/ui/Stats";
import { useLocalItemsStore } from "../src/store/useLocalItemsStore";
import { champStyle } from "../src/components/ui/champStyle";

export default function PenseBeteScreen() {
  const theme = useTheme();
  const router = useRouter();
  const penseBetes = useLocalItemsStore((s) => s.penseBetes);
  const ajouter = useLocalItemsStore((s) => s.ajouterPenseBete);
  const modifier = useLocalItemsStore((s) => s.modifierPenseBete);
  const toggleEpingle = useLocalItemsStore((s) => s.togglePenseBeteEpingle);
  const supprimer = useLocalItemsStore((s) => s.supprimerPenseBete);

  const [draft, setDraft] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const tries = [...penseBetes].sort((a, b) => {
    if (a.epingle !== b.epingle) return a.epingle ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });

  const ajouterEtVider = () => {
    ajouter(draft);
    setDraft("");
  };

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing(5) }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          hitSlop={10}
          style={{ marginRight: theme.spacing(3) }}
        >
          <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <T variant="hero">Pense-bête</T>
      </View>

      <Card style={{ marginBottom: theme.spacing(5) }}>
        <Eyebrow>Nouvelle note</Eyebrow>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Ex. Rapporter le mot signé, penser au bus de 7h40…"
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          textAlignVertical="top"
          style={[champStyle(theme), { minHeight: 90, marginTop: 6, marginBottom: theme.spacing(3), lineHeight: 21 }]}
        />
        <Button label="Ajouter" icon="plus" onPress={ajouterEtVider} disabled={!draft.trim()} />
      </Card>

      {tries.length === 0 ? (
        <Card>
          <T variant="body" tone="secondary">
            Rien de noté pour l'instant. Les notes épinglées s'affichent aussi sur l'accueil.
          </T>
        </Card>
      ) : (
        <View style={{ gap: theme.spacing(3) }}>
          {tries.map((p) => {
            const enEdition = editId === p.id;
            return (
              <Card key={p.id} padded>
                {enEdition ? (
                  <>
                    <TextInput
                      value={editText}
                      onChangeText={setEditText}
                      multiline
                      textAlignVertical="top"
                      style={[champStyle(theme), { minHeight: 80, lineHeight: 21 }]}
                    />
                    <View style={{ flexDirection: "row", gap: theme.spacing(2), marginTop: theme.spacing(3) }}>
                      <Pressable
                        onPress={() => {
                          modifier(p.id, editText);
                          setEditId(null);
                        }}
                        style={pill(theme, theme.colors.accent)}
                      >
                        <T variant="caption" weight="semibold" style={{ color: "#0B0D12" }}>
                          Enregistrer
                        </T>
                      </Pressable>
                      <Pressable onPress={() => setEditId(null)} style={pill(theme, theme.colors.surfaceElevated)}>
                        <T variant="caption" weight="semibold">
                          Annuler
                        </T>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <T variant="body" style={{ lineHeight: 21 }}>
                      {p.texte}
                    </T>
                    <View
                      style={{
                        flexDirection: "row",
                        gap: theme.spacing(4),
                        marginTop: theme.spacing(3),
                        alignItems: "center",
                      }}
                    >
                      <Pressable
                        onPress={() => toggleEpingle(p.id)}
                        hitSlop={8}
                        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                      >
                        <Icon
                          name="pin"
                          size={14}
                          color={p.epingle ? theme.colors.accent : theme.colors.textTertiary}
                        />
                        <T variant="caption" style={{ color: p.epingle ? theme.colors.accent : theme.colors.textTertiary }}>
                          {p.epingle ? "Épinglé" : "Épingler"}
                        </T>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setEditId(p.id);
                          setEditText(p.texte);
                        }}
                        hitSlop={8}
                        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                      >
                        <Icon name="text" size={14} color={theme.colors.textTertiary} />
                        <T variant="caption" tone="tertiary">
                          Modifier
                        </T>
                      </Pressable>
                      <Pressable
                        onPress={() => supprimer(p.id)}
                        hitSlop={8}
                        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                      >
                        <Icon name="close" size={14} color={theme.colors.textTertiary} />
                        <T variant="caption" tone="tertiary">
                          Supprimer
                        </T>
                      </Pressable>
                    </View>
                  </>
                )}
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function pill(theme: ReturnType<typeof useTheme>, bg: string) {
  return {
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(2),
    borderRadius: 999,
    backgroundColor: bg,
  } as const;
}
