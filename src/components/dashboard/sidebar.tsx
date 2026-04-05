"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  User,
  LayoutDashboard,
  Layers,
  Sparkles,
  BarChart3,
  Settings,
  LogOut,
  Mail,
  Phone,
  Search,
  Inbox,
  MessageSquare,
  Voicemail,
  CreditCard,
  History,
  Briefcase,
  Menu,
  X,
  FileUp,
} from "lucide-react";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Import Resume", href: "/dashboard/import", icon: FileUp },
  { name: "Profile", href: "/dashboard/profile", icon: User },
  { name: "Sections", href: "/dashboard/sections", icon: Layers },
  { name: "AI Review", href: "/dashboard/ai-review", icon: Sparkles },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "SEO", href: "/dashboard/seo", icon: Search },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Email", href: "/dashboard/communication", icon: Mail },
  { name: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  { name: "Phone", href: "/dashboard/phone", icon: Phone },
  { name: "Voicemails", href: "/dashboard/voicemails", icon: Voicemail },
  { name: "Job Tracker", href: "/dashboard/jobs", icon: Briefcase },
  { name: "Version History", href: "/dashboard/snapshots", icon: History },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-bg-active text-sidebar-text-active"
                  : "text-sidebar-text hover:bg-sidebar-bg-hover hover:text-sidebar-text-active"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <button
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-text hover:bg-sidebar-bg-hover hover:text-sidebar-text-active transition-colors"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  );
}

/** Desktop sidebar — hidden on mobile */
export function Sidebar() {
  return (
    <div className="hidden md:flex h-full w-64 shrink-0 flex-col bg-sidebar-bg">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-sidebar-logo">
          ResumeProfile
        </Link>
      </div>
      <SidebarContent />
    </div>
  );
}

/** Mobile top bar + slide-in sidebar */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between h-14 border-b border-border bg-background px-4 shrink-0">
        <Link href="/" className="text-lg font-bold tracking-tight text-brand">
          ResumeProfile
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in sidebar */}
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-sidebar-bg flex flex-col transform transition-transform duration-200 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-sidebar-logo" onClick={() => setOpen(false)}>
            ResumeProfile
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="p-2 -mr-2 text-sidebar-text hover:text-sidebar-text-active"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </div>
    </>
  );
}
