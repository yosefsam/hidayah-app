import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ReadingGoal,
  ReadingSession,
  Streak,
  Reminder,
  OnboardingPreferences,
  DailyStatus,
  Bookmark,
  LastReadPosition,
  ReaderPreferences,
} from "@/types";
import { clearLegacyReaderStorage } from "@/lib/reader-storage-legacy";
import { setDemoCookieClient } from "@/lib/demo-cookie";

function uniqueSortedPages(pages: number[]): number[] {
  return Array.from(new Set(pages.filter((n) => n >= 1 && n <= 604))).sort((a, b) => a - b);
}

interface AppState {
  theme: "light" | "dark" | "system";
  setTheme: (t: "light" | "dark" | "system") => void;
  isDemo: boolean;
  setDemoMode: (on: boolean, data?: { goal: ReadingGoal; streak: Streak; sessions: ReadingSession[] }) => void;
  userGoal: ReadingGoal | null;
  setUserGoal: (g: ReadingGoal | null) => void;
  sessions: ReadingSession[];
  setSessions: (s: ReadingSession[]) => void;
  addSession: (s: ReadingSession) => void;
  streak: Streak | null;
  setStreak: (s: Streak | null) => void;
  reminder: Reminder | null;
  setReminder: (r: Reminder | null) => void;
  onboardingPreferences: OnboardingPreferences | null;
  setOnboardingPreferences: (p: OnboardingPreferences | null) => void;
  todayStatus: DailyStatus;
  setTodayStatus: (s: DailyStatus) => void;
  todayProgress: number;
  setTodayProgress: (n: number) => void;

  lastReadPosition: LastReadPosition | null;
  setLastReadPosition: (p: LastReadPosition | null) => void;
  bookmarks: Bookmark[];
  toggleBookmark: (page: number) => void;
  readerPreferences: ReaderPreferences;
  setReaderPreferences: (p: Partial<ReaderPreferences>) => void;

  /** Unique mushaf pages the user opened in the reader (tracked client-side). */
  visitedPages: number[];
  /** Unique mushaf pages marked "completed" when flipping forward (reading progress). */
  completedPages: number[];
  setVisitedPages: (pages: number[]) => void;
  setCompletedPages: (pages: number[]) => void;
  addVisitedPage: (page: number) => void;
  addCompletedPage: (page: number) => void;


  /** Clears reading history, streak, page progress, sessions, and resume position. Bookmarks kept. */
  resetReadingProgress: () => void;

  /** Last authenticated Supabase user id persisted locally — used to avoid cross-user data bleed. */
  persistedAuthUserId: string | null;
  setPersistedAuthUserId: (id: string | null) => void;
  /** Not persisted — filled by UserSessionProvider from Supabase auth + profiles. */
  authDisplayName: string | null;
  authEmail: string | null;
  setAuthIdentity: (p: { displayName: string | null; email: string | null }) => void;
  /** Clear all user-specific data when account changes (includes bookmarks). */
  clearDataForUserSwitch: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
      isDemo: false,
      setDemoMode: (isDemo, initialData) => {
        setDemoCookieClient(isDemo);
        if (isDemo && initialData)
          set({
            isDemo: true,
            userGoal: initialData.goal,
            streak: initialData.streak,
            sessions: initialData.sessions,
            authDisplayName: null,
            authEmail: null,
          });
        else set({ isDemo: false });
      },
      userGoal: null,
      setUserGoal: (userGoal) => set({ userGoal }),
      sessions: [],
      setSessions: (sessions) => set({ sessions }),
      addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions] })),
      streak: null,
      setStreak: (streak) => set({ streak }),
      reminder: null,
      setReminder: (reminder) => set({ reminder }),
      onboardingPreferences: null,
      setOnboardingPreferences: (onboardingPreferences) => set({ onboardingPreferences }),
      todayStatus: "none",
      setTodayStatus: (todayStatus) => set({ todayStatus }),
      todayProgress: 0,
      setTodayProgress: (todayProgress) => set({ todayProgress }),

      lastReadPosition: null,
      setLastReadPosition: (pos) => set({ lastReadPosition: pos }),
      bookmarks: [],
      toggleBookmark: (page) =>
        set((s) => {
          const existing = s.bookmarks.find((b) => b.page === page);
          if (existing) return { bookmarks: s.bookmarks.filter((b) => b.page !== page) };
          const b: Bookmark = { id: `bm-${Date.now()}`, userId: "user-1", page, createdAt: new Date().toISOString() };
          return { bookmarks: [b, ...s.bookmarks] };
        }),
      readerPreferences: { focusMode: false, showTranslation: false, translationKey: "sahih", fontScale: 1 },
      setReaderPreferences: (p) => set((s) => ({ readerPreferences: { ...s.readerPreferences, ...p } })),

      visitedPages: [],
      completedPages: [],
      setVisitedPages: (pages) => set({ visitedPages: uniqueSortedPages(pages) }),
      setCompletedPages: (pages) => set({ completedPages: uniqueSortedPages(pages) }),
      addVisitedPage: (page) =>
        set((s) => {
          if (page < 1 || page > 604) return {};
          if (s.visitedPages.includes(page)) return {};
          return { visitedPages: uniqueSortedPages([...s.visitedPages, page]) };
        }),
      addCompletedPage: (page) =>
        set((s) => {
          if (page < 1 || page > 604) return {};
          if (s.completedPages.includes(page)) return {};
          return { completedPages: uniqueSortedPages([...s.completedPages, page]) };
        }),

      resetReadingProgress: () => {
        clearLegacyReaderStorage();
        set({
          sessions: [],
          streak: null,
          visitedPages: [],
          completedPages: [],
          lastReadPosition: null,
          todayProgress: 0,
          todayStatus: "none",
        });
      },

      persistedAuthUserId: null,
      setPersistedAuthUserId: (persistedAuthUserId) => set({ persistedAuthUserId }),
      authDisplayName: null,
      authEmail: null,
      setAuthIdentity: ({ displayName, email }) => set({ authDisplayName: displayName, authEmail: email }),
      clearDataForUserSwitch: () => {
        clearLegacyReaderStorage();
        set({
          sessions: [],
          streak: null,
          visitedPages: [],
          completedPages: [],
          lastReadPosition: null,
          todayProgress: 0,
          todayStatus: "none",
          bookmarks: [],
          userGoal: null,
          onboardingPreferences: null,
          reminder: null,
          isDemo: false,
          authDisplayName: null,
          authEmail: null,
        });
        setDemoCookieClient(false);
      },

    }),
    {
      name: "hidayah-app",
      partialize: (s) => ({
        theme: s.theme,
        isDemo: s.isDemo,
        userGoal: s.userGoal,
        sessions: s.sessions,
        streak: s.streak,
        reminder: s.reminder,
        onboardingPreferences: s.onboardingPreferences,
        todayStatus: s.todayStatus,
        todayProgress: s.todayProgress,
        lastReadPosition: s.lastReadPosition,
        bookmarks: s.bookmarks,
        visitedPages: s.visitedPages,
        completedPages: s.completedPages,
        readerPreferences: s.readerPreferences,
        persistedAuthUserId: s.persistedAuthUserId,
      }),
    }
  )
);
