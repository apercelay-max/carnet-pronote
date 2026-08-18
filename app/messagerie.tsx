import React, { useEffect, useCallback, useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../src/theme/ThemeProvider";
import { useSessionStore } from "../src/store/useSessionStore";
import { useDataStore } from "../src/store/useDataStore";
import { Screen } from "../src/components/ui/Screen";
import { T } from "../src/components/ui/Text";
import { Card } from "../src/components/ui/Card";
import { Icon } from "../src/components/ui/Icon";
import { Eyebrow, Chip } from "../src/components/ui/Stats";
import { formatDayLabel, formatTime } from "../src/lib/format";

export default function MessagerieScreen() {
  const theme = useTheme();
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const isDemo = useSessionStore((s) => s.isDemo);
  const { discussions, discussionMessagesById, loading, refreshAll, loadDiscussionMessages } = useDataStore();
  const [openKey, setOpenKey] = useState<string | null>(null);

  const sync = useCallback(() => {
    if (session) refreshAll(session);
  }, [session, refreshAll]);

  useEffect(() => {
    if (session && !discussions) sync();
  }, [session]);

  const sorted = useMemo(
    () => [...(discussions?.items ?? [])].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [discussions]
  );

  function handleOpen(d: any) {
    const key = d.participantsMessageID || d.subject;
    const opening = openKey !== key;
    setOpenKey(opening ? key : null);
    if (opening && !discussionMessagesById[key]) {
      loadDiscussionMessages(session, d);
    }
  }

  return (
    <Screen onRefresh={isDemo ? undefined : sync} refreshing={loading}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing(6) }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: theme.spacing(3) }}>
          <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Eyebrow color={theme.colors.accent}>Mes échanges</Eyebrow>
          <T variant="hero" style={{ marginTop: 2 }}>
            Messagerie
          </T>
        </View>
      </View>

      <Card style={{ marginBottom: theme.spacing(5), backgroundColor: theme.colors.accentGlass, borderWidth: 0 }}>
        <T variant="caption" tone="secondary">
          Lecture seule pour l'instant — réponds directement dans Pronote si besoin.
        </T>
      </Card>

      {sorted.length === 0 ? (
        <Card>
          <T variant="body" tone="secondary">
            Aucune discussion pour l'instant.
          </T>
        </Card>
      ) : (
        <View style={{ gap: theme.spacing(3) }}>
          {sorted.map((d: any) => {
            const key = d.participantsMessageID || d.subject;
            const open = openKey === key;
            const messages = discussionMessagesById[key];
            return (
              <Card key={key} padded onPress={() => handleOpen(d)}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing(3) }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      marginTop: 6,
                      backgroundColor: d.numberOfMessagesUnread > 0 ? theme.colors.accent : theme.colors.borderSoft,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                      <Chip
                        color={theme.colors.accent}
                        label={d.recipientName ?? d.creator ?? "Discussion"}
                      />
                      <Chip color={theme.colors.textTertiary} label={formatDayLabel(d.date)} />
                      {d.numberOfMessagesUnread > 0 ? (
                        <Chip color={theme.colors.warning} label={`${d.numberOfMessagesUnread} non lu${d.numberOfMessagesUnread > 1 ? "s" : ""}`} />
                      ) : null}
                    </View>
                    <T variant="body" weight={d.numberOfMessagesUnread > 0 ? "semibold" : "medium"}>
                      {d.subject}
                    </T>

                    {open ? (
                      <View style={{ marginTop: theme.spacing(3), gap: theme.spacing(3) }}>
                        {!messages ? (
                          <T variant="caption" tone="tertiary">
                            Chargement…
                          </T>
                        ) : messages.sents.length === 0 ? (
                          <T variant="caption" tone="tertiary">
                            Aucun message.
                          </T>
                        ) : (
                          [...messages.sents]
                            .sort((a, b) => a.creationDate.getTime() - b.creationDate.getTime())
                            .map((m) => (
                              <View
                                key={m.id}
                                style={{
                                  borderTopWidth: 1,
                                  borderTopColor: theme.colors.borderSoft,
                                  paddingTop: theme.spacing(2),
                                }}
                              >
                                <T variant="caption" tone="secondary" weight="medium">
                                  {m.author?.name ?? "Toi"} · {formatDayLabel(m.creationDate)} {formatTime(m.creationDate)}
                                </T>
                                <T variant="body" style={{ marginTop: 2 }}>
                                  {m.content}
                                </T>
                              </View>
                            ))
                        )}
                      </View>
                    ) : null}
                  </View>
                  <Icon name={open ? "chevronUp" : "chevronDown"} size={14} color={theme.colors.textTertiary} />
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
