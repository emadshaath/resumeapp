import { Sidebar, MobileNav } from "@/components/dashboard/sidebar";
import { PwaInstallPrompt } from "@/components/dashboard/pwa-install-prompt";
import { DashboardContentWrap } from "@/components/dashboard/dashboard-content-wrap";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-screen flex-col md:flex-row">
      {/* Mobile: top bar + hamburger */}
      <MobileNav />
      {/* Desktop: fixed sidebar */}
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-900">
        <DashboardContentWrap>{children}</DashboardContentWrap>
      </main>
      {/* PWA install prompt for mobile */}
      <PwaInstallPrompt />
    </div>
  );
}
