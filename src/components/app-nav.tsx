"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, BarChart3, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/reader", label: "Read", icon: BookOpen },
  { href: "/analytics", label: "Stats", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
];

export function AppNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/onboarding")) return null;

  return (
    <nav aria-label="Main navigation" className="app-bottom-nav fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur md:relative md:border-0">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2 md:justify-start md:gap-1 md:px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined}
              className={cn("flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors md:flex-none md:flex-row md:gap-2 md:px-3",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              <item.icon className="h-5 w-5 md:h-4 md:w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
