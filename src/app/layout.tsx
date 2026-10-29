import type { Metadata, Viewport } from "next";
import { Inter, Noto_Naskh_Arabic } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const notoNaskhArabic = Noto_Naskh_Arabic({ subsets: ["arabic"], variable: "--font-arabic" });

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hidayah.io";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "Hidayah — Guided Quran reading & daily consistency",
  description:
    "Hidayah helps you build a steady relationship with the Quran: goals, streaks, bookmarks, and a calm reader—designed for simplicity and consistency.",
  applicationName: "Hidayah",
  openGraph: {
    title: "Hidayah — Guided Quran reading",
    description: "Daily goals, streaks, and a focused reader—stay consistent with the Quran.",
    url: site,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoNaskhArabic.variable} font-sans antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
