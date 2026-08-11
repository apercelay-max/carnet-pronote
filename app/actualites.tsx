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
import { formatDayLabel } from "../src/lib/format";

export default function ActualitesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const isDemo = useSessionStore((s) => s.isDemo);
  const { newsData, loading, refreshAll, toggleNewsRead } = useDataStore();
  const [openId, setOpenId] = useState<string | null>(null);

  const sync = useCallback(() => {
    if (session) refreshAll(session);
  }, [session, refreshAll]);

  useEffect(() => {
    if (session && !newsData) sync();
  }, [session]);

  const sorted = useMemo(
    () => [...(newsData?.items ?? [])].sort((a, b) => b.startDate.getTime() - a.startDate.getTime()),
    [newsData]
  );

  function handleOpen(item: any) {
    const opening = openId !== item.id;
    setOpenId(opening ? item.id : null);
    if (opening && !item.read) toggleNewsRead(session, item, true);
  }

  return (
    <Screen onRefresh={isDemo ? undefined : sync} refreshing={loading}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing(6) }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: theme.spacing(3) }}>
          <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <T variant="hero">Actualités</T>
      </View>

      {sorted.length === 0 ? (
        <Card>
          <T variant="body" tone="secondary">
            Aucune actualité pour l'instant.
          </T>
        </Card>
      ) : (
        <View style={{ gap: theme.spacing(3) }}>
          {sorted.map((item: any) => {
            const open = openId === item.id;
            return (
              <Card key={item.id} padded onPress={() => handleOpen(item)}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing(3) }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      marginTop: 6,
                      backgroundColor: !item.read ? theme.colors.accent : theme.colors.borderSoft,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <T variant="caption" tone="secondary" style={{ textTransform: "capitalize" }}>
                      {item.category?.name} · {formatDayLabel(item.startDate)}
                    </T>
                    <T variant="body" weight={!item.read ? "semibold" : "medium"} style={{ marginTop: 2 }}>
                      {item.title ?? "Actualité"}
                    </T>
                    <T variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
                      {item.author}
                    </T>
                    {open ? (
                      <T variant="body" tone="secondary" style={{ marginTop: theme.spacing(3) }}>
                        {item.is === "information" ? item.content : "Sondage — à consulter dans Pronote."}
                      </T>
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
