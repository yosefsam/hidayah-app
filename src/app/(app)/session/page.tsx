"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { demoGoal } from "@/lib/demo-data";
import { getHasanatForSession, formatHasanat, HASANAT_DISCLAIMER } from "@/lib/hasanat";
import type { ReadingSession } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, BookOpen } from "lucide-react";

const UNITS = [{ value: "pages", label: "Pages" }, { value: "ayahs", label: "Verses (ayahs)" }, { value: "minutes", label: "Minutes" }, { value: "surahs", label: "Surahs" }] as const;

export default function SessionPage() {
  const userGoal = useAppStore((s) => s.userGoal);
  const goal = userGoal ?? demoGoal;
  const addSession = useAppStore((s) => s.addSession);
  const setStreak = useAppStore((s) => s.setStreak);
  const streak = useAppStore((s) => s.streak);

  const [amount, setAmount] = useState(goal.dailyAmount);
  const [unit, setUnit] = useState(goal.unit);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const goalCompleted = unit === goal.unit && amount >= goal.dailyAmount;
  const sessionHasanat = getHasanatForSession(amount, unit);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hasanat = getHasanatForSession(amount, unit);
    const session: ReadingSession = { id: `s-${Date.now()}`, userId: "user-1", amount, unit, completedAt: new Date().toISOString(), note: note.trim() || undefined, goalCompleted, hasanat, source: "manual" };
    addSession(session);
    if (goalCompleted && streak) {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const last = streak.lastCompletedDate;
      let newCurrent = streak.currentStreak;
      if (!last || last === yesterdayStr) newCurrent += 1;
      else if (last !== today) newCurrent = 1;
      setStreak({ ...streak, currentStreak: newCurrent, longestStreak: Math.max(streak.longestStreak, newCurrent), lastCompletedDate: today, updatedAt: new Date().toISOString() });
    } else if (goalCompleted && !streak) {
      setStreak({ id: "streak-1", userId: "user-1", currentStreak: 1, longestStreak: 1, lastCompletedDate: new Date().toISOString().split("T")[0], updatedAt: new Date().toISOString() });
    }
    setSubmitted(true);
  }

  if (submitted) {
    const earnedHasanat = getHasanatForSession(amount, unit);
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary mb-6"><Check className="h-8 w-8" /></div>
          <h2 className="text-xl font-semibold">Session saved</h2>
          <p className="text-muted-foreground mt-2">{goalCompleted ? "You hit your daily goal — great job!" : "Keep going. You&apos;re making progress."}</p>
          <p className="text-primary font-semibold mt-3">+{formatHasanat(earnedHasanat)} hasanat earned</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild><Link href="/dashboard">Back to dashboard</Link></Button>
            <Button variant="outline" asChild><Link href="/session">Log another session</Link></Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <header className="mb-6">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
        <h1 className="text-xl font-semibold mt-2">Log reading</h1>
        <p className="text-sm text-muted-foreground">Record what you read. Your daily goal is {goal.dailyAmount} {goal.unit}.</p>
      </header>
      <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" />Reading session</CardTitle><CardDescription>How much did you read?</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1"><Label>Amount</Label><Input type="number" min={1} value={amount} onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)} /></div>
              <div className="w-32"><Label>Unit</Label><Select value={unit} onValueChange={(v) => setUnit(v as typeof goal.unit)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            {goalCompleted && <p className="text-sm text-primary font-medium">✓ This completes your daily goal</p>}
            <p className="text-sm text-muted-foreground">
              You&apos;ll earn <span className="font-medium text-foreground">{formatHasanat(sessionHasanat)}</span> hasanat
              (estimate from typical letter counts).
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{HASANAT_DISCLAIMER}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Reflection (optional)</CardTitle><CardDescription>Add a note</CardDescription></CardHeader>
          <CardContent><Textarea placeholder="e.g. Read after Fajr..." value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="resize-none" /></CardContent>
        </Card>
        <Button type="submit" size="lg" className="w-full">Save session</Button>
      </motion.form>
    </div>
  );
}
