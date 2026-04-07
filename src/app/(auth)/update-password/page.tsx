"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** @deprecated Use /reset-password. Kept so old email links still work. */
export default function UpdatePasswordRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/reset-password");
  }, [router]);
  return (
    <div className="dark min-h-screen flex items-center justify-center bg-[hsl(24_10%_6%)] text-zinc-400 text-sm">
      Redirecting…
    </div>
  );
}
