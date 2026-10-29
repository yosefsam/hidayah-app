"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { demoGoal, demoStreak, demoSessions, monthlyChartData } from "@/lib/demo-data";
import { getHasanatForSession, formatHasanat, HASANAT_DISCLAIMER } from "@/lib/hasanat";
import { estimateUniqueCompletedHasanat } from "@/lib/hasanat/estimate";
import { loadQuranPages, type PagesPayload } from "@/lib/quran/runtime";
import { MUSHAF_PAGE_COUNT } from "@/lib/quran";
import { mushafCompletionPercent, formatCompletionLine } from "@/lib/progress-stats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Flame, BookOpen, Target, TrendingUp, Award, MapPin } from "lucide-react";
import { ResetReadingProgressDialog } from "@/components/reset-reading-progress-dialog";

const unitLabel: Record<string, string> = { pages: "pages", ayahs: "verses", minutes: "minutes", surahs: "surahs" };

export default function AnalyticsPage() {
  const userGoal = useAppStore((s) => s.userGoal);
  const streak = useAppStore((s) => s.streak);
  const sessions = useAppStore((s) => s.sessions);
  const isDemo = useAppStore((s) => s.isDemo);
  const goal = userGoal ?? demoGoal;
  const streakData = streak ?? demoStreak;
  const sessionList = sessions.length > 0 ? sessions : isDemo ? demoSessions : [];
  const isEmptySessions = sessions.length === 0;

  const completedPages = useAppStore((s) => s.completedPages);
  const visitedPages = useAppStore((s) => s.visitedPages);

  const [pagesPayload, setPagesPayload] = useState<PagesPayload | null>(null);
  useEffect(() => {
    let mounted = true;
    loadQuranPages()
      .then((p) => {
        if (mounted) setPagesPayload(p);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const uniqueHasanatEst = estimateUniqueCompletedHasanat(completedPages, pagesPayload);

  const totalAmount = sessionList.reduce((a, s) => a + s.amount, 0);
  const totalHasanat = sessionList.reduce((a, s) => a + (s.hasanat ?? getHasanatForSession(s.amount, s.unit)), 0);
  const completedDays = sessionList.filter((s) => s.goalCompleted).length;
  const totalSessions = sessionList.length;
  const avgPerDay = totalSessions > 0 ? Math.round((totalAmount / Math.max(1, totalSessions)) * 10) / 10 : 0;
  const readerSessions = sessionList.filter((s) => s.source === "reader");
  const pagesFromReader = readerSessions.reduce((a, s) => a + (s.unit === "pages" ? s.amount : 0), 0);
  const avgPagesPerReaderSession = readerSessions.length > 0 ? Math.round((pagesFromReader / readerSessions.length) * 10) / 10 : 0;
  const totalReaderMinutes = Math.round(readerSessions.reduce((a, s) => a + (s.durationSeconds ?? 0), 0) / 60);

  const completionPct = mushafCompletionPercent(completedPages.length);

  return (
    <>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
          <h1 className="text-xl font-semibold mt-2">Progress</h1>
          <p className="text-sm text-muted-foreground">Reading stats, Quran completion, and consistency</p>
        </div>
        <ResetReadingProgressDialog className="shrink-0" />
      </header>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
        <Card className="border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quran completion</CardTitle>
            <CardDescription>Unique pages marked complete while reading ({MUSHAF_PAGE_COUNT} pages)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-4xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{completionPct}%</p>
            <p className="text-sm font-medium">{formatCompletionLine(completedPages.length)}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                <MapPin className="h-3 w-3" /> {visitedPages.length} visited
              </span>
              <span className="rounded-full bg-muted px-2 py-1">{completedPages.length} completed</span>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Award className="h-4 w-4" />
              <span className="text-xs">Total hasanat (sessions)</span>
            </div>
            <p className="text-2xl font-bold">{formatHasanat(totalHasanat)}</p>
            <p className="text-xs text-muted-foreground">includes re-reads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Award className="h-4 w-4" />
              <span className="text-xs">Unique pages (est.)</span>
            </div>
            <p className="text-2xl font-bold">{formatHasanat(uniqueHasanatEst)}</p>
            <p className="text-xs text-muted-foreground">letter-based, once per page</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Flame className="h-4 w-4" />
              <span className="text-xs">Current streak</span>
            </div>
            <p className="text-2xl font-bold">{streakData.currentStreak}</p>
            <p className="text-xs text-muted-foreground">days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Longest streak</span>
            </div>
            <p className="text-2xl font-bold">{streakData.longestStreak}</p>
            <p className="text-xs text-muted-foreground">days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BookOpen className="h-4 w-4" />
              <span className="text-xs">Total {unitLabel[goal.unit]}</span>
            </div>
            <p className="text-2xl font-bold">{totalAmount}</p>
            <p className="text-xs text-muted-foreground">{unitLabel[goal.unit]}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs">Sessions</span>
            </div>
            <p className="text-2xl font-bold">{totalSessions}</p>
            <p className="text-xs text-muted-foreground">Goal days: {completedDays}</p>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last 30 days</CardTitle>
            <CardDescription>Daily completion (demo chart)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis hide domain={[0, "auto"]} />
                  <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(value: number) => [value, "Completed"]} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {monthlyChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.completed ? "hsl(var(--primary))" : "hsl(var(--muted))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Average per session</p>
            <p className="text-xl font-semibold">
              {avgPerDay} {unitLabel[goal.unit]}
            </p>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Reader pages</p>
            <p className="text-xl font-semibold">{pagesFromReader}</p>
            <p className="text-xs text-muted-foreground">from in-app reading</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg pages / reader session</p>
            <p className="text-xl font-semibold">{avgPagesPerReaderSession}</p>
            <p className="text-xs text-muted-foreground">Time: {totalReaderMinutes} min total</p>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">{HASANAT_DISCLAIMER}</p>
            {isEmptySessions && isDemo && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Demo sample sessions shown — sign in or read to track your own.
              </p>
            )}
            {isEmptySessions && !isDemo && (
              <p className="text-xs text-muted-foreground">No sessions logged yet — start in the reader.</p>
            )}
          </CardContent>
        </Card>
      </motion.section>
      </div>
    </>
  );
}
