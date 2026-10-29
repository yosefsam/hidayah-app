"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { demoGoal } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Target, Bell, Palette, LogOut, BookOpen } from "lucide-react";
import { useMemo } from "react";
import { HidayahLogo } from "@/components/brand/hidayah-logo";
import { ResetReadingProgressDialog } from "@/components/reset-reading-progress-dialog";

const unitLabel: Record<string, string> = { pages: "Pages", ayahs: "Verses", minutes: "Minutes", surahs: "Surahs" };

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return undefined;
    }
  }, []);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const reminder = useAppStore((s) => s.reminder);
  const setReminder = useAppStore((s) => s.setReminder);
  const userGoal = useAppStore((s) => s.userGoal);
  const goal = userGoal ?? demoGoal;
  const readerPreferences = useAppStore((s) => s.readerPreferences);
  const setReaderPreferences = useAppStore((s) => s.setReaderPreferences);
  const lastReadPosition = useAppStore((s) => s.lastReadPosition);
  const clearDataForUserSwitch = useAppStore((s) => s.clearDataForUserSwitch);
  const setPersistedAuthUserId = useAppStore((s) => s.setPersistedAuthUserId);
  const authDisplayName = useAppStore((s) => s.authDisplayName);
  const authEmail = useAppStore((s) => s.authEmail);
  async function handleSignOut() {
    setPersistedAuthUserId(null);
    clearDataForUserSwitch();
    if (supabase) await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <header className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-semibold mt-2">Profile & settings</h1>
            <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
          </div>
          <HidayahLogo size="sm" href={null} tone="auto" collapseWordmarkOnMobile />
        </div>
      </header>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Account</CardTitle><CardDescription>Your profile</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</p>
                <p className="mt-0.5 font-medium text-foreground">{authDisplayName ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</p>
                <p className="mt-0.5 break-all font-medium text-foreground">{authEmail ?? "—"}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Update email or password in your account provider settings.
            </p>
            <Button variant="outline" onClick={handleSignOut} className="w-full"><LogOut className="h-4 w-4 mr-2" />Sign out</Button>
          </CardContent>
        </Card>
      </motion.section>


      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" />Daily goal</CardTitle><CardDescription>Your current target</CardDescription></CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{goal.dailyAmount} {unitLabel[goal.unit]} per day</p>
            <p className="text-sm text-muted-foreground mt-1">{goal.intensity} plan. Change in onboarding or settings.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={lastReadPosition?.page ? `/reader?page=${lastReadPosition.page}` : "/reader"}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Open reader
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full" asChild><Link href="/session">Manual log</Link></Button>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" />Reader preferences</CardTitle>
            <CardDescription>Customize your reading experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="focus-mode">Focus mode</Label>
              <Switch id="focus-mode" checked={readerPreferences.focusMode} onCheckedChange={(checked) => setReaderPreferences({ focusMode: checked })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="translation-toggle">Translation (MVP)</Label>
              <Switch id="translation-toggle" checked={readerPreferences.showTranslation} onCheckedChange={(checked) => setReaderPreferences({ showTranslation: checked })} />
            </div>
            <p className="text-xs text-muted-foreground">A full Quran + translation dataset can be plugged in cleanly later.</p>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" />Reminders</CardTitle><CardDescription>When to nudge you</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="reminder-toggle">Daily reminder</Label>
              <Switch id="reminder-toggle" checked={reminder?.enabled ?? true} onCheckedChange={(checked) => setReminder(reminder ? { ...reminder, enabled: checked } : { id: "r1", userId: "user-1", enabled: checked, time: "08:00", tone: "gentle", frequency: "daily", updatedAt: new Date().toISOString() })} />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Select value={reminder?.time ?? "08:00"} onValueChange={(v) => setReminder(reminder ? { ...reminder, time: v } : { id: "r1", userId: "user-1", enabled: true, time: v, tone: "gentle", frequency: "daily", updatedAt: new Date().toISOString() })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["06:00", "07:00", "08:00", "09:00", "12:00", "20:00"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Push/email notifications can be added later.</p>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-base">Reading data</CardTitle>
            <CardDescription>Reset tracked progress from this device</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Clears sessions, streak, visited/completed pages, resume position, and activity-based hasanat totals.
              Bookmarks are kept.
            </p>
            <ResetReadingProgressDialog variant="destructive" className="w-full sm:w-auto" />
          </CardContent>
        </Card>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4" />Appearance</CardTitle><CardDescription>Light or dark</CardDescription></CardHeader>
          <CardContent>
            <Select value={theme} onValueChange={(v: "light" | "dark" | "system") => setTheme(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </motion.section>
    </div>
  );
}
