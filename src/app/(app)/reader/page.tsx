"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { demoGoal } from "@/lib/demo-data";
import { clampPage, findSurahStartPage, getPageContent, MUSHAF_PAGE_COUNT, SURAHS, type QuranAyah } from "@/lib/quran";
import { estimateHasanatForPageContent } from "@/lib/hasanat/estimate";
import { getRuntimePage, loadQuranPages, loadQuranSurahs, type PagesPayload, type SurahsPayload } from "@/lib/quran/runtime";
import { loadPageTranslations, TRANSLATION_OPTIONS, type TranslationKey } from "@/lib/quran/translations";
import { formatHasanat } from "@/lib/hasanat";
import type { ReadingSession } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bookmark, BookmarkCheck, ChevronDown, ChevronLeft, ChevronRight, Home, Settings2, Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { cn, isSameDay } from "@/lib/utils";
import { useQuranAudioPlayer } from "@/hooks/useQuranAudioPlayer";

const SWIPE_THRESHOLD = 60;

export default function ReaderPage() {
  const searchParams = useSearchParams();
  const userGoal = useAppStore((s) => s.userGoal);
  const goal = userGoal ?? demoGoal;

  const lastReadPosition = useAppStore((s) => s.lastReadPosition);
  const setLastReadPosition = useAppStore((s) => s.setLastReadPosition);
  const bookmarks = useAppStore((s) => s.bookmarks);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);
  const readerPreferences = useAppStore((s) => s.readerPreferences);
  const setReaderPreferences = useAppStore((s) => s.setReaderPreferences);

  const sessions = useAppStore((s) => s.sessions);
  const addSession = useAppStore((s) => s.addSession);
  const streak = useAppStore((s) => s.streak);
  const setStreak = useAppStore((s) => s.setStreak);
  const addVisitedPage = useAppStore((s) => s.addVisitedPage);
  const addCompletedPage = useAppStore((s) => s.addCompletedPage);
  const deepLinked = searchParams.get("page");
  const deepLinkedPage = deepLinked ? clampPage(parseInt(deepLinked, 10)) : null;
  const initialPage = clampPage(deepLinkedPage ?? lastReadPosition?.page ?? 1);
  const [page, setPage] = useState<number>(initialPage);
  const [direction, setDirection] = useState<1 | -1>(1);

  const [pagesData, setPagesData] = useState<PagesPayload | null>(null);
  const [surahsData, setSurahsData] = useState<SurahsPayload | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [pageTranslations, setPageTranslations] = useState<Record<string, string>>({});

  const startTimeRef = useRef<number>(Date.now());
  // Session-local pages visited in this mounted reader session only.
  // This avoids counting all historical visited pages as "read today".
  const sessionVisitedPagesRef = useRef<Set<number>>(new Set([initialPage]));
  const minPageRef = useRef<number>(initialPage);
  const maxPageRef = useRef<number>(initialPage);
  const liveEarnedHasanatRef = useRef<number>(0);
  const [liveEarnedHasanat, setLiveEarnedHasanat] = useState<number>(0);
  const [earnedToast, setEarnedToast] = useState<{ amount: number; id: string } | null>(null);
  const awardedPagesRef = useRef<Set<number>>(new Set());
  const lastPageRef = useRef<number>(initialPage);

  const isBookmarked = useMemo(() => bookmarks.some((b) => b.page === page), [bookmarks, page]);
  const content = useMemo(() => {
    const runtime = getRuntimePage(pagesData, page);
    return runtime ?? getPageContent(page);
  }, [pagesData, page]);

  const surahOptions = useMemo(() => (surahsData?.surahs?.length ? surahsData.surahs : SURAHS), [surahsData]);

  const [navOpen, setNavOpen] = useState(false);
  const [startTab, setStartTab] = useState<"surah" | "page" | "juz">("surah");
  const [surahSearch, setSurahSearch] = useState("");
  const [selectedSurah, setSelectedSurah] = useState<number>(() => (content.surahNumber || 1));
  const [selectedAyah, setSelectedAyah] = useState<string>(""); // optional
  const [pageJump, setPageJump] = useState<string>(String(initialPage));
  const [juzJump, setJuzJump] = useState<string>(String(content.juz || 1));
  const [directInput, setDirectInput] = useState<string>("");
  const [highlightTarget, setHighlightTarget] = useState<{ surah: number; ayah: number } | null>(null);

  const filteredSurahs = useMemo(() => {
    const q = surahSearch.trim().toLowerCase();
    if (!q) return surahOptions;
    return surahOptions.filter((s) => {
      const a = `${s.number} ${s.nameEnglish} ${s.nameArabic}`.toLowerCase();
      return a.includes(q);
    });
  }, [surahOptions, surahSearch]);

  const surahAyahCount = useMemo(() => {
    const m = new Map<number, number>();
    for (const s of surahOptions) m.set(s.number, s.ayahCount);
    return m;
  }, [surahOptions]);

  const juzFirstPage = useMemo(() => {
    const map = new Map<number, number>();
    const pages = pagesData?.pages;
    if (!pages) return map;
    for (let p = 1; p <= MUSHAF_PAGE_COUNT; p++) {
      const juz = (pages[String(p)] as any)?.juz;
      if (!juz || map.has(juz)) continue;
      map.set(juz, p);
      if (map.size >= 30) break;
    }
    return map;
  }, [pagesData]);

  function setPageWithoutReward(nextPage: number) {
    const p = clampPage(nextPage);
    const fromPage = page;
    if (p === fromPage) return;
    void (async () => {
      setDirection(p >= fromPage ? 1 : -1);
      setPage(p);
      markVisited(p);
      minPageRef.current = Math.min(minPageRef.current, p);
      maxPageRef.current = Math.max(maxPageRef.current, p);
      lastPageRef.current = p;
    })();
  }

  function markVisited(p: number) {
    sessionVisitedPagesRef.current.add(p);
    addVisitedPage(p);
  }

  function markCompleted(p: number) {
    addCompletedPage(p);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Keep this session counter isolated from persisted history.
    sessionVisitedPagesRef.current = new Set([initialPage]);
    markVisited(initialPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function findPageForAyah(surahNumber: number, ayahNumber: number): number | null {
    const pages = pagesData?.pages;
    if (!pages) return null;
    for (let p = 1; p <= MUSHAF_PAGE_COUNT; p++) {
      const ayahs = (pages[String(p)] as any)?.ayahs as Array<any> | undefined;
      if (!ayahs?.length) continue;
      if (ayahs.some((a) => a.surahNumber === surahNumber && a.ayahNumber === ayahNumber)) return p;
    }
    return null;
  }

  function jumpToReadingPosition() {
    // Support direct numeric input like "2:255" or "2 255" for surah:ayah.
    const direct = directInput.trim();
    if (direct) {
      const m = direct.match(/^(\d{1,3})\s*[:\s]\s*(\d{1,4})$/);
      if (m) {
        const s = parseInt(m[1], 10);
        const a = parseInt(m[2], 10);
        const start = surahsData?.surahs?.find((x) => x.number === s)?.startPage ?? findSurahStartPage(s) ?? 1;
        const targetPage = findPageForAyah(s, a) ?? start;
        setHighlightTarget({ surah: s, ayah: a });
        setPageWithoutReward(targetPage);
        setNavOpen(false);
        return;
      }
      const n = parseInt(direct, 10);
      if (Number.isFinite(n)) {
        setHighlightTarget(null);
        setPageWithoutReward(clampPage(n));
        setNavOpen(false);
        return;
      }
    }

    if (startTab === "page") {
      const p = clampPage(parseInt(pageJump, 10));
      setHighlightTarget(null);
      setPageWithoutReward(p);
      setNavOpen(false);
      return;
    }

    if (startTab === "juz") {
      const j = Math.min(30, Math.max(1, parseInt(juzJump, 10) || 1));
      const first = juzFirstPage.get(j) ?? 1;
      setHighlightTarget(null);
      setPageWithoutReward(first);
      setNavOpen(false);
      return;
    }

    // Surah (+ optional ayah)
    const s = selectedSurah || 1;
    const ay = selectedAyah.trim() ? parseInt(selectedAyah, 10) : null;
    const start = surahsData?.surahs?.find((x) => x.number === s)?.startPage ?? findSurahStartPage(s) ?? 1;
    if (!ay) {
      setHighlightTarget(null);
      setPageWithoutReward(start);
      setNavOpen(false);
      return;
    }
    const targetPage = findPageForAyah(s, ay) ?? start;
    setHighlightTarget({ surah: s, ayah: ay });
    setPageWithoutReward(targetPage);
    setNavOpen(false);
  }

  const ayahs: QuranAyah[] = useMemo(() => {
    if (content.ayahs?.length) return content.ayahs;
    // Fallback only (should rarely show when full dataset is available)
    return (content.arabic ?? []).map((text) => ({
      surahNumber: content.surahNumber,
      surahNameArabic: content.surahNameArabic,
      surahNameEnglish: content.surahNameEnglish,
      ayahNumber: 0,
      text,
    }));
  }, [content]);

  const selectedTranslationKey = (readerPreferences.translationKey ?? "sahih") as TranslationKey;

  useEffect(() => {
    if (!readerPreferences.showTranslation) return;
    let cancelled = false;
    (async () => {
      try {
        const payload = await loadPageTranslations(page, selectedTranslationKey);
        if (!cancelled) setPageTranslations(payload.verses ?? {});
      } catch {
        if (!cancelled) setPageTranslations({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, selectedTranslationKey, readerPreferences.showTranslation]);

  const pageSurahContext = useMemo(() => {
    const set = new Map<number, { en: string; ar: string }>();
    for (const a of ayahs) {
      if (!a.surahNumber) continue;
      if (!set.has(a.surahNumber)) set.set(a.surahNumber, { en: a.surahNameEnglish, ar: a.surahNameArabic });
    }
    const list = Array.from(set.entries()).sort((a, b) => a[0] - b[0]).map(([, v]) => v.en);
    if (list.length === 0) return content.surahNameEnglish || "Reader";
    if (list.length === 1) return list[0];
    return `${list[0]} + ${list.length - 1} more`;
  }, [ayahs, content.surahNameEnglish]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [p, s] = await Promise.all([loadQuranPages(), loadQuranSurahs()]);
        if (!mounted) return;
        setPagesData(p);
        setSurahsData(s);
        // Prime settings defaults once data is ready.
        setSelectedSurah((prev) => prev || 1);
      } catch (e) {
        if (!mounted) return;
        setDataError("Could not load the full Quran dataset. Showing bundled fallback pages.");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Keep reading position persisted.
  useEffect(() => {
    setLastReadPosition({ userId: "user-1", page, updatedAt: new Date().toISOString() });
  }, [page, setLastReadPosition]);

  // If we jumped to a specific ayah, scroll it into view and briefly highlight.
  useEffect(() => {
    if (!highlightTarget) return;
    const key = `${highlightTarget.surah}:${highlightTarget.ayah}`;
    const el = document.querySelector(`[data-ayah-key="${key}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = window.setTimeout(() => setHighlightTarget(null), 1800);
    return () => window.clearTimeout(t);
  }, [highlightTarget, page]);

  // Respond to deep links like /reader?page=12
  useEffect(() => {
    if (!deepLinkedPage) return;
    if (deepLinkedPage === page) return;
    setDirection(deepLinkedPage >= page ? 1 : -1);
    setPage(deepLinkedPage);
    sessionVisitedPagesRef.current.add(deepLinkedPage);
    minPageRef.current = Math.min(minPageRef.current, deepLinkedPage);
    maxPageRef.current = Math.max(maxPageRef.current, deepLinkedPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkedPage]);

  function goToPage(next: number, dir: 1 | -1) {
    const p = clampPage(next);
    const fromPage = page;
    if (p === fromPage) return;
    void (async () => {
      const prevPage = lastPageRef.current;
      if (p > fromPage) {
        if (prevPage && prevPage !== p) markCompleted(prevPage);
        let earned = 0;
        for (let pp = fromPage + 1; pp <= p; pp++) {
          if (awardedPagesRef.current.has(pp)) continue;
          awardedPagesRef.current.add(pp);
          const pc = getRuntimePage(pagesData, pp) ?? getPageContent(pp);
          earned += estimateHasanatForPageContent(pc);
        }
        if (earned > 0) {
          liveEarnedHasanatRef.current += earned;
          setLiveEarnedHasanat(liveEarnedHasanatRef.current);
          const toastId = `${Date.now()}-${fromPage}->${p}`;
          setEarnedToast({ amount: earned, id: toastId });
          window.setTimeout(() => setEarnedToast((t) => (t?.id === toastId ? null : t)), 1400);
        }
      }
      setDirection(dir);
      setPage(p);
      markVisited(p);
      minPageRef.current = Math.min(minPageRef.current, p);
      maxPageRef.current = Math.max(maxPageRef.current, p);
      lastPageRef.current = p;
    })();
  }

  // Create a reading session when leaving the reader (cleanup runs on unmount).
  useEffect(() => {
    const startTime = startTimeRef.current;
    return () => {
      const visitedSet = sessionVisitedPagesRef.current;
      const pagesRead = Number(visitedSet.size) || 0;
      if (pagesRead <= 0) return;
      const minP = minPageRef.current;
      const maxP = maxPageRef.current;

      const durationSeconds = Math.max(10, Math.round((Date.now() - startTime) / 1000));
      const amount = pagesRead;
      const unit = "pages" as const;

      const state = useAppStore.getState();
      const currentSessions = state.sessions ?? [];
      const currentGoal = state.userGoal ?? goal;
      const currentStreak = state.streak;

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const todaySessions = currentSessions.filter((s) => isSameDay(new Date(s.completedAt), today));
      const todayPagesSoFar = todaySessions
        .filter((s) => s.unit === "pages")
        .reduce((a, s) => a + (Number(s.amount) || 0), 0);
      const safeTarget = Math.max(1, Number(currentGoal.dailyAmount) || 1);
      const nextPagesProgress = Math.max(0, todayPagesSoFar + amount);
      const clampedPagesProgress = Math.min(nextPagesProgress, safeTarget);
      const goalCompleted = currentGoal.unit === "pages" ? nextPagesProgress >= safeTarget : false;
      console.log("[Reader progress update]", {
        previousPageCount: todayPagesSoFar,
        incrementAmount: amount,
        newPageCount: nextPagesProgress,
        displayedProgressValue: `${clampedPagesProgress}/${safeTarget}`,
      });

      // Use the same earned amount we showed during page flips (prevents double-counting).
      const hasanat = liveEarnedHasanatRef.current;
      const session: ReadingSession = {
        id: `r-${Date.now()}`,
        userId: "user-1",
        amount,
        unit,
        completedAt: new Date().toISOString(),
        note: undefined,
        goalCompleted,
        hasanat,
        source: "reader",
        pageStart: minP,
        pageEnd: maxP,
        durationSeconds,
      };
      state.addSession(session);
      // Reset live in-session hasanat; total will now come from sessions.
      liveEarnedHasanatRef.current = 0;
      setLiveEarnedHasanat(0);
      awardedPagesRef.current = new Set();
      // Mark the last page as completed at end of session.
      const lp = lastPageRef.current;
      if (lp) {
        state.addCompletedPage(lp);
      }

      if (goalCompleted) {
        const prev = currentStreak ?? { id: "streak-1", userId: "user-1", currentStreak: 0, longestStreak: 0, lastCompletedDate: null, updatedAt: new Date().toISOString() };
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        const last = prev.lastCompletedDate;
        let newCurrent = prev.currentStreak;
        if (!last || last === yesterdayStr) newCurrent += 1;
        else if (last !== todayStr) newCurrent = 1;
        state.setStreak({ ...prev, currentStreak: newCurrent, longestStreak: Math.max(prev.longestStreak, newCurrent), lastCompletedDate: todayStr, updatedAt: new Date().toISOString() });
      }
    };
  }, [goal]);

  const pageHasanatEstimate = useMemo(() => {
    const pc = getRuntimePage(pagesData, page) ?? getPageContent(page);
    return estimateHasanatForPageContent(pc);
  }, [pagesData, page]);
  const sessionsTotalHasanat = useMemo(
    () => (sessions ?? []).reduce((a, s) => a + (s.hasanat ?? 0), 0),
    [sessions]
  );
  const totalHasanatDisplay = sessionsTotalHasanat + liveEarnedHasanat;

  const audio = useQuranAudioPlayer();

  return (
    <div className={cn("min-h-[calc(100vh-4rem)] supports-[height:100dvh]:min-h-[calc(100dvh-4rem)]", readerPreferences.focusMode ? "bg-background" : "bg-background")}>
      <header className={cn("reader-toolbar sticky z-20 border-b bg-background/85 backdrop-blur", readerPreferences.focusMode && "border-transparent")}>
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild aria-label="Home">
            <Link href="/dashboard"><Home className="h-5 w-5" /></Link>
          </Button>
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="min-w-0 flex-1 text-left rounded-lg px-2 py-1 -mx-2 hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Open navigation picker"
          >
            <p className="text-sm font-medium truncate">
              {pageSurahContext}
              <span className="text-muted-foreground font-normal"> · Juz {content.juz}</span>
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Page {page} of {MUSHAF_PAGE_COUNT}</p>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>

          {!readerPreferences.focusMode && (
            <Button variant="ghost" size="icon" onClick={() => toggleBookmark(page)} aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}>
              {isBookmarked ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
            </Button>
          )}


          {!readerPreferences.focusMode && (
            <Dialog open={navOpen} onOpenChange={setNavOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Reader settings and jump">
                  <Settings2 className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Reader</DialogTitle>
                </DialogHeader>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Start reading from</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setHighlightTarget(null);
                            setPageWithoutReward(1);
                            setNavOpen(false);
                          }}
                        >
                          First page
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const p = clampPage(lastReadPosition?.page ?? page);
                            setHighlightTarget(null);
                            setPageWithoutReward(p);
                            setNavOpen(false);
                          }}
                        >
                          Last read
                        </Button>
                      </div>
                    </div>

                    <Tabs value={startTab} onValueChange={(v) => setStartTab(v as any)} className="w-full">
                      <TabsList className="grid grid-cols-3 w-full">
                        <TabsTrigger value="surah">Surah</TabsTrigger>
                        <TabsTrigger value="page">Page</TabsTrigger>
                        <TabsTrigger value="juz">Juz</TabsTrigger>
                      </TabsList>

                      <TabsContent value="surah" className="mt-3 space-y-3">
                        <div className="space-y-2">
                          <Label>Search surah</Label>
                          <Input value={surahSearch} onChange={(e) => setSurahSearch(e.target.value)} placeholder="Type a surah name or number…" />
                        </div>
                        <div className="space-y-2">
                          <Label>Surah</Label>
                          <div className="rounded-lg border">
                            <ScrollArea className="h-44">
                              <div className="p-2 space-y-1">
                                {filteredSurahs.map((s) => (
                                  <button
                                    key={s.number}
                                    type="button"
                                    onClick={() => setSelectedSurah(s.number)}
                                    className={cn(
                                      "w-full text-left rounded-md px-3 py-2 text-sm transition-colors",
                                      selectedSurah === s.number ? "bg-primary/10 text-primary" : "hover:bg-muted"
                                    )}
                                  >
                                    <span className="font-medium">{s.number}. {s.nameEnglish}</span>{" "}
                                    <span className="text-muted-foreground font-arabic" dir="rtl">({s.nameArabic})</span>
                                  </button>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Ayah (optional)</Label>
                          <Input
                            inputMode="numeric"
                            value={selectedAyah}
                            onChange={(e) => setSelectedAyah(e.target.value.replace(/[^\d]/g, ""))}
                            placeholder={`e.g. 1 (max ${surahAyahCount.get(selectedSurah) ?? "—"})`}
                          />
                          <p className="text-xs text-muted-foreground">Leave blank to start at the beginning of the surah.</p>
                        </div>
                      </TabsContent>

                      <TabsContent value="page" className="mt-3 space-y-3">
                        <div className="space-y-2">
                          <Label>Page</Label>
                          <Input inputMode="numeric" value={pageJump} onChange={(e) => setPageJump(e.target.value.replace(/[^\d]/g, ""))} placeholder={`1–${MUSHAF_PAGE_COUNT}`} />
                        </div>
                      </TabsContent>

                      <TabsContent value="juz" className="mt-3 space-y-3">
                        <div className="space-y-2">
                          <Label>Juz</Label>
                          <Select value={juzJump} onValueChange={setJuzJump}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 30 }, (_, i) => String(i + 1)).map((j) => (
                                <SelectItem key={j} value={j}>Juz {j}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="space-y-2">
                      <Label>Direct input</Label>
                      <Input
                        value={directInput}
                        onChange={(e) => setDirectInput(e.target.value)}
                        placeholder="e.g. 2:255 (Surah:Ayah) or 18 (Page)"
                      />
                      <p className="text-xs text-muted-foreground">Use this for quick jumps without opening multiple pickers.</p>
                    </div>

                    <Button type="button" size="lg" className="w-full" onClick={jumpToReadingPosition}>
                      Go to reading position
                    </Button>

                    <p className="text-xs text-muted-foreground">
                      Tip: if you jump to a specific ayah, the reader will open the correct page and briefly highlight it.
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">Focus mode</p>
                      <p className="text-xs text-muted-foreground">Hide extra controls for an immersive read.</p>
                    </div>
                    <Switch checked={readerPreferences.focusMode} onCheckedChange={(checked) => setReaderPreferences({ focusMode: checked })} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">
                        Translation
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Show a translation where available.
                      </p>
                    </div>
                    <Switch
                      checked={readerPreferences.showTranslation}
                      onCheckedChange={(checked) => {
                        setReaderPreferences({ showTranslation: checked });
                      }}
                    />
                  </div>

                  <div className="space-y-2 rounded-lg border p-3">
                    <Label>Translation source</Label>
                    <Select
                      value={selectedTranslationKey}
                      onValueChange={(value) => setReaderPreferences({ translationKey: value as TranslationKey })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSLATION_OPTIONS.map((option) => (
                          <SelectItem key={option.key} value={option.key}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Verified source: Quran.com translations.
                    </p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-sm font-medium">Hasanat estimate</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This is a motivational estimate for reflection and consistency, not a definitive count.
                    </p>
                    <p className="text-sm mt-2">Approx. <span className="font-semibold">{formatHasanat(pageHasanatEstimate)}</span> per page in this MVP model.</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      <main className={cn("mx-auto max-w-lg px-4 py-5", !readerPreferences.focusMode ? "pb-64" : "pb-6")}>
        {!readerPreferences.focusMode && (
          <div className="mb-4 flex justify-end">
            <div className="rounded-full border bg-background/90 backdrop-blur px-3 py-1 text-xs shadow-sm">
              <span className="text-muted-foreground">Hasanat (est.)</span>{" "}
              <span className="font-semibold text-primary tabular-nums">{formatHasanat(totalHasanatDisplay)}</span>
            </div>
          </div>
        )}

        <AnimatePresence>
          {earnedToast && (
            <motion.div
              key={earnedToast.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="fixed top-36 right-4 z-40 md:right-[calc(50%-16rem)]"
            >
              <div className="rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold shadow">
                +{formatHasanat(earnedToast.amount)} est. hasanat
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {dataError && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            {dataError}
          </div>
        )}

        {!pagesData && !dataError && (
          <div className="mb-4 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <div>
                <p className="text-sm font-medium">Loading Quran pages…</p>
                <p className="text-xs text-muted-foreground">Preparing a smooth, page-by-page mushaf experience.</p>
              </div>
            </div>
          </div>
        )}

        <div className={cn("mb-4 flex items-center justify-between", readerPreferences.focusMode && "opacity-0 pointer-events-none h-0 mb-0")}>
          <Button variant="outline" onClick={() => goToPage(page - 1, -1)} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
          </Button>
          <div className="text-xs text-muted-foreground">
            Swipe to turn pages
          </div>
          <Button variant="outline" onClick={() => goToPage(page + 1, 1)} disabled={page >= MUSHAF_PAGE_COUNT}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={page}
            custom={direction}
            initial={{ opacity: 0, x: direction * 30, rotateY: direction * 6 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, x: direction * -30, rotateY: direction * -6 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
          >
            <motion.div
              drag="x"
              style={{ touchAction: "pan-y" }}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, info) => {
                if (info.offset.x < -SWIPE_THRESHOLD) goToPage(page + 1, 1);
                if (info.offset.x > SWIPE_THRESHOLD) goToPage(page - 1, -1);
              }}
            >
              <Card className={cn("p-5 sm:p-6 shadow-sm", readerPreferences.focusMode ? "border-transparent shadow-none" : "")}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs text-muted-foreground truncate">
                    {content.surahNumber ? `${content.surahNameEnglish} · ${content.surahNameArabic}` : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">Page {page}</div>
                </div>

                <div className={cn("rounded-2xl border bg-card/50 p-4 sm:p-5", readerPreferences.focusMode && "border-transparent bg-transparent p-0")}>
                  <div dir="rtl" className={cn("font-arabic break-words text-right leading-[2.35] tracking-wide", "text-[22px] sm:text-[24px]")}>
                    {ayahs.map((a, idx) => {
                      const prev = ayahs[idx - 1];
                      const startsNewSurah = idx === 0 ? true : a.surahNumber !== prev?.surahNumber;
                      const playing = audio.currentAyahKey === `${a.surahNumber}:${a.ayahNumber}`;
                      const verseKey = `${a.surahNumber}:${a.ayahNumber}`;
                      const line = pageTranslations[verseKey] ?? null;
                      return (
                        <span key={`${a.surahNumber}-${a.ayahNumber}-${idx}`} className="block">
                          {startsNewSurah && a.surahNumber ? (
                            <span dir="ltr" className="block my-4 text-center">
                              <span className="inline-flex items-center gap-3">
                                <span className="h-px w-10 bg-border" />
                                <span>
                                  <span className="block text-xs font-medium">{a.surahNameEnglish}</span>
                                  <span className="block text-[11px] text-muted-foreground font-arabic" dir="rtl">{a.surahNameArabic}</span>
                                </span>
                                <span className="h-px w-10 bg-border" />
                              </span>
                            </span>
                          ) : null}

                          <span
                            data-ayah-key={`${a.surahNumber}:${a.ayahNumber}`}
                            onClick={() => {
                              audio.playAyah({
                                surahNumber: a.surahNumber,
                                ayahNumber: a.ayahNumber,
                                surahNameEnglish: a.surahNameEnglish,
                                surahNameArabic: a.surahNameArabic,
                                text: a.text,
                              });
                            }}
                            className={cn(
                              "cursor-pointer rounded-md px-1 -mx-1 transition-colors",
                              playing ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted/40",
                              highlightTarget && highlightTarget.surah === a.surahNumber && highlightTarget.ayah === a.ayahNumber
                                ? "bg-primary/10 ring-1 ring-primary/20"
                                : ""
                            )}
                            role="button"
                            tabIndex={0}
                          >
                            <span>{a.text}</span>
                            {a.ayahNumber ? <AyahMarker n={a.ayahNumber} /> : null}
                          </span>
                          {readerPreferences.showTranslation ? (
                            <span dir="ltr" className="mt-1 block pl-1 text-[13px] leading-6 font-sans text-muted-foreground/95">
                              <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground/70">
                                Translation
                              </span>
                              {line ?? (a.ayahNumber ? "—" : "")}
                            </span>
                          ) : null}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        <div className={cn("mt-4 rounded-lg border bg-muted/30 p-3", readerPreferences.focusMode && "opacity-0 pointer-events-none h-0 mt-0 p-0 border-0")}>
          <p className="text-xs text-muted-foreground">
            Hasanat shown here are motivational estimates for reflection and consistency, not a definitive count.
          </p>
        </div>
      </main>

      {!readerPreferences.focusMode && (
        <div className="reader-player fixed left-0 right-0 z-30 border-t bg-background/90 backdrop-blur">
          <div className="mx-auto max-w-lg px-4 py-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Now playing</p>
                <p className="text-sm font-medium truncate">
                  {audio.currentAyah ? `${audio.currentAyah.surahNameEnglish ?? "Surah"} · Ayah ${audio.currentAyah.ayahNumber}` : "—"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => audio.playPage(ayahs)}
                  className="hidden sm:inline-flex"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Play page
                </Button>
                <Select value={audio.reciterId} onValueChange={audio.setReciterId}>
                  <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {audio.RECITERS.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={audio.prev} aria-label="Previous ayah">
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                onClick={() => {
                  if (!audio.currentAyah) audio.playPage(ayahs);
                  else audio.toggle();
                }}
                aria-label={audio.isPlaying ? "Pause" : "Play"}
              >
                {audio.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button variant="outline" size="icon" onClick={audio.next} aria-label="Next ayah">
                <SkipForward className="h-5 w-5" />
              </Button>

              <div className="min-w-0 flex-1">
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, audio.duration || 1)}
                  value={Math.min(audio.currentTime, audio.duration || 0)}
                  onChange={(e) => audio.seek(parseFloat(e.target.value))}
                  aria-label="Seek audio position"
                  title="Seek audio position"
                  className="w-full accent-[hsl(var(--primary))]"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                  <span>{audio.formattedTime}</span>
                  <span>{audio.formattedDuration}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => audio.playPage(ayahs)} className="sm:hidden">
                <Volume2 className="h-4 w-4 mr-2" />
                Play page
              </Button>
              <div className="min-w-0 text-[11px] text-muted-foreground">
                Tap any ayah to play it. Page playback plays ayahs in order.
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function JumpToPage({ current, onJump }: { current: number; onJump: (page: number) => void }) {
  const [value, setValue] = useState(String(current));
  useEffect(() => setValue(String(current)), [current]);

  return (
    <div className="flex gap-2">
      <Input inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 2" />
      <Button
        type="button"
        onClick={() => {
          const n = parseInt(value, 10);
          if (!Number.isFinite(n)) return;
          onJump(n);
        }}
      >
        Go
      </Button>
    </div>
  );
}

function AyahMarker({ n }: { n: number }) {
  // Arabic-Indic digits for a calmer mushaf-like feel.
  const arabicIndic = String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d, 10)] ?? d);
  return (
    <span className="inline-flex align-middle mx-2 translate-y-[2px]" aria-label={`Ayah ${n}`}>
      <svg width="28" height="28" viewBox="0 0 28 28" className="text-muted-foreground">
        <circle cx="14" cy="14" r="12.2" fill="hsl(var(--background))" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="14" cy="14" r="9.6" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="0.8" strokeDasharray="1.2 2.4" />
        <text x="14" y="17" textAnchor="middle" fontSize="11" fill="currentColor" style={{ fontFamily: "var(--font-sans)" }}>
          {arabicIndic}
        </text>
      </svg>
    </span>
  );
}

