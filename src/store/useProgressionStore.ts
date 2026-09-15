import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Carte } from "../lib/fiches";
import { cartesDeFiche } from "../lib/ficheGemini";
import type { Fiche } from "./useFichesStore";

// Progression de révision, 100 % locale.
//
// 1. Répétition espacée (boîtes de Leitner) : une carte sue remonte d'une
//    boîte et revient plus tard (1, 2, 4, 8 puis 16 jours) ; une carte ratée
//    retourne en boîte 1 et revient dès le lendemain. C'est la méthode qui
//    fait le mieux retenir sur la durée, pour le prix d'un petit calcul.
// 2. Historique des sessions (flashcards, contrôles blancs) pour montrer la
//    progression par matière.

export type EtatCarte = { boite: number; prochaine: string; vues: number };

export type SessionRevision = {
  date: number;
  ficheId: string;
  matiere: string;
  sues: number;
  total: number;
  type: "flashcards" | "blanc";
};

const INTERVALLES = [1, 2, 4, 8, 16];
const MAX_SESSIONS = 300;

export function jourLocal(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Clé stable d'une carte : la fiche + le recto (les cartes n'ont pas d'id). */
export function cleCarte(ficheId: string, recto: string): string {
  return `${ficheId}::${recto.slice(0, 160)}`;
}

export type CarteSuivie = Carte & { ficheId: string; matiere: string };

/** Cartes déjà vues dont la date de retour est arrivée. Les cartes jamais vues ne sont pas « dues ». */
export function cartesDues(fiches: Fiche[], etats: Record<string, EtatCarte>): CarteSuivie[] {
  const aujourdhui = jourLocal();
  return fiches.flatMap((f) =>
    cartesDeFiche(f)
      .filter((c) => {
        const e = etats[cleCarte(f.id, c.recto)];
        return e && e.prochaine <= aujourdhui;
      })
      .map((c) => ({ ...c, ficheId: f.id, matiere: f.matiere }))
  );
}

type ProgressionState = {
  cartes: Record<string, EtatCarte>;
  sessions: SessionRevision[];
  noterCarte: (ficheId: string, recto: string, su: boolean) => void;
  enregistrerSession: (s: Omit<SessionRevision, "date">) => void;
};

export const useProgressionStore = create<ProgressionState>()(
  persist(
    (set) => ({
      cartes: {},
      sessions: [],

      noterCarte: (ficheId, recto, su) =>
        set((s) => {
          const cle = cleCarte(ficheId, recto);
          const avant = s.cartes[cle];
          const boite = su ? Math.min(INTERVALLES.length, (avant?.boite ?? 0) + 1) : 1;
          const prochaine = new Date();
          prochaine.setDate(prochaine.getDate() + INTERVALLES[boite - 1]);
          return {
            cartes: { ...s.cartes, [cle]: { boite, prochaine: jourLocal(prochaine), vues: (avant?.vues ?? 0) + 1 } },
          };
        }),

      enregistrerSession: (session) =>
        set((s) => ({ sessions: [...s.sessions, { ...session, date: Date.now() }].slice(-MAX_SESSIONS) })),
    }),
    {
      name: "carnet-progression",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);

/** Jours consécutifs (jusqu'à aujourd'hui ou hier) avec au moins une session. */
export function serieDeJours(sessions: SessionRevision[]): number {
  const jours = new Set(sessions.map((s) => jourLocal(new Date(s.date))));
  const d = new Date();
  if (!jours.has(jourLocal(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (jours.has(jourLocal(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
