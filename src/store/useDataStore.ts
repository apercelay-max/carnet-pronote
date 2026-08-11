import { create } from "zustand";
import type { SessionHandle } from "pawnote";
import type { GradesOverview, Notebook, Timetable, Assignment } from "pawnote";
import {
  fetchAssignmentsRange,
  fetchGrades,
  fetchNotebook,
  fetchTimetableRange,
  setAssignmentDone,
} from "../lib/pronote";
import { MOCK_GRADES, MOCK_TIMETABLE, MOCK_ASSIGNMENTS, MOCK_NOTEBOOK } from "../data/mock";

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // lundi = 0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfWeek(d: Date) {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

type DataState = {
  grades: GradesOverview | null;
  notebookData: Notebook | null;
  timetable: Timetable | null;
  assignments: Assignment[];
  lastSyncedAt: number | null;
  loading: boolean;
  error: string | null;
  refreshAll: (session: SessionHandle) => Promise<void>;
  loadDemo: () => void;
  toggleAssignmentDone: (session: SessionHandle | null, id: string, done: boolean) => Promise<void>;
  reset: () => void;
};

export const useDataStore = create<DataState>((set) => ({
  grades: null,
  notebookData: null,
  timetable: null,
  assignments: [],
  lastSyncedAt: null,
  loading: false,
  error: null,

  refreshAll: async (session) => {
    set({ loading: true, error: null });
    try {
      const now = new Date();
      const in21Days = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

      const [grades, notebookData, timetable, assignments] = await Promise.all([
        fetchGrades(session),
        fetchNotebook(session),
        // Même horizon que les devoirs (21 jours) : Pronote marque les cours
        // qui auront un contrôle (`test: true`) directement sur l'emploi du
        // temps, donc on a besoin de voir plus loin que la semaine en cours
        // pour construire une vraie liste de "contrôles à venir".
        fetchTimetableRange(session, startOfWeek(now), in21Days),
        fetchAssignmentsRange(session, now, in21Days),
      ]);

      set({
        grades,
        notebookData,
        timetable,
        assignments: assignments.sort((a, b) => a.deadline.getTime() - b.deadline.getTime()),
        lastSyncedAt: Date.now(),
        loading: false,
      });
    } catch (err: any) {
      set({ loading: false, error: err?.message ?? "Impossible de récupérer tes données." });
    }
  },

  toggleAssignmentDone: async (session, id, done) => {
    set((s) => ({
      assignments: s.assignments.map((a) => (a.id === id ? { ...a, done } : a)),
    }));
    if (session) {
      try {
        await setAssignmentDone(session, id, done);
      } catch {
        // on annule le changement local si le serveur refuse
        set((s) => ({
          assignments: s.assignments.map((a) => (a.id === id ? { ...a, done: !done } : a)),
        }));
      }
    }
  },

  loadDemo: () =>
    set({
      grades: MOCK_GRADES,
      notebookData: MOCK_NOTEBOOK,
      timetable: MOCK_TIMETABLE,
      assignments: MOCK_ASSIGNMENTS,
      lastSyncedAt: Date.now(),
      loading: false,
      error: null,
    }),

  reset: () =>
    set({
      grades: null,
      notebookData: null,
      timetable: null,
      assignments: [],
      lastSyncedAt: null,
      loading: false,
      error: null,
    }),
}));
