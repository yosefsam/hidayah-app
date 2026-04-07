"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { safeAuthNextPath } from "@/lib/site-url";
import { motion } from "framer-motion";
import { normalizeAuthEmail } from "@/lib/auth/email";
import { createClient, SupabaseEnvError } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { HidayahLogo } from "@/components/brand/hidayah-logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const setDemoMode = useAppStore((s) => s.setDemoMode);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Match Supabase-stored identity: trim + lowercase email (see normalizeAuthEmail).
    const emailNormalized = normalizeAuthEmail(email);
    const passwordValue = password;

    if (!emailNormalized || !passwordValue) {
      setError("Please enter your email and password.");
      return;
    }

    // Debug: confirm values are present (never log raw password in shared/production builds).
    console.log("Attempting login:", emailNormalized, passwordValue ? `(password length: ${passwordValue.length})` : "(no password)");

    let supabase;
    try {
      // Uses NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY via @/lib/supabase/client (createBrowserClient from @supabase/ssr).
      supabase = createClient();
    } catch (err) {
      setError(err instanceof SupabaseEnvError ? err.message : "Could not initialize Supabase client.");
      return;
    }

    setError(null);
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: emailNormalized,
      password: passwordValue,
    });

    setLoading(false);

    if (signInError) {
      console.error("[Login] signInWithPassword failed:", signInError);
      setError(signInError.message);
      return;
    }

    console.log("[Login] success:", {
      userId: data.user?.id,
      email: data.user?.email,
      hasSession: Boolean(data.session),
    });

    setDemoMode(false);
    const next = safeAuthNextPath(searchParams.get("next"), "/dashboard");
    router.push(next);
    router.refresh();
  }

  return (
    <div className="dark min-h-screen flex flex-col items-center justify-center p-4 bg-[hsl(24_10%_6%)] text-zinc-100 antialiased">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <HidayahLogo size="md" tone="onDark" />
        </div>
        <Card className="border-white/10 bg-zinc-900/50 backdrop-blur shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-zinc-100">Welcome back</CardTitle>
            <CardDescription className="text-zinc-400">Sign in to continue your reading journey</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-200">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="border-white/10 bg-zinc-950/50 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-200">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="border-white/10 bg-zinc-950/50 text-zinc-100"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                size="lg"
                disabled={loading}
              >
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <p className="text-sm text-zinc-500 text-center">
                <Link href="/forgot-password" className="text-emerald-400 font-medium hover:underline">
                  Forgot password?
                </Link>
              </p>
              <p className="text-sm text-zinc-500 text-center">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-emerald-400 font-medium hover:underline">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
        <p className="text-center mt-6">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
            ← Back to home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
