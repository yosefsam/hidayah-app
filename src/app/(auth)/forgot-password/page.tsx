"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { normalizeAuthEmail } from "@/lib/auth/email";
import { createClient, SupabaseEnvError } from "@/lib/supabase/client";
import { getAuthSiteUrl } from "@/lib/site-url";
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
      setError("Please enter a valid email.");
      return;
    }
    const { error: err } = await supabase.auth.resetPasswordForEmail(emailNormalized, {
      redirectTo: `${getAuthSiteUrl()}/auth/callback?next=/reset-password`,
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground antialiased">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center space-y-4"
        >
          <HidayahLogo size="md" tone="auto" />
          <p className="text-sm text-muted-foreground">Check your email for a reset link.</p>
          <Button asChild variant="outline">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground antialiased">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <HidayahLogo size="md" tone="auto" />
        </div>
        <Card className="border shadow-xl bg-card">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Reset password</CardTitle>
            <CardDescription>We&apos;ll email you a link to choose a new password.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">{error}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                <Link href="/login" className="text-primary font-medium hover:underline">
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
