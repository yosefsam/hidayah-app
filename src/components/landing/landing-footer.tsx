import Link from "next/link";
import { Logo } from "@/components/Logo";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-zinc-950/80 py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Logo size="sm" tone="onDark" />
            <p className="text-sm leading-relaxed text-zinc-400">
              Build a calm, consistent relationship with the Quran—goals, progress, and reading in one place.
            </p>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Product</p>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <Link href="/#features" className="transition hover:text-white">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="transition hover:text-white">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/signup" className="transition hover:text-white">
                  Get started
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Company</p>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <Link href="/#about" className="transition hover:text-white">
                  About
                </Link>
              </li>
              <li>
                <a href="mailto:hello@hidayah.app" className="transition hover:text-white">
                  Contact
                </a>
              </li>
              <li>
                <Link href="/#privacy" className="transition hover:text-white">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Account</p>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <Link href="/login" className="transition hover:text-white">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/signup" className="transition hover:text-white">
                  Create account
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-sm text-zinc-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Hidayah. All rights reserved.</p>
          <p className="text-xs">Made for daily Quran reading—consistency over perfection.</p>
        </div>
      </div>
    </footer>
  );
}
