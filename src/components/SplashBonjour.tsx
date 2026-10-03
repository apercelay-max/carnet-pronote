import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

// Écran d'accueil : sur fond noir, une ligne en bas de l'écran accélère en se
// resserrant en boule, file vers le prénom, s'écrase en le touchant puis
// s'étire à nouveau en ligne pour le souligner. Un second point tombe alors du
// haut (avec un rebond) et se pose sur le point ou l'accent d'une lettre.
// Les positions sont mesurées sur l'écran réel : ça tombe juste quelle que
// soit la taille de la fenêtre.

const FONT = 44;
const BALL = 14;
const DOT = 9;
const LINE_H = 4;
const UNDER_H = 3;

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

// La lettre cible est dessinée sans son point : le point qui tombe le remplace.
function glyphFor(char: string) {
  const d = char.normalize("NFD");
  const base = d[0];
  if (d.length > 1) return base;
  return base === "i" ? "ı" : base === "j" ? "ȷ" : base;
}

type Box = { x: number; y: number; w: number; h: number };
type Props = { firstName: string; onDone: () => void };

export function SplashBonjour({ firstName, onDone }: Props) {
  const theme = useTheme();
  const accent = theme.colors.accent;
  const name = firstName.trim();
  const target = useMemo(() => findTarget(name), [name]);
  const targetChar = target.word === "name" ? name[target.index] : "j";
  const accented = targetChar.normalize("NFD").length > 1;

  const root = useRef<View>(null);
  const underRef = useRef<View>(null);
  const letterRef = useRef<View>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [geo, setGeo] = useState<{ under: Box; letter: Box } | null>(null);

  const ball = useRef(new Animated.Value(0)).current; // 0 ligne · 1 boule · 2 écrasée · 3 soulignement
  const drop = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;

  // Mesure le mot souligné et la lettre cible, relativement au calque.
  const measure = () => {
    const r = root.current as any;
    const u = underRef.current as any;
    const l = letterRef.current as any;
    if (!r || !u || !l) return;
    r.measureInWindow((rx: number, ry: number) => {
      u.measureInWindow((ux: number, uy: number, uw: number, uh: number) => {
        l.measureInWindow((lx: number, ly: number, lw: number, lh: number) => {
          if (!uw || !lw) return;
          setGeo({
            under: { x: ux - rx, y: uy - ry, w: uw, h: uh },
            letter: { x: lx - rx, y: ly - ry, w: lw, h: lh },
          });
        });
      });
    });
  };

  useEffect(() => {
    if (!size) return;
    const t = setTimeout(measure, 60);
    return () => clearTimeout(t);
  }, [size]);

  useEffect(() => {
    if (!geo) return;
    const run = Animated.sequence([
      Animated.delay(350),
      // La ligne s'élance : départ doux, grosse accélération, comme tirée par la gravité.
      Animated.timing(ball, { toValue: 1, duration: 950, easing: Easing.bezier(0.7, 0, 0.9, 0.4), useNativeDriver: false }),
      // Choc : la boule s'écrase sur le prénom…
      Animated.timing(ball, { toValue: 2, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.parallel([
        // …puis s'étire en ligne sous le mot.
        Animated.timing(ball, { toValue: 3, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(text, { toValue: 1, duration: 420, useNativeDriver: false }),
      ]),
      // Le point tombe du haut et rebondit sur l'accent.
      Animated.timing(drop, { toValue: 1, duration: 650, easing: Easing.bounce, useNativeDriver: false }),
      Animated.delay(1000),
      Animated.timing(out, { toValue: 0, duration: 420, useNativeDriver: Platform.OS !== "web" }),
    ]);
    run.start(({ finished }) => finished && onDone());
    return () => run.stop();
  }, [geo]);

  const W = size?.w ?? 0;
  const H = size?.h ?? 0;

  // Boule : positions de son centre à chaque étape.
  const under = geo?.under;
  const cxEnd = under ? under.x + under.w / 2 : W / 2;
  const cyEnd = under ? under.y + under.h + 6 : H / 2;
  const cyStart = H - 56;
  const ballLeft = ball.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [W / 2 - 70, cxEnd - BALL / 2, cxEnd - 13, under ? under.x : cxEnd],
  });
  const ballTop = ball.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [cyStart - LINE_H / 2, cyEnd - BALL / 2, cyEnd - 3, cyEnd - UNDER_H / 2],
  });
  const ballW = ball.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [140, BALL, 26, under ? under.w : BALL],
  });
  const ballH = ball.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [LINE_H, BALL, 6, UNDER_H] });

  // Point qui tombe : du haut de l'écran jusqu'au point/accent de la lettre.
  const letter = geo?.letter;
  const dotX = letter ? letter.x + letter.w / 2 - DOT / 2 : 0;
  const dotY = letter ? letter.y + letter.h * (accented ? 0.14 : 0.2) - DOT / 2 : 0;
  const dotTop = drop.interpolate({ inputRange: [0, 1], outputRange: [-DOT * 2, dotY] });
  const dotOpacity = drop.interpolate({ inputRange: [0, 0.02, 1], outputRange: [0, 1, 1] });

  const word = (txt: string, tIndex: number) =>
    Array.from(txt).map((ch, i) =>
      i === tIndex ? (
        <View key={i} ref={letterRef} collapsable={false}>
          <Text style={s.title}>{glyphFor(ch)}</Text>
        </View>
      ) : (
        <Text key={i} style={s.title}>{ch}</Text>
      )
    );

  const hello = (
    <View style={s.word} ref={name ? undefined : underRef} collapsable={false}>
      {word("Bonjour", target.word === "hello" ? target.index : -1)}
    </View>
  );

  return (
    <Animated.View
      ref={root as any}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[s.wrap, { opacity: out }]}
    >
      <Animated.View style={[s.row, { opacity: text }]}>
        {hello}
        {name ? (
          <View style={[s.word, { marginLeft: 14 }]} ref={underRef} collapsable={false}>
            {word(name, target.word === "name" ? target.index : -1)}
          </View>
        ) : null}
      </Animated.View>

      {geo ? (
        <>
          {/* Ligne → boule → ligne de soulignement */}
          <Animated.View
            pointerEvents="none"
            style={[
              s.shape,
              {
                backgroundColor: accent,
                shadowColor: accent,
                left: ballLeft,
                top: ballTop,
                width: ballW,
                height: ballH,
              },
            ]}
          />
          {/* Second point : celui du i, du j ou de l'accent */}
          <Animated.View
            pointerEvents="none"
            style={[s.shape, { backgroundColor: accent, shadowColor: accent, width: DOT, height: DOT, left: dotX, top: dotTop, opacity: dotOpacity }]}
          />
        </>
      ) : null}
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
  row: { flexDirection: "row", alignItems: "flex-end" },
  word: { flexDirection: "row", alignItems: "flex-end" },
  title: { fontSize: FONT, fontWeight: "800", letterSpacing: -0.5, color: "#FFFFFF" },
  shape: {
    position: "absolute",
    borderRadius: 999,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});
