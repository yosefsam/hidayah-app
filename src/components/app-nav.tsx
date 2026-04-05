"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Home, BookOpen, BarChart3, User, Lock, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { SubscriptionTierBadge } from "@/components/subscription/subscription-tier-badge";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/reader", label: "Read", icon: BookOpen },
  { href: "/analytics", label: "Stats", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
];

const hideNavPaths = ["/onboarding", "/onboarding/complete"];

export function AppNav() {
  const pathname = usePathname();
  const proStatus = useAppStore((s) => s.proStatus);
  const tier = proStatus === "pro" ? "pro" : "free";

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[UI] AppNav tier from store", { proStatus, tier });
    }
  }, [proStatus, tier]);

  if (hideNavPaths.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur md:relative md:border-0">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2 md:justify-start md:gap-1 md:px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const isProLockedItem = item.href === "/analytics" && proStatus !== "pro";
          const href = isProLockedItem ? `/pricing?next=${encodeURIComponent("/analytics")}` : item.href;
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg px-4 py-2 text-xs font-medium transition-colors md:flex-row md:gap-2 md:px-3",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 md:h-4 md:w-4" />
              <span className="flex items-center gap-1">
                {item.label}
                {item.href === "/analytics" && proStatus === "pro" ? <Crown className="h-3 w-3 text-primary" /> : null}
                {item.href === "/analytics" && proStatus !== "pro" ? <Lock className="h-3 w-3 text-muted-foreground" /> : null}
              </span>
            </Link>
          );
        })}
        {proStatus === "free" ? (
          <Link
            href="/pricing?next=%2Freader"
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-lg px-4 py-2 text-xs font-medium transition-colors md:flex-row md:gap-2 md:px-3",
              pathname.startsWith("/pricing") ? "text-primary" : "text-emerald-500 hover:text-emerald-400"
            )}
          >
            <Crown className="h-5 w-5 md:h-4 md:w-4" />
            <span>Upgrade</span>
          </Link>
        ) : null}
        <div className="hidden md:flex md:items-center md:pl-2 md:ml-1 md:border-l md:border-border">
          <SubscriptionTierBadge tier={tier} />
        </div>
      </div>
    </nav>
  );
}
