"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { demoGoal, demoStreak, demoSessions } from "@/lib/demo-data";
import {
  BookOpen,
  Target,
  Flame,
  BarChart3,
  Bell,
  ChevronRight,
  Play,
  Bookmark,
  Sparkles,
  BookMarked,
  Compass,
  Heart,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ProductPreviewMock } from "@/components/landing/product-preview-mock";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingPage() {
  const router = useRouter();
  const setDemoMode = useAppStore((s) => s.setDemoMode);

  function startDemo() {
    setDemoMode(true, { goal: demoGoal, streak: demoStreak, sessions: demoSessions });
    router.push("/dashboard");
  }


  return (
    <div className="dark min-h-screen bg-[hsl(24_10%_6%)] text-zinc-100 antialiased">
      {/* ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute -right-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-teal-600/8 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 h-px w-full max-w-3xl -translate-x-1/2 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      </div>

      <nav className="landing-nav fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-zinc-950/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo size="md" tone="onDark" priority collapseWordmarkOnMobile />
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/login"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Sign in
            </Link>
            <Button
              asChild
              size="sm"
              className="bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500"
            >
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2 lg:gap-16">
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex flex-col items-center gap-3 sm:flex-row sm:items-center lg:justify-start"
            >
              <Logo size="sm" href={null} tone="onDark" withWordmark={false} className="opacity-95" />
              <p className="text-sm font-medium text-emerald-400/90">Guided Quran reading, built for real life</p>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]"
            >
              Stay close to the Quran—
              <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                {" "}
                one consistent day at a time
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6 text-lg leading-relaxed text-zinc-400"
            >
              Hidayah helps you set goals, track progress, and read with clarity—without the noise. Simple
              tools for streaks, bookmarks, and a calm reader so daily reading feels achievable.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap lg:justify-start"
            >
              <Button
                onClick={startDemo}
                size="lg"
                variant="secondary"
                className="w-full gap-2 border border-white/10 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
              >
                <Play className="h-5 w-5" /> Try demo — no sign up
              </Button>
              <Button
                asChild
                size="lg"
                className="w-full bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-500 sm:w-auto"
              >
                <Link href="/signup">
                  Get started free <ChevronRight className="ml-1 h-5 w-5" />
                </Link>
              </Button>
            </motion.div>
            <p className="mt-3 text-xs text-zinc-500">
              Fully free for everyone. All features included, with unlimited reading.
            </p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-6"
            >
              <Button asChild variant="ghost" className="text-zinc-400 hover:text-white">
                <Link href="/login">I already have an account</Link>
              </Button>
            </motion.div>
          </div>

          <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            <ProductPreviewMock />
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-zinc-500">
              <div className="rounded-lg border border-white/5 bg-white/[0.02] py-3">
                <p className="font-semibold text-emerald-400">Goals</p>
                <p className="mt-0.5">Pages · ayahs · time</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] py-3">
                <p className="font-semibold text-emerald-400">Reader</p>
                <p className="mt-0.5">Jump & bookmark</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] py-3">
                <p className="font-semibold text-emerald-400">Progress</p>
                <p className="mt-0.5">Streaks & stats</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="relative scroll-mt-24 border-t border-white/5 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">About Hidayah</h2>
            <p className="mt-6 text-lg leading-relaxed text-zinc-400">
              Hidayah exists to help you build a steady, heartfelt relationship with the Quran. We focus on
              simplicity, visible progress, and consistency—so daily reading fits into real life, not the other
              way around.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Heart,
                title: "Consistency first",
                body: "Small, regular steps beat occasional long sessions.",
              },
              {
                icon: Sparkles,
                title: "Clarity over clutter",
                body: "A calm interface so you can focus on the ayah in front of you.",
              },
              {
                icon: Compass,
                title: "Guidance-minded design",
                body: "Tools that respect your intention—goals, streaks, and gentle motivation.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-white/5 bg-zinc-900/40 p-6 ring-1 ring-white/[0.03]"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-24 border-t border-white/5 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Everything in one place</h2>
            <p className="mt-4 text-zinc-400">
              Thoughtful tools that stay out of your way—so the Quran stays at the center.
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Target,
                title: "Daily Quran goals",
                desc: "Set targets by pages, ayahs, minutes, or surahs—matched to how you actually read.",
              },
              {
                icon: Flame,
                title: "Streak tracking",
                desc: "See current and longest streaks. Momentum you can feel, day by day.",
              },
              {
                icon: Compass,
                title: "Jump anywhere",
                desc: "Go to surah, juz, page, or a specific ayah—instantly from the reader.",
              },
              {
                icon: Bookmark,
                title: "Bookmarks & resume",
                desc: "Save where you left off and pick up without friction.",
              },
              {
                icon: Sparkles,
                title: "Hasanat motivation",
                desc: "Lightweight estimates to encourage reading—never a substitute for intention.",
              },
              {
                icon: BookOpen,
                title: "Clean reading",
                desc: "Ayah-aware layout, RTL Arabic, and space for focus.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group rounded-2xl border border-white/5 bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 p-6 shadow-xl shadow-black/20 ring-1 ring-white/[0.04] transition hover:border-emerald-500/20 hover:ring-emerald-500/10"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 transition group-hover:bg-emerald-500/15">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 border-t border-white/5 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">How it works</h2>
            <p className="mt-4 text-zinc-400">Three steps. No overwhelm.</p>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              { step: "1", title: "Set your goal", desc: "Choose how much you want to read each day—flexible to your schedule." },
              { step: "2", title: "Read daily", desc: "Use the reader, log sessions, and let streaks build naturally." },
              { step: "3", title: "Build consistency", desc: "Track progress, celebrate small wins, and stay close to the Quran." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative rounded-2xl border border-white/5 bg-zinc-900/50 p-8 text-center ring-1 ring-white/[0.03]"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white shadow-lg">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual strip */}
      <section className="border-t border-white/5 py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
            <div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">A reader that feels intentional</h2>
              <p className="mt-4 text-lg text-zinc-400">
                Navigate the mushaf with jumps, bookmarks, and ayah-aware text—designed for clarity on every
                screen.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-zinc-300">
                <li className="flex items-center gap-2">
                  <BookMarked className="h-4 w-4 text-emerald-400" /> Resume exactly where you stopped
                </li>
                <li className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-400" /> See progress without drowning in charts
                </li>
                <li className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-emerald-400" /> Optional reminders that respect your rhythm
                </li>
              </ul>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 ring-1 ring-emerald-500/10">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-400/90">Reader</p>
                <p className="mt-2 font-arabic text-right text-2xl leading-loose text-white">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </p>
                <p className="mt-3 text-xs text-zinc-500">Ayah-aware · RTL · jump to surah/juz</p>
              </div>
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 ring-1 ring-white/5">
                  <p className="text-xs text-zinc-500">Streak</p>
                  <p className="text-2xl font-bold text-white">7 day streak</p>
                  <p className="text-xs text-emerald-400/80">Keep going—consistency compounds.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 ring-1 ring-white/5">
                  <p className="text-xs text-zinc-500">Bookmarks</p>
                  <p className="text-sm text-zinc-300">Save pages you return to often</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy blurb */}
      <section id="privacy" className="scroll-mt-24 border-t border-white/5 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-xl font-semibold">Privacy</h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            We collect only what&apos;s needed to run your account and sync your progress. We don&apos;t sell
            your data. For questions, contact{" "}
            <a href="mailto:hello@hidayah.app" className="text-emerald-400 underline-offset-4 hover:underline">
              hello@hidayah.app
            </a>
            .
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Start your Hidayah journey</h2>
          <p className="mt-4 text-zinc-400">
            Create a free account, set your goal, and open the reader when you&apos;re ready.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 bg-emerald-600 px-10 text-white shadow-lg shadow-emerald-900/35 hover:bg-emerald-500"
          >
            <Link href="/signup">Get started — it&apos;s free</Link>
          </Button>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
