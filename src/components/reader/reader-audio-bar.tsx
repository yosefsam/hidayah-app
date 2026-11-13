"use client";

import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { useQuranAudioPlayer } from "@/hooks/useQuranAudioPlayer";
import type { QuranAyah } from "@/lib/quran";

type AudioApi = ReturnType<typeof useQuranAudioPlayer>;

/**
 * Isolated audio chrome so frequent time updates do not re-render the Quran text tree.
 * Critical for Safari: main-thread jank from whole-reader re-renders made buttons feel dead.
 */
export function ReaderAudioBar({
  audio,
  ayahs,
  showChrome,
  immersive,
  onReveal,
}: {
  audio: AudioApi;
  ayahs: QuranAyah[];
  showChrome: boolean;
  immersive: boolean;
  onReveal: () => void;
}) {
  return (
    <div
      className="reader-player reader-chrome fixed left-0 right-0 z-30 border-t bg-background/95"
      data-visible={showChrome ? "true" : "false"}
      data-reader-chrome=""
      aria-hidden={!showChrome}
      {...(!showChrome ? ({ inert: true } as React.HTMLAttributes<HTMLElement>) : {})}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mx-auto max-w-lg px-4 py-3 space-y-2" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
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
              onClick={() => {
                audio.playPage(ayahs);
                onReveal();
              }}
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
              onReveal();
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

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              audio.playPage(ayahs);
              onReveal();
            }}
            className="sm:hidden"
          >
            <Volume2 className="h-4 w-4 mr-2" />
            Play page
          </Button>
          <p className="min-w-0 flex-1 text-[11px] text-muted-foreground">
            {immersive ? "Tap empty space to hide controls. Audio keeps playing." : "Tap any ayah to play it."}
          </p>
        </div>
      </div>
    </div>
  );
}
