import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import {
  loginWithPassword,
  restoreSession,
  PronoteAuthError,
  PronoteENTError,
  type StoredCredentials,
} from "../lib/pronote";
import type { SessionHandle } from "pawnote";
import { useDataStore } from "./useDataStore";

const CREDENTIALS_KEY = "carnet_pronote_credentials";

type SessionStatus = "starting" | "authenticated" | "unauthenticated";

type SessionState = {
  status: SessionStatus;
  session: SessionHandle | null;
  displayName: string | null;
  error: string | null;
  isBusy: boolean;
  isDemo: boolean;
  bootstrap: () => Promise<void>;
  login: (url: string, username: string, password: string) => Promise<boolean>;
  enterDemo: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
};

async function persistCredentials(creds: StoredCredentials) {
  await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(creds));
}

async function readCredentials(): Promise<StoredCredentials | null> {
  const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredCredentials;
  } catch {
    return null;
  }
}

export const useSessionStore = create<SessionState>((set, get) => ({
  status: "starting",
  session: null,
  displayName: null,
  error: null,
  isBusy: false,
  isDemo: false,

  bootstrap: async () => {
    const stored = await readCredentials();
    if (!stored) {
      set({ status: "unauthenticated" });
      return;
    }
    try {
      const { session, credentials } = await restoreSession(stored);
      await persistCredentials(credentials);
      set({
        status: "authenticated",
        session,
        displayName: session.user.name,
        error: null,
      });
    } catch {
      await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
      set({
        status: "unauthenticated",
        error: "Ta session a expiré, reconnecte-toi.",
      });
    }
  },

  login: async (url, username, password) => {
    set({ isBusy: true, error: null });
    try {
      const { session, credentials } = await loginWithPassword(url, username, password);
      await persistCredentials(credentials);
      set({
        status: "authenticated",
        session,
        displayName: session.user.name,
        isBusy: false,
        error: null,
      });
      return true;
    } catch (err) {
      let message = "Connexion impossible, vérifie tes identifiants.";
      if (err instanceof PronoteENTError) message = err.message;
      else if (err instanceof PronoteAuthError) message = err.message;
      set({ isBusy: false, error: message });
      return false;
    }
  },

  enterDemo: () => {
    useDataStore.getState().loadDemo();
    set({ status: "authenticated", session: null, displayName: "Démo", isDemo: true, error: null });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
    useDataStore.getState().reset();
    set({ status: "unauthenticated", session: null, displayName: null, error: null, isDemo: false });
  },

  clearError: () => set({ error: null }),
}));
