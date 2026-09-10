import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, TABLE, genSyncCode } from "../lib/sync";

// ---------------------------------------------------------------------------
// Éléments perso : tout ce que Pronote ne fournit pas et que la personne
// ajoute elle-même. Volontairement séparé de useDataStore (les données
// Pronote) : une synchro Pronote ne doit jamais pouvoir les effacer.
// ---------------------------------------------------------------------------

export type PenseBete = {
  id: string;
  texte: string;
  epingle: boolean;
  createdAt: number;
  updatedAt: number;
};

export type DevoirManuel = {
  id: string;
  titre: string;
  matiere: string;
  /** Date d'échéance, format "AAAA-MM-JJ" (jour seul, pas d'heure). */
  date: string;
  /** Durée estimée en minutes, si la personne en met une. */
  duree: number | null;
  note: string;
  fait: boolean;
  createdAt: number;
  updatedAt: number;
};

export type CreneauPerso = {
  id: string;
  titre: string;
  /** Matière rattachée (facultatif) — sert à reprendre sa couleur. */
  matiere: string;
  /** Couleur explicite (hex) — prioritaire sur la couleur de matière. */
  couleur: string | null;
  recurrence: "ponctuel" | "hebdo";
  /** Si ponctuel : "AAAA-MM-JJ". */
  date: string | null;
  /** Si hebdo : 0 = lundi … 6 = dimanche. */
  jour: number | null;
  /** "HH:MM" */
  debut: string;
  /** "HH:MM" */
  fin: string;
  lieu: string;
  createdAt: number;
  updatedAt: number;
};

function nouvelId(prefixe: string): string {
  return `${prefixe}${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

type Snapshot = {
  penseBetes: PenseBete[];
  devoirsManuels: DevoirManuel[];
  creneauxPerso: CreneauPerso[];
};

export type SyncStatus =
  | "off"
  | "idle"
  | "pushing"
  | "pulling"
  | "synced"
  | "error";

type LocalItemsState = Snapshot & {
  syncCode: string;
  /** updated_at connu du serveur : sert à repérer une modif venue d'ailleurs. */
  syncKnownAt: string | null;
  syncStatus: SyncStatus;
  syncMessage: string;

  // Pense-bête
  ajouterPenseBete: (texte: string) => void;
  modifierPenseBete: (id: string, texte: string) => void;
  togglePenseBeteEpingle: (id: string) => void;
  supprimerPenseBete: (id: string) => void;

  // Devoirs manuels
  ajouterDevoirManuel: (input: Omit<DevoirManuel, "id" | "fait" | "createdAt" | "updatedAt">) => void;
  modifierDevoirManuel: (id: string, input: Partial<Omit<DevoirManuel, "id" | "createdAt">>) => void;
  toggleDevoirManuelFait: (id: string) => void;
  supprimerDevoirManuel: (id: string) => void;

  // Créneaux perso
  ajouterCreneauPerso: (input: Omit<CreneauPerso, "id" | "createdAt" | "updatedAt">) => void;
  modifierCreneauPerso: (id: string, input: Partial<Omit<CreneauPerso, "id" | "createdAt">>) => void;
  supprimerCreneauPerso: (id: string) => void;

  // Synchro
  creerSyncCode: () => void;
  lierSyncCode: (code: string) => Promise<void>;
  delierSync: () => void;
  pullSync: () => Promise<void>;
};

const SNAPSHOT_VIDE: Snapshot = { penseBetes: [], devoirsManuels: [], creneauxPerso: [] };

let pushTimer: ReturnType<typeof setTimeout> | null = null;

export const useLocalItemsStore = create<LocalItemsState>()(
  persist(
    (set, get) => {
      // Repousse un instantané complet vers Supabase, avec un léger délai
      // pour regrouper plusieurs modifications rapprochées en un seul appel.
      function schedulePush() {
        // `hasHydrated()` évite de repousser un instantané vide juste après le
        // démarrage, avant que le contenu persisté ne soit rechargé.
        if (!useLocalItemsStore.persist.hasHydrated() || !get().syncCode) return;
        if (pushTimer) clearTimeout(pushTimer);
        pushTimer = setTimeout(() => {
          void pushNow();
        }, 900);
      }

      async function pushNow() {
        const { syncCode, penseBetes, devoirsManuels, creneauxPerso } = get();
        if (!syncCode) return;
        set({ syncStatus: "pushing", syncMessage: "Synchronisation…" });
        const { data, error } = await supabase
          .from(TABLE)
          .upsert({ code: syncCode, data: { penseBetes, devoirsManuels, creneauxPerso } })
          .select("updated_at")
          .single();
        if (error) {
          set({ syncStatus: "error", syncMessage: `Échec : ${error.message}` });
          return;
        }
        set({
          syncKnownAt: data?.updated_at ?? null,
          syncStatus: "synced",
          syncMessage: "Synchronisé à l'instant",
        });
      }

      return {
        ...SNAPSHOT_VIDE,
        syncCode: "",
        syncKnownAt: null,
        syncStatus: "off",
        syncMessage: "",

        ajouterPenseBete: (texte) => {
          const t = texte.trim();
          if (!t) return;
          const now = Date.now();
          set((s) => ({
            penseBetes: [
              { id: nouvelId("pb"), texte: t, epingle: false, createdAt: now, updatedAt: now },
              ...s.penseBetes,
            ],
          }));
          schedulePush();
        },
        modifierPenseBete: (id, texte) => {
          set((s) => ({
            penseBetes: s.penseBetes.map((p) =>
              p.id === id ? { ...p, texte: texte.trim(), updatedAt: Date.now() } : p
            ),
          }));
          schedulePush();
        },
        togglePenseBeteEpingle: (id) => {
          set((s) => ({
            penseBetes: s.penseBetes.map((p) =>
              p.id === id ? { ...p, epingle: !p.epingle, updatedAt: Date.now() } : p
            ),
          }));
          schedulePush();
        },
        supprimerPenseBete: (id) => {
          set((s) => ({ penseBetes: s.penseBetes.filter((p) => p.id !== id) }));
          schedulePush();
        },

        ajouterDevoirManuel: (input) => {
          const now = Date.now();
          set((s) => ({
            devoirsManuels: [
              { ...input, id: nouvelId("dm"), fait: false, createdAt: now, updatedAt: now },
              ...s.devoirsManuels,
            ],
          }));
          schedulePush();
        },
        modifierDevoirManuel: (id, input) => {
          set((s) => ({
            devoirsManuels: s.devoirsManuels.map((d) =>
              d.id === id ? { ...d, ...input, updatedAt: Date.now() } : d
            ),
          }));
          schedulePush();
        },
        toggleDevoirManuelFait: (id) => {
          set((s) => ({
            devoirsManuels: s.devoirsManuels.map((d) =>
              d.id === id ? { ...d, fait: !d.fait, updatedAt: Date.now() } : d
            ),
          }));
          schedulePush();
        },
        supprimerDevoirManuel: (id) => {
          set((s) => ({ devoirsManuels: s.devoirsManuels.filter((d) => d.id !== id) }));
          schedulePush();
        },

        ajouterCreneauPerso: (input) => {
          const now = Date.now();
          set((s) => ({
            creneauxPerso: [
              { ...input, id: nouvelId("cp"), createdAt: now, updatedAt: now },
              ...s.creneauxPerso,
            ],
          }));
          schedulePush();
        },
        modifierCreneauPerso: (id, input) => {
          set((s) => ({
            creneauxPerso: s.creneauxPerso.map((c) =>
              c.id === id ? { ...c, ...input, updatedAt: Date.now() } : c
            ),
          }));
          schedulePush();
        },
        supprimerCreneauPerso: (id) => {
          set((s) => ({ creneauxPerso: s.creneauxPerso.filter((c) => c.id !== id) }));
          schedulePush();
        },

        creerSyncCode: () => {
          set({
            syncCode: genSyncCode(),
            syncKnownAt: null,
            syncStatus: "idle",
            syncMessage: "",
          });
          schedulePush();
        },
        lierSyncCode: async (code) => {
          const clean = code.trim().toUpperCase();
          if (!clean) return;
          set({ syncCode: clean, syncKnownAt: null, syncStatus: "pulling", syncMessage: "Vérification…" });
          await get().pullSync();
        },
        delierSync: () => {
          if (pushTimer) clearTimeout(pushTimer);
          set({ syncCode: "", syncKnownAt: null, syncStatus: "off", syncMessage: "" });
        },
        pullSync: async () => {
          const { syncCode, syncKnownAt } = get();
          if (!syncCode) return;
          set({ syncStatus: "pulling", syncMessage: "Vérification…" });
          const { data, error } = await supabase
            .from(TABLE)
            .select("data, updated_at")
            .eq("code", syncCode)
            .maybeSingle();
          if (error) {
            set({ syncStatus: "error", syncMessage: `Échec : ${error.message}` });
            return;
          }
          if (!data) {
            // Code jamais poussé depuis un autre appareil : on initialise la
            // ligne avec ce qu'on a en local.
            await pushNow();
            return;
          }
          if (data.updated_at !== syncKnownAt) {
            const remote = (data.data ?? {}) as Partial<Snapshot>;
            set({
              penseBetes: remote.penseBetes ?? [],
              devoirsManuels: remote.devoirsManuels ?? [],
              creneauxPerso: remote.creneauxPerso ?? [],
              syncKnownAt: data.updated_at,
              syncStatus: "synced",
              syncMessage: "À jour",
            });
          } else {
            set({ syncStatus: "synced", syncMessage: "À jour" });
          }
        },
      };
    },
    {
      name: "carnet-local",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (s) => ({
        penseBetes: s.penseBetes,
        devoirsManuels: s.devoirsManuels,
        creneauxPerso: s.creneauxPerso,
        syncCode: s.syncCode,
        syncKnownAt: s.syncKnownAt,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<LocalItemsState>;
        return {
          ...current,
          ...p,
          penseBetes: p.penseBetes ?? [],
          devoirsManuels: p.devoirsManuels ?? [],
          creneauxPerso: p.creneauxPerso ?? [],
          syncCode: p.syncCode ?? "",
          syncStatus: p.syncCode ? "idle" : "off",
        };
      },
    }
  )
);
