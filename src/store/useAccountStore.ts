import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COMPTES_TABLE, getSupabase, messageErreur } from "../lib/supabaseAuth";
import { usePreferencesStore } from "./usePreferencesStore";
import { useMotionStore } from "./useMotionStore";
import { useFichesStore } from "./useFichesStore";
import { useRevisionPreferencesStore } from "./useRevisionPreferencesStore";

// Compte Carnet : retrouver SES réglages et SES fiches sur un autre appareil.
//
// Ce qui est synchronisé, et pourquoi c'est cette liste : les clés
// AsyncStorage des préférences, des animations et des fiches. Ce sont les
// seules choses que la personne a construites elle-même et qu'elle perdrait en
// changeant de téléphone. Volontairement absents :
//  - les identifiants Pronote : ils vivent dans le stockage sécurisé de
//    l'appareil et n'ont rien à faire dans une base ;
//  - la clé Gemini, pour la même raison ;
//  - les données Pronote elles-mêmes : elles se re-téléchargent en une
//    seconde, les copier serait dupliquer des notes scolaires sans raison.

const CLES_SYNCHRONISEES = [
  "carnet-preferences",
  "carnet-motion",
  "carnet-fiches",
  "carnet-revision-preferences",
] as const;

export type CompteStatus = "inconnu" | "deconnecte" | "connecte";
export type SyncEtat = "repos" | "envoi" | "reception" | "erreur";

type AccountState = {
  status: CompteStatus;
  email: string | null;
  userId: string | null;
  busy: boolean;
  error: string | null;
  /** Message affiché après une action (« Réglages envoyés », …). */
  info: string | null;
  syncEtat: SyncEtat;
  lastSyncAt: number | null;
  /** Vrai quand le compte est créé mais l'email pas encore confirmé. */
  attenteConfirmation: boolean;

  bootstrap: () => Promise<void>;
  creerCompte: (email: string, password: string) => Promise<void>;
  seConnecter: (email: string, password: string) => Promise<void>;
  seDeconnecter: () => Promise<void>;
  envoyer: () => Promise<void>;
  recevoir: () => Promise<void>;
  clearMessages: () => void;
};

/** Instantané des réglages locaux, tel qu'il part vers Supabase. */
async function lireInstantane(): Promise<Record<string, unknown>> {
  const brut = await AsyncStorage.getMany([...CLES_SYNCHRONISEES]);
  const out: Record<string, unknown> = {};
  for (const [cle, valeur] of Object.entries(brut)) {
    if (!valeur) continue;
    try {
      out[cle] = JSON.parse(valeur);
    } catch {
      // Une clé illisible est ignorée plutôt que d'annuler toute la
      // sauvegarde : mieux vaut synchroniser 3 réglages sur 4 que rien.
    }
  }
  return out;
}

/**
 * Réécrit les réglages locaux puis force chaque store à se relire.
 *
 * Sans `rehydrate()`, les stores garderaient en mémoire les anciennes valeurs
 * jusqu'au prochain démarrage de l'app : on verrait « reçu » sans rien voir
 * changer à l'écran.
 */
async function ecrireInstantane(data: Record<string, unknown>): Promise<number> {
  const entrees: Record<string, string> = {};
  for (const cle of CLES_SYNCHRONISEES) {
    const valeur = data?.[cle];
    if (valeur === undefined) continue;
    entrees[cle] = JSON.stringify(valeur);
  }
  const n = Object.keys(entrees).length;
  if (n) await AsyncStorage.setMany(entrees);

  await Promise.all([
    usePreferencesStore.persist.rehydrate(),
    useMotionStore.persist.rehydrate(),
    useFichesStore.persist.rehydrate(),
    useRevisionPreferencesStore.persist.rehydrate(),
  ]);
  return n;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  status: "inconnu",
  email: null,
  userId: null,
  busy: false,
  error: null,
  info: null,
  syncEtat: "repos",
  lastSyncAt: null,
  attenteConfirmation: false,

  bootstrap: async () => {
    try {
      const { data } = await getSupabase().auth.getSession();
      const session = data.session;
      set(
        session
          ? {
              status: "connecte",
              email: session.user.email ?? null,
              userId: session.user.id,
            }
          : { status: "deconnecte", email: null, userId: null }
      );
    } catch {
      // Hors ligne au démarrage : on se déclare déconnecté plutôt que de
      // rester bloqué sur "inconnu" avec un écran vide.
      set({ status: "deconnecte" });
    }
  },

  creerCompte: async (email, password) => {
    set({ busy: true, error: null, info: null, attenteConfirmation: false });
    try {
      const { data, error } = await getSupabase().auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      if (!data.session) {
        // Supabase est configuré pour exiger une confirmation par email : le
        // compte existe, mais on ne peut pas encore s'en servir.
        set({
          busy: false,
          attenteConfirmation: true,
          info: "Compte créé. Ouvre le mail de confirmation, puis connecte-toi.",
        });
        return;
      }

      set({
        busy: false,
        status: "connecte",
        email: data.session.user.email ?? null,
        userId: data.session.user.id,
        info: "Compte créé. Envoie tes réglages pour les retrouver ailleurs.",
      });
    } catch (err: any) {
      set({ busy: false, error: messageErreur(err?.message ?? String(err)) });
    }
  },

  seConnecter: async (email, password) => {
    set({ busy: true, error: null, info: null, attenteConfirmation: false });
    try {
      const { data, error } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      set({
        busy: false,
        status: "connecte",
        email: data.user?.email ?? null,
        userId: data.user?.id ?? null,
        info: "Connecté.",
      });
      // Récupération immédiate : c'est le geste attendu en se connectant sur
      // un nouvel appareil, ça évite de devoir y penser.
      await get().recevoir();
    } catch (err: any) {
      set({ busy: false, error: messageErreur(err?.message ?? String(err)) });
    }
  },

  seDeconnecter: async () => {
    set({ busy: true, error: null, info: null });
    try {
      await getSupabase().auth.signOut();
    } catch {
      // Même si le serveur refuse, on se déconnecte localement : rester coincé
      // dans un compte parce qu'on est hors ligne n'aurait aucun sens.
    }
    // Les réglages locaux ne sont PAS effacés : se déconnecter n'est pas
    // supprimer ses fiches sur cet appareil.
    set({
      busy: false,
      status: "deconnecte",
      email: null,
      userId: null,
      info: "Déconnecté. Tes réglages restent sur cet appareil.",
    });
  },

  envoyer: async () => {
    const { userId } = get();
    if (!userId) return;
    set({ syncEtat: "envoi", error: null, info: null });
    try {
      const data = await lireInstantane();
      const { error } = await getSupabase()
        .from(COMPTES_TABLE)
        .upsert(
          { user_id: userId, data, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (error) throw error;
      set({
        syncEtat: "repos",
        lastSyncAt: Date.now(),
        info: "Réglages et fiches envoyés.",
      });
    } catch (err: any) {
      set({ syncEtat: "erreur", error: messageErreur(err?.message ?? String(err)) });
    }
  },

  recevoir: async () => {
    const { userId } = get();
    if (!userId) return;
    set({ syncEtat: "reception", error: null, info: null });
    try {
      const { data, error } = await getSupabase()
        .from(COMPTES_TABLE)
        .select("data, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;

      if (!data?.data) {
        set({
          syncEtat: "repos",
          info: "Rien d'enregistré dans ce compte pour l'instant.",
        });
        return;
      }

      const n = await ecrireInstantane(data.data as Record<string, unknown>);
      set({
        syncEtat: "repos",
        lastSyncAt: Date.now(),
        info: n
          ? "Réglages et fiches récupérés."
          : "Rien à récupérer : la sauvegarde est vide.",
      });
    } catch (err: any) {
      set({ syncEtat: "erreur", error: messageErreur(err?.message ?? String(err)) });
    }
  },

  clearMessages: () => set({ error: null, info: null }),
}));
