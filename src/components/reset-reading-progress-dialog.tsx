"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ResetReadingProgressDialog({
  triggerLabel = "Reset reading progress",
  variant = "outline" as const,
  className,
}: {
  triggerLabel?: string;
  variant?: "outline" | "destructive" | "ghost";
  className?: string;
}) {
  const router = useRouter();
  const resetReadingProgress = useAppStore((s) => s.resetReadingProgress);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function confirm() {
    setSyncError(null);
    setBusy(true);
    try {
      resetReadingProgress();
      const s = useAppStore.getState();
      const res = await fetch("/api/reading-state", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visited_pages: [],
          completed_pages: [],
          last_read_page: null,
          streak: null,
          sessions: [],
          bookmarks: s.bookmarks,
          reader_preferences: s.readerPreferences,
          today_progress: 0,
          today_status: "none",
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setSyncError(body?.error ?? "Could not save reset to your account.");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant={variant} className={className} disabled={busy}>
          {busy ? "Resetting…" : triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset reading progress?</DialogTitle>
          <DialogDescription className="text-left space-y-2 pt-1">
            <span className="block">
              Are you sure you want to reset your reading progress? This will clear tracked reading progress and
              completion data (sessions, streak, visited and completed pages, resume position, and activity-based
              hasanat totals). Your bookmarks are kept.
            </span>
          </DialogDescription>
        </DialogHeader>
        {syncError ? <p className="text-sm text-destructive">{syncError}</p> : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={() => void confirm()} disabled={busy}>
            {busy ? "Resetting…" : "Reset progress"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
