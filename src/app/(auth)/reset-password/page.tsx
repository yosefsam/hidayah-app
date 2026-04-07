"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient, SupabaseEnvError } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { HidayahLogo } from "@/components/brand/hidayah-logo";

/** Set new password after opening the email reset link (session established via /auth/callback). */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let supabase;
    try {
      supabase = createClient();
    } catch (err) {
      setError(err instanceof SupabaseEnvError ? err.message : "Could not initialize Supabase client.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/login");
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
            <CardTitle className="text-xl text-zinc-100">Set new password</CardTitle>
            <CardDescription className="text-zinc-400">Choose a password for your Hidayah account.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-200">
                  New password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="border-white/10 bg-zinc-950/50 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-zinc-200">
                  Confirm password
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
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
                {loading ? "Saving…" : "Update password"}
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
