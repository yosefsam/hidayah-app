import { AppNav } from "@/components/app-nav";
import { AppHeader } from "@/components/app-header";
import { DemoBanner } from "@/components/demo-banner";
import { MigrateReaderStore } from "@/components/migrate-reader-store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell min-h-screen supports-[height:100dvh]:min-h-dvh bg-background flex flex-col">
      <MigrateReaderStore />
      <DemoBanner />
      <AppHeader />
      <main className="min-w-0 flex-1">{children}</main>
      <AppNav />
    </div>
  );
}
