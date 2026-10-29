"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

/** Original artwork includes a large canvas; crop its visible mark in the presentation layer. */
export const LOGO_SRC = "/logo/hidayah-logo.png";
const NATURAL_W = 1024;
const NATURAL_H = 682;

export type LogoSize = "sm" | "md" | "lg";

const wordmarkBoxClass: Record<LogoSize, string> = {
  sm: "h-7 w-[6.61rem]",
  md: "h-9 w-[8.5rem]",
  lg: "h-11 w-[10.39rem]",
};

// Bounds within the original 1024 × 682 image. Keep all artwork, including the y descender.
const WORDMARK_CROP = { x: 238, y: 256, width: 548, height: 145 };
const MARK_CROP = { x: 238, y: 256, width: 145, height: 145 };

function cropStyle(crop: typeof WORDMARK_CROP) {
  return {
    width: `${(NATURAL_W / crop.width) * 100}%`,
    left: `${(-crop.x / crop.width) * 100}%`,
    top: `${(-crop.y / crop.height) * 100}%`,
  };
}

const iconBoxClass: Record<LogoSize, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};

export type LogoTone = "onDark" | "onLight" | "auto";

function useLogoTone(tone: LogoTone): "onDark" | "onLight" {
  const storeTheme = useAppStore((s) => s.theme);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (tone !== "auto") return;
    const sync = () => setIsDark(document.documentElement.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMq = () => sync();
    mq.addEventListener("change", onMq);
    return () => {
      obs.disconnect();
      mq.removeEventListener("change", onMq);
    };
  }, [tone, storeTheme]);

  if (tone === "onDark") return "onDark";
  if (tone === "onLight") return "onLight";
  return isDark ? "onDark" : "onLight";
}

export type LogoProps = {
  className?: string;
  size?: LogoSize;
  /** Full horizontal logo or the crescent-and-book mark. */
  withWordmark?: boolean;
  /** Show icon-only on small screens; full logo from `sm` and up (navbar). */
  collapseWordmarkOnMobile?: boolean;
  href?: string | null;
  tone?: LogoTone;
  priority?: boolean;
};

/**
 * Display only the artwork bounds, preserving the original aspect ratio.
 * Light backgrounds use a dark chip so the original white wordmark remains readable.
 */
export function Logo({
  className,
  size = "md",
  withWordmark = true,
  collapseWordmarkOnMobile = false,
  href = "/",
  tone = "onDark",
  priority = false,
}: LogoProps) {
  const resolved = useLogoTone(tone);
  const needsChip = resolved === "onLight";

  const imgFull = (
    <span className={cn("relative inline-block shrink-0 overflow-hidden rounded-md", wordmarkBoxClass[size])}>
      <Image
        src={LOGO_SRC}
        alt=""
        aria-hidden="true"
        width={NATURAL_W}
        height={NATURAL_H}
        priority={priority}
        className="absolute block h-auto max-w-none"
        style={cropStyle(WORDMARK_CROP)}
        sizes="(max-width: 640px) 260px, 320px"
      />
    </span>
  );

  const imgIcon = (
    <span className={cn("relative inline-block shrink-0 overflow-hidden rounded-md", iconBoxClass[size])}>
      <Image
        src={LOGO_SRC}
        alt=""
        aria-hidden="true"
        width={NATURAL_W}
        height={NATURAL_H}
        priority={priority}
        className="absolute block h-auto max-w-none"
        style={cropStyle(MARK_CROP)}
        sizes="320px"
      />
    </span>
  );

  let content: ReactNode;
  if (collapseWordmarkOnMobile && withWordmark) {
    content = (
      <>
        <span className="hidden sm:inline-flex">{imgFull}</span>
        <span className="sm:hidden">{imgIcon}</span>
      </>
    );
  } else {
    content = withWordmark ? imgFull : imgIcon;
  }

  const inner = (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      {needsChip ? (
        <span className="inline-flex items-center rounded-lg bg-zinc-950 px-2 py-1 ring-1 ring-black/5 dark:bg-transparent dark:p-0 dark:ring-0">
          {content}
        </span>
      ) : (
        content
      )}
    </span>
  );

  if (href === null) {
    return <span role="img" aria-label="Hidayah">{inner}</span>;
  }

  return (
    <Link
      href={href}
      aria-label="Hidayah"
      className="inline-flex shrink-0 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      {inner}
    </Link>
  );
}
