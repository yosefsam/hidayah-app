"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

function resolveTheme(theme: "light" | "dark" | "system"): "light" | "dark" {
  if (theme === "system") {
    return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.theme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(resolveTheme(theme));
  }, [theme, mounted]);

  // Keep "system" in sync when the OS appearance changes.
  useEffect(() => {
    if (!mounted || theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(resolveTheme("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, mounted]);

  // Re-apply after zustand persist rehydration (storage may override initial "system").
  useEffect(() => {
    if (!mounted) return;
    const unsub = useAppStore.persist.onFinishHydration(() => {
      applyTheme(resolveTheme(useAppStore.getState().theme));
    });
    if (useAppStore.persist.hasHydrated()) {
      applyTheme(resolveTheme(useAppStore.getState().theme));
    }
    return unsub;
  }, [mounted]);

  return <>{children}</>;
}
