"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { useAppStore } from "@/store/useAppStore";

const hidePaths = ["/onboarding", "/onboarding/complete"];

export function AppHeader() {
  const pathname = usePathname();
  const authDisplayName = useAppStore((s) => s.authDisplayName);
  const isDemo = useAppStore((s) => s.isDemo);
  if (hidePaths.some((p) => pathname.startsWith(p))) return null;

  const showGreeting = Boolean(authDisplayName && !isDemo);

  return (
    <header className="app-header sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-2 px-4 md:mx-auto md:max-w-4xl">
        <Logo size="sm" tone="auto" collapseWordmarkOnMobile />
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3 md:gap-4">
          <nav className="flex shrink-0 items-center gap-3 text-xs font-medium text-muted-foreground md:gap-4">
            <Link href="/dashboard" className="transition hover:text-foreground">
              Today
            </Link>
            <Link href="/reader" className="transition hover:text-foreground">
              Read
            </Link>
            <Link href="/analytics" className="transition hover:text-foreground">
              Progress
            </Link>
          </nav>
          {showGreeting ? (
            <span
              className="max-w-[6.5rem] min-w-0 truncate text-xs text-muted-foreground sm:max-w-[12rem] sm:text-sm md:max-w-[14rem]"
              title={authDisplayName ?? undefined}
            >
              Hi, {authDisplayName}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
