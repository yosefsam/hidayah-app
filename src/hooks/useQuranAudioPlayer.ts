import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { QuranAyah } from "@/lib/quran";
import { RECITERS, type Reciter, getAyahAudioUrl } from "@/lib/quran/audio";

export type PlaybackMode = "page" | "ayah";

export type AyahRef = {
  surahNumber: number;
  ayahNumber: number;
  surahNameEnglish?: string;
  surahNameArabic?: string;
  text?: string;
};

function ayahKey(a: AyahRef): string {
  return `${a.surahNumber}:${a.ayahNumber}`;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function useQuranAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<AyahRef[]>([]);
  const idxRef = useRef<number>(-1);
  const modeRef = useRef<PlaybackMode>("ayah");
  const timeRafRef = useRef<number | null>(null);
  const pendingTimeRef = useRef(0);

  const [reciterId, setReciterId] = useState<string>(RECITERS[0]?.id ?? "");
  const reciter: Reciter = useMemo(() => RECITERS.find((r) => r.id === reciterId) ?? RECITERS[0], [reciterId]);

  const [mode, setMode] = useState<PlaybackMode>("ayah");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentAyah, setCurrentAyah] = useState<AyahRef | null>(null);

  // keep refs synced
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const currentAyahKey = useMemo(() => (currentAyah ? ayahKey(currentAyah) : null), [currentAyah]);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const a = new Audio();
    a.preload = "auto";
    audioRef.current = a;
    return a;
  }, []);

  const playRef = useCallback(
    async (ref: AyahRef) => {
      const a = ensureAudio();
      const url = getAyahAudioUrl(reciter, ref.surahNumber, ref.ayahNumber);
      if (a.src !== url) a.src = url;
      setCurrentAyah(ref);
      try {
        await a.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    },
    [ensureAudio, reciter]
  );

  const pause = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      a.pause();
      setIsPlaying(false);
    }
  }, []);

  const seek = useCallback((t: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(a.duration || 0, t));
    setCurrentTime(a.currentTime);
  }, []);

  const playAyah = useCallback(
    async (a: AyahRef) => {
      queueRef.current = [a];
      idxRef.current = 0;
      setMode("ayah");
      await playRef(a);
    },
    [playRef]
  );

  const playPage = useCallback(
    async (ayahs: (QuranAyah | AyahRef)[]) => {
      const q: AyahRef[] = ayahs
        .filter((x) => x.surahNumber && x.ayahNumber)
        .map((x) => ({
          surahNumber: x.surahNumber,
          ayahNumber: x.ayahNumber,
          surahNameEnglish: (x as any).surahNameEnglish,
          surahNameArabic: (x as any).surahNameArabic,
          text: (x as any).text,
        }));
      if (q.length === 0) return;
      queueRef.current = q;
      idxRef.current = 0;
      setMode("page");
      await playRef(q[0]);
    },
    [playRef]
  );

  const next = useCallback(async () => {
    const q = queueRef.current;
    const i = idxRef.current;
    if (!q.length) return;
    const nextIdx = Math.min(q.length - 1, i + 1);
    idxRef.current = nextIdx;
    await playRef(q[nextIdx]);
  }, [playRef]);

  const prev = useCallback(async () => {
    const q = queueRef.current;
    const i = idxRef.current;
    if (!q.length) return;
    const prevIdx = Math.max(0, i - 1);
    idxRef.current = prevIdx;
    await playRef(q[prevIdx]);
  }, [playRef]);

  // Attach listeners once. Throttle timeupdate via rAF — Safari janks hard if every
  // timeupdate setState re-renders the full Quran reader tree.
  useEffect(() => {
    const a = ensureAudio();
    const flushTime = () => {
      timeRafRef.current = null;
      setCurrentTime(pendingTimeRef.current);
    };
    const onTime = () => {
      pendingTimeRef.current = a.currentTime || 0;
      if (timeRafRef.current != null) return;
      timeRafRef.current = window.requestAnimationFrame(flushTime);
    };
    const onDur = () => setDuration(a.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = async () => {
      if (modeRef.current !== "page") {
        setIsPlaying(false);
        return;
      }
      const q = queueRef.current;
      const i = idxRef.current;
      const nextIdx = i + 1;
      if (!q.length || nextIdx >= q.length) {
        setIsPlaying(false);
        return;
      }
      idxRef.current = nextIdx;
      await playRef(q[nextIdx]);
    };

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("durationchange", onDur);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);

    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("durationchange", onDur);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      if (timeRafRef.current != null) window.cancelAnimationFrame(timeRafRef.current);
      a.pause();
      a.src = "";
    };
  }, [ensureAudio, playRef]);

  // If reciter changes, restart current ayah on the new reciter (keeps sync).
  useEffect(() => {
    if (!currentAyah) return;
    const wasPlaying = isPlaying;
    playRef(currentAyah).then(() => {
      if (!wasPlaying) pause();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reciterId]);

  return {
    RECITERS,
    reciterId,
    setReciterId,
    mode,
    setMode,
    isPlaying,
    currentTime,
    duration,
    formattedTime: formatTime(currentTime),
    formattedDuration: formatTime(duration),
    currentAyah,
    currentAyahKey,
    playAyah,
    playPage,
    toggle,
    pause,
    next,
    prev,
    seek,
  };
}
