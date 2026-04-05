"use client";

import { useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { coerceProfileIsPro } from "@/lib/subscription/coerceProfileIsPro";
import { resolveUserDisplayName } from "@/lib/user-display";
import { useAppStore } from "@/store/useAppStore";
import type { Bookmark, ReaderPreferences, ReadingSession, Streak } from "@/types";

type ReadingStateRow = {
  subscription?: { isPro?: unknown } | null;
  error?: unknown;
};

type BrowserSupabase = ReturnType<typeof createClient>;

/** Client read of `profiles.is_pro` (RLS: own row) — refreshes UI when reading-state was cached before checkout. */
async function syncProFromProfile(supabase: BrowserSupabase | undefined) {
  if (!supabase) return;
  const { isDemo: demo } = useAppStore.getState();
  if (demo) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data, error } = await supabase.from("profiles").select("is_pro").eq("id", user.id).maybeSingle();
  if (error) return;
  const raw = data?.is_pro;
  const next = coerceProfileIsPro(raw) ? "pro" : "free";
  if (process.env.NODE_ENV === "development") {
    console.log("[STORE] isPro → proStatus mapping", { source: "profiles", raw, next });
  }
  useAppStore.getState().setProStatus(next);
}

function applyProFromReadingStateRow(row: ReadingStateRow) {
  if (row.subscription == null) return;
  const raw = row.subscription.isPro;
  const next = coerceProfileIsPro(raw) ? "pro" : "free";
  if (process.env.NODE_ENV === "development") {
    console.log("[STORE] isPro → proStatus mapping", { source: "reading-state", raw, next });
  }
  useAppStore.getState().setProStatus(next);
}

export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return undefined;
    }
  }, []);
  const setPersistedAuthUserId = useAppStore((s) => s.setPersistedAuthUserId);
  const clearDataForUserSwitch = useAppStore((s) => s.clearDataForUserSwitch);
  const persistedAuthUserId = useAppStore((s) => s.persistedAuthUserId);
  const isDemo = useAppStore((s) => s.isDemo);
  const setVisitedPages = useAppStore((s) => s.setVisitedPages);
  const setCompletedPages = useAppStore((s) => s.setCompletedPages);
  const setLastReadPosition = useAppStore((s) => s.setLastReadPosition);
  const setSessions = useAppStore((s) => s.setSessions);
  const setStreak = useAppStore((s) => s.setStreak);
  const setReaderPreferences = useAppStore((s) => s.setReaderPreferences);
  const setTodayProgress = useAppStore((s) => s.setTodayProgress);
  const setTodayStatus = useAppStore((s) => s.setTodayStatus);
  const loadedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    const syncAuthIdentity = async () => {
      const { isDemo: demo, setAuthIdentity } = useAppStore.getState();
      if (demo) {
        setAuthIdentity({ displayName: null, email: null });
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthIdentity({ displayName: null, email: null });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      setAuthIdentity({
        displayName: resolveUserDisplayName(profile ?? undefined, user),
        email: user.email ?? null,
      });
    };

    const reconcile = (nextId: string | null) => {
      const prev = useAppStore.getState().persistedAuthUserId;
      if (nextId && prev && nextId !== prev) {
        clearDataForUserSwitch();
      }
      setPersistedAuthUserId(nextId);
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      reconcile(user?.id ?? null);
      void syncAuthIdentity();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const id = session?.user?.id ?? null;
      if (event === "SIGNED_OUT") {
        setPersistedAuthUserId(null);
        loadedForUser.current = null;
        useAppStore.getState().setAuthIdentity({ displayName: null, email: null });
        return;
      }
      reconcile(id);
      void syncAuthIdentity();
    });

    return () => subscription.unsubscribe();
  }, [supabase, clearDataForUserSwitch, setPersistedAuthUserId]);

  useEffect(() => {
    if (!supabase || isDemo) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        useAppStore.getState().setAuthIdentity({ displayName: null, email: null });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      useAppStore.getState().setAuthIdentity({
        displayName: resolveUserDisplayName(profile ?? undefined, user),
        email: user.email ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, isDemo]);

  useEffect(() => {
    if (!supabase || isDemo || !persistedAuthUserId) return;
    if (loadedForUser.current === persistedAuthUserId) return;
    let cancelled = false;
    (async () => {
      // Do not gate on getSession(): it can be empty right after sign-in while httpOnly cookies
      // still authenticate GET /api/reading-state — skipping here left proStatus stale forever (effect
      // deps would not re-run).
      const res = await fetch("/api/reading-state", { credentials: "include" });
      if (res.status === 401 || !res.ok || cancelled) return;
      const row = (await res.json()) as ReadingStateRow & Record<string, unknown>;
      if (!row || row.error || cancelled) return;
      if (Array.isArray(row.visited_pages)) setVisitedPages(row.visited_pages);
      if (Array.isArray(row.completed_pages)) setCompletedPages(row.completed_pages);
      applyProFromReadingStateRow(row);
      void syncProFromProfile(supabase);
      if (row.last_read_page && typeof row.last_read_page === "number") {
        setLastReadPosition({
          userId: persistedAuthUserId,
          page: row.last_read_page,
          updatedAt: new Date().toISOString(),
        });
      }
      if (row.streak) setStreak(row.streak as Streak);
      if (Array.isArray(row.sessions)) setSessions(row.sessions as ReadingSession[]);
      if (row.reader_preferences && typeof row.reader_preferences === "object") {
        setReaderPreferences(row.reader_preferences as Partial<ReaderPreferences>);
      }
      if (typeof row.today_progress === "number") setTodayProgress(row.today_progress);
      if (row.today_status) setTodayStatus(row.today_status as "complete" | "in_progress" | "missed" | "none");
      if (Array.isArray(row.bookmarks)) {
        const mapped: Bookmark[] = row.bookmarks.map((b: { id?: string; page: number; createdAt?: string }) => ({
          id: b.id ?? `bm-${b.page}`,
          userId: persistedAuthUserId,
          page: b.page,
          createdAt: b.createdAt ?? new Date().toISOString(),
        }));
        useAppStore.setState({ bookmarks: mapped });
      }
      loadedForUser.current = persistedAuthUserId;
    })();
    return () => {
      cancelled = true;
    };
  }, [
    supabase,
    isDemo,
    persistedAuthUserId,
    setVisitedPages,
    setCompletedPages,
    setLastReadPosition,
    setSessions,
    setStreak,
    setReaderPreferences,
    setTodayProgress,
    setTodayStatus,
  ]);

  useEffect(() => {
    if (!supabase || isDemo || !persistedAuthUserId) return;
    const refreshPro = async () => {
      const res = await fetch("/api/reading-state", { credentials: "include" });
      if (!res.ok) {
        void syncProFromProfile(supabase);
        return;
      }
      const row = (await res.json()) as ReadingStateRow;
      if (!row?.error) applyProFromReadingStateRow(row);
      void syncProFromProfile(supabase);
    };
    const onVis = () => {
      if (document.visibilityState === "visible") void refreshPro();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [supabase, isDemo, persistedAuthUserId]);

  return <>{children}</>;
}
