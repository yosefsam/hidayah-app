"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { normalizeAuthEmail } from "@/lib/auth/email";
import { createClient, SupabaseEnvError } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { HidayahLogo } from "@/components/brand/hidayah-logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let supabase;
    try {
      supabase = createClient();
    } catch (err) {
      setError(err instanceof SupabaseEnvError ? err.message : "Could not initialize Supabase client.");
      return;
    }
    setError(null);
    setLoading(true);
    const emailNormalized = normalizeAuthEmail(email);
    if (!emailNormalized) {
      setLoading(false);
      setError("Please enter your email.");
      return;
    }
    const { error: err } = await supabase.auth.resetPasswordForEmail(emailNormalized, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://hidayah.io"}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="dark min-h-screen flex flex-col items-center justify-center p-4 bg-[hsl(24_10%_6%)] text-zinc-100 antialiased">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center space-y-4"
        >
          <HidayahLogo size="md" tone="onDark" />
          <p className="text-sm text-zinc-400">Check your email for a reset link.</p>
          <Button asChild variant="outline" className="border-white/20 bg-transparent text-zinc-100 hover:bg-white/10">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen flex flex-col items-center justify-center p-4 bg-[hsl(24_10%_6%)] text-zinc-100 antialiased">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <HidayahLogo size="md" tone="onDark" />
        </div>
        <Card className="border-white/10 bg-zinc-900/50 backdrop-blur shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-zinc-100">Reset password</CardTitle>
            <CardDescription className="text-zinc-400">We&apos;ll email you a link to choose a new password.</CardDescription>
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
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                size="lg"
                disabled={loading}
              >
                {loading ? "Sending…" : "Send reset link"}
              </Button>
              <p className="text-sm text-zinc-500 text-center">
                <Link href="/login" className="text-emerald-400 font-medium hover:underline">
                  Back to sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
