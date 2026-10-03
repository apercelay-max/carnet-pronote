import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

// Écran d'accueil repris de PPL : « Carnet » apparaît, se transforme en un
// point qui part du centre, accélère puis freine pour se poser sur le point
// (ou l'accent) d'une lettre du prénom. « Bonjour <prénom> » se révèle alors,
// puis tout s'efface en fondu. Le trajet est mesuré sur l'écran réel : le
// point tombe pile sur la lettre quelle que soit la taille de la fenêtre.

const NATIVE = Platform.OS !== "web";
const HOLD_MS = 650;
const GROW_MS = 280;
const TRAVEL_MS = 700;
const SQUASH_MS = 240;
const SHOW_MS = 900;
const FADE_MS = 420;
const FONT = 40;
const DOT = 10;

const MARK = /[̀-ͯ]/;

type Target = { word: "hello" | "name"; index: number };

// Première lettre à point ou à accent du prénom, sinon le « j » de « Bonjour ».
function findTarget(name: string): Target {
  for (let i = 0; i < name.length; i++) {
    const c = name[i];
    if (/[ij]/.test(c)) return { word: "name", index: i };
    if (MARK.test(c.normalize("NFD").slice(1))) return { word: "name", index: i };
  }
  return { word: "hello", index: "Bonjour".indexOf("j") };
}

// Prénom lisible : Pronote donne souvent « NOM Prénom » ou « Prénom NOM ».
export function premierPrenom(displayName: string | null | undefined): string {
  const mots = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
  const prenom = mots.find((m) => m !== m.toUpperCase()) ?? mots[mots.length - 1] ?? "";
  return prenom.charAt(0).toUpperCase() + prenom.slice(1);
}

function glyphFor(char: string) {
  const d = char.normalize("NFD");
  const base = d[0];
  if (d.length > 1) return base;
  return base === "i" ? "ı" : base === "j" ? "ȷ" : base;
}

type Props = { firstName: string; onDone: () => void };

export function SplashBonjour({ firstName, onDone }: Props) {
  const theme = useTheme();
  const name = firstName.trim();
  const target = useMemo(() => findTarget(name), [name]);

  const root = useRef<View>(null);
  const targetRef = useRef<View>(null);
  const [dest, setDest] = useState<{ x: number; y: number; accented: boolean } | null>(null);

  const intro = useRef(new Animated.Value(0)).current; // « Carnet » : 0→1 entrée
  const fly = useRef(new Animated.Value(0)).current; // 0 grow, 1 départ, 2 arrivée, 3 posé
  const text = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;

  const targetChar = target.word === "name" ? name[target.index] : "j";
  const accented = targetChar.normalize("NFD").length > 1;

  // Mesure la lettre cible (positions écran), une fois le texte mis en page.
  const measure = () => {
    const el = targetRef.current as any;
    const r = root.current as any;
    if (!el || !r) return;
    el.measureInWindow((x: number, y: number, w: number) => {
      r.measureInWindow((rx: number, ry: number, rw: number, rh: number) => {
        if (!w) return;
        setDest({ x: x + w / 2 - (rx + rw / 2), y: y - ry - rh / 2, accented });
      });
    });
  };

  useEffect(() => {
    // Un temps pour que le texte soit posé avant de mesurer.
    const t = setTimeout(measure, 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    Animated.timing(intro, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: NATIVE,
    }).start();
  }, [intro]);

  useEffect(() => {
    if (!dest) return;
    const run = Animated.sequence([
      Animated.delay(HOLD_MS),
      Animated.timing(fly, { toValue: 1, duration: GROW_MS, easing: Easing.bezier(0.2, 0.8, 0.3, 1), useNativeDriver: NATIVE }),
      // Départ très doux, grosse accélération, freinage net : faux effet de gravité.
      Animated.timing(fly, { toValue: 2, duration: TRAVEL_MS, easing: Easing.bezier(0.9, 0, 0.1, 1), useNativeDriver: NATIVE }),
      Animated.timing(fly, { toValue: 3, duration: SQUASH_MS, easing: Easing.bezier(0.2, 0.9, 0.3, 1.4), useNativeDriver: NATIVE }),
      Animated.timing(text, { toValue: 1, duration: 1, useNativeDriver: false }),
      Animated.delay(SHOW_MS),
      Animated.timing(out, { toValue: 0, duration: FADE_MS, useNativeDriver: NATIVE }),
    ]);
    run.start(({ finished }) => finished && onDone());
    return () => run.stop();
  }, [dest]);

  // Le texte et le point posé apparaissent à l'arrivée du point volant.
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    const id = text.addListener(({ value }) => value >= 1 && setLanded(true));
    return () => text.removeListener(id);
  }, [text]);

  const dx = dest?.x ?? 0;
  const dy = dest ? dest.y + (dest.accented ? 0 : FONT * 0.12) : 0;
  const landDot = DOT * 0.9;
  const endScale = landDot / DOT;

  const translateX = fly.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [0, 0, dx, dx] });
  const translateY = fly.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [0, 0, dy + FONT * 0.2, dy] });
  const scaleX = fly.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [0, 1, endScale * 1.45, endScale] });
  const scaleY = fly.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [0, 1, endScale * 0.6, endScale] });

  const textColor = landed ? "#FFFFFF" : "transparent";

  const word = (txt: string, tIndex: number) =>
    Array.from(txt).map((ch, i) =>
      i === tIndex ? (
        <View key={i} ref={targetRef} collapsable={false} onLayout={measure}>
          <Text style={[s.title, { color: textColor }]}>{glyphFor(ch)}</Text>
        </View>
      ) : (
        <Text key={i} style={[s.title, { color: textColor }]}>{ch}</Text>
      )
    );

  return (
    <Animated.View ref={root as any} pointerEvents="auto" style={[s.wrap, { opacity: out }]}>
      <Animated.View
        style={[
          s.brand,
          {
            opacity: fly.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0], extrapolate: "clamp" }),
            transform: [{ scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          },
        ]}
      >
        <Animated.Text style={[s.brandText, { color: theme.colors.accent, opacity: intro }]}>Carnet</Animated.Text>
      </Animated.View>

      <View style={s.row}>
        <View style={s.word}>{word("Bonjour", target.word === "hello" ? target.index : -1)}</View>
        {name ? <View style={[s.word, { marginLeft: 12 }]}>{word(name, target.word === "name" ? target.index : -1)}</View> : null}
      </View>

      {/* Point volant : posé sur la lettre à l'arrivée, il remplace son point. */}
      <Animated.View
        pointerEvents="none"
        style={[
          s.dot,
          {
            backgroundColor: theme.colors.accent,
            shadowColor: theme.colors.accent,
            transform: [{ translateX }, { translateY }, { scaleX }, { scaleY }],
          },
        ]}
      />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    elevation: 1000,
  },
  brand: { position: "absolute", alignItems: "center", justifyContent: "center" },
  brandText: { fontSize: 54, fontWeight: "900", letterSpacing: -1.5 },
  row: { position: "absolute", top: "26%", flexDirection: "row", alignItems: "flex-end" },
  word: { flexDirection: "row", alignItems: "flex-end" },
  title: { fontSize: FONT, fontWeight: "800", letterSpacing: -0.5 },
  dot: {
    position: "absolute",
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});
