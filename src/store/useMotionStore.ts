import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MOTIONS, type MotionId, type MotionIntensity, type MotionSpeed } from "../lib/motion";

// Réglages d'animation, séparés de usePreferencesStore : c'est un système à
// part entière (12 animations + vitesse + intensité + 4 interrupteurs), et le
// garder dans son propre storage évite de charger tout le reste des
// préférences quand un composant ne s'intéresse qu'au mouvement.

type MotionState = {
  /** L'animation jouée à l'arrivée des cartes et des écrans. */
  motionId: MotionId;
  speed: MotionSpeed;
  intensity: MotionIntensity;
  /** Animer chaque carte, l'une après l'autre. */
  cards: boolean;
  /** Animer l'écran entier à chaque changement d'onglet. */
  screens: boolean;
  /** Enfoncement + vibration quand on appuie sur une carte ou un bouton. */
  press: boolean;
  /** Confettis quand on coche un devoir. */
  celebrations: boolean;
  setMotionId: (id: MotionId) => void;
  setSpeed: (speed: MotionSpeed) => void;
  setIntensity: (intensity: MotionIntensity) => void;
  setCards: (v: boolean) => void;
  setScreens: (v: boolean) => void;
  setPress: (v: boolean) => void;
  setCelebrations: (v: boolean) => void;
  /** Remet tout le bloc animations dans son état d'origine. */
  reset: () => void;
};

const DEFAULTS = {
  motionId: "glisse" as MotionId,
  speed: "normale" as MotionSpeed,
  intensity: "normale" as MotionIntensity,
  cards: true,
  screens: true,
  press: true,
  celebrations: true,
};

export const useMotionStore = create<MotionState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setMotionId: (motionId) => set({ motionId }),
      setSpeed: (speed) => set({ speed }),
      setIntensity: (intensity) => set({ intensity }),
      setCards: (cards) => set({ cards }),
      setScreens: (screens) => set({ screens }),
      setPress: (press) => set({ press }),
      setCelebrations: (celebrations) => set({ celebrations }),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: "carnet-motion",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // Une animation retirée du catalogue (ou une valeur corrompue) ne doit
      // pas figer l'app sur un id inconnu : on retombe sur la valeur par
      // défaut plutôt que de ne rien afficher.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<MotionState>;
        return {
          ...current,
          ...p,
          motionId: p.motionId && MOTIONS[p.motionId] ? p.motionId : current.motionId,
        };
      },
    }
  )
);
