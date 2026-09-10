import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStorage from "../lib/secureStorage";

// État de l'assistant Gemini.
//
// La clé API n'est PAS dans le store persisté avec le reste : c'est un
// identifiant, elle va dans le même stockage que le token Pronote
// (Keychain/Keystore sur mobile, localStorage sur le web faute de mieux —
// voir lib/secureStorage.ts). Le reste (fil de discussion, réglages) passe
// par AsyncStorage comme les autres préférences.

const KEY_STORAGE = "carnet_gemini_api_key";

export type ChatMessage = {
  id: string;
  role: "user" | "model";
  text: string;
  /** Message d'erreur affiché dans le fil plutôt qu'en bandeau. */
  failed?: boolean;
};

type GeminiState = {
  /** null tant qu'on n'a pas lu le stockage sécurisé. */
  apiKey: string | null;
  keyLoaded: boolean;
  /** Joindre le résumé de la scolarité aux questions. */
  useSchoolData: boolean;
  messages: ChatMessage[];
  loadKey: () => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
  setUseSchoolData: (v: boolean) => void;
  addMessage: (message: ChatMessage) => void;
  replaceMessage: (id: string, patch: Partial<ChatMessage>) => void;
  clearMessages: () => void;
};

export const useGeminiStore = create<GeminiState>()(
  persist(
    (set) => ({
      apiKey: null,
      keyLoaded: false,
      useSchoolData: true,
      messages: [],

      loadKey: async () => {
        try {
          const key = await SecureStorage.getItemAsync(KEY_STORAGE);
          set({ apiKey: key, keyLoaded: true });
        } catch {
          set({ keyLoaded: true });
        }
      },
      setApiKey: async (key) => {
        const clean = key.trim();
        if (!clean) return;
        await SecureStorage.setItemAsync(KEY_STORAGE, clean);
        set({ apiKey: clean, keyLoaded: true });
      },
      clearApiKey: async () => {
        await SecureStorage.deleteItemAsync(KEY_STORAGE);
        set({ apiKey: null });
      },

      setUseSchoolData: (useSchoolData) => set({ useSchoolData }),
      addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
      replaceMessage: (id, patch) =>
        set((s) => ({
          messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: "carnet-gemini",
      storage: createJSONStorage(() => AsyncStorage),
      // apiKey/keyLoaded volontairement exclus : la clé vit dans le stockage
      // sécurisé, elle ne doit pas se retrouver dupliquée dans AsyncStorage.
      partialize: (s) => ({ useSchoolData: s.useSchoolData, messages: s.messages }),
    }
  )
);
