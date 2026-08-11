import { create } from "zustand";
import type { SessionHandle } from "pawnote";
import type {
  GradesOverview,
  Notebook,
  Timetable,
  Assignment,
  Evaluation,
  Resource,
  Discussion,
  Discussions,
  DiscussionMessages,
  News,
  NewsInformation,
  NewsSurvey,
} from "pawnote";
import {
  fetchAssignmentsRange,
  fetchGrades,
  fetchNotebook,
  fetchTimetableRange,
  setAssignmentDone,
  fetchEvaluations,
  fetchResourcesRange,
  fetchDiscussions,
  fetchDiscussionMessages,
  markDiscussionRead,
  fetchNews,
  setNewsRead,
} from "../lib/pronote";
import {
  MOCK_GRADES,
  MOCK_TIMETABLE,
  MOCK_ASSIGNMENTS,
  MOCK_NOTEBOOK,
  MOCK_EVALUATIONS,
  MOCK_RESOURCES,
  MOCK_DISCUSSIONS,
  MOCK_DISCUSSION_MESSAGES,
  MOCK_NEWS,
} from "../data/mock";

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
  evaluations: Evaluation[];
  resources: Resource[];
  discussions: Discussions | null;
  discussionMessagesById: Record<string, DiscussionMessages>;
  newsData: News | null;
  isDemoData: boolean;
  lastSyncedAt: number | null;
  loading: boolean;
  error: string | null;
  refreshAll: (session: SessionHandle) => Promise<void>;
  loadDemo: () => void;
  toggleAssignmentDone: (session: SessionHandle | null, id: string, done: boolean) => Promise<void>;
  loadDiscussionMessages: (session: SessionHandle | null, discussion: Discussion) => Promise<void>;
  toggleNewsRead: (session: SessionHandle | null, item: NewsInformation | NewsSurvey, read: boolean) => Promise<void>;
  reset: () => void;
};

export const useDataStore = create<DataState>((set, get) => ({
  grades: null,
  notebookData: null,
  timetable: null,
  assignments: [],
  evaluations: [],
  resources: [],
  discussions: null,
  discussionMessagesById: {},
  newsData: null,
  isDemoData: false,
  lastSyncedAt: null,
  loading: false,
  error: null,

  refreshAll: async (session) => {
    set({ loading: true, error: null });
    try {
      const now = new Date();
      const in21Days = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

      const [grades, notebookData, timetable, assignments, evaluations, resources, discussions, newsData] =
        await Promise.all([
          fetchGrades(session),
          fetchNotebook(session),
          // Même horizon que les devoirs (21 jours) : Pronote marque les cours
          // qui auront un contrôle (`test: true`) directement sur l'emploi du
          // temps, donc on a besoin de voir plus loin que la semaine en cours
          // pour construire une vraie liste de "contrôles à venir".
          fetchTimetableRange(session, startOfWeek(now), in21Days),
          fetchAssignmentsRange(session, now, in21Days),
          fetchEvaluations(session),
          // Contenu des cours : semaine en cours + les 21 jours à venir, pour
          // pouvoir préparer le sac de cours du lendemain avec la vraie
          // matière de chaque contenu.
          fetchResourcesRange(session, startOfWeek(now), in21Days),
          fetchDiscussions(session),
          fetchNews(session),
        ]);

      set({
        grades,
        notebookData,
        timetable,
        assignments: assignments.sort((a, b) => a.deadline.getTime() - b.deadline.getTime()),
        evaluations: evaluations.sort((a, b) => b.date.getTime() - a.date.getTime()),
        resources,
        discussions,
        newsData,
        isDemoData: false,
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

  // Les messages d'une discussion sont chargés à la demande (pas dans
  // refreshAll, trop coûteux pour toutes les charger d'un coup) et mis en
  // cache par id de discussion. En mode démo, on sert directement le mock
  // correspondant sans essayer d'appeler pawnote.
  loadDiscussionMessages: async (session, discussion) => {
    const cacheKey = discussion.participantsMessageID || discussion.subject;
    if (get().isDemoData) {
      const mocked = MOCK_DISCUSSION_MESSAGES[cacheKey];
      if (mocked) {
        set((s) => ({ discussionMessagesById: { ...s.discussionMessagesById, [cacheKey]: mocked } }));
      }
      return;
    }
    if (!session) return;
    try {
      const messages = await fetchDiscussionMessages(session, discussion, true);
      set((s) => ({ discussionMessagesById: { ...s.discussionMessagesById, [cacheKey]: messages } }));
      await markDiscussionRead(session, discussion).catch(() => {});
    } catch {
      // silencieux : l'écran garde l'état précédent (pas de message chargé)
    }
  },

  toggleNewsRead: async (session, item, read) => {
    set((s) => ({
      newsData: s.newsData
        ? { ...s.newsData, items: s.newsData.items.map((n) => (n.id === item.id ? { ...n, read } : n)) }
        : s.newsData,
    }));
    if (session && !get().isDemoData) {
      try {
        await setNewsRead(session, item, read);
      } catch {
        set((s) => ({
          newsData: s.newsData
            ? { ...s.newsData, items: s.newsData.items.map((n) => (n.id === item.id ? { ...n, read: !read } : n)) }
            : s.newsData,
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
      evaluations: MOCK_EVALUATIONS,
      resources: MOCK_RESOURCES,
      discussions: MOCK_DISCUSSIONS,
      discussionMessagesById: {},
      newsData: MOCK_NEWS,
      isDemoData: true,
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
      evaluations: [],
      resources: [],
      discussions: null,
      discussionMessagesById: {},
      newsData: null,
      isDemoData: false,
      lastSyncedAt: null,
      loading: false,
      error: null,
    }),
}));
