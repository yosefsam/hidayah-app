"use client";

import Link from "next/link";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function DemoBanner() {
  const isDemo = useAppStore((s) => s.isDemo);
  const setDemoMode = useAppStore((s) => s.setDemoMode);
  if (!isDemo) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="flex items-center gap-2 text-foreground">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <span>Demo mode — progress saved in this browser only.</span>
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <Button asChild variant="outline" size="sm" className="text-xs">
          <Link href="/signup">Sign up to save</Link>
        </Button>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setDemoMode(false)}>
          Exit demo
        </Button>
      </div>
    </div>
  );
}
