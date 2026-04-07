"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { RezmaiLogo } from "@/components/rezmai-logo";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import {
  User,
  LayoutDashboard,
  Layers,
  BarChart3,
  Settings,
  LogOut,
  Inbox,
  Mail,
  Phone,
  Search,
  MessageSquare,
  Voicemail,
  Briefcase,
  Wand2,
  ClipboardCheck,
  Link2,
  Menu,
  X,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
} from "lucide-react";

type NavItem = { name: string; href: string; icon: LucideIcon };
type NavGroup = { label: string; icon: LucideIcon; items: NavItem[] };
type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

const navigation: NavEntry[] = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Resume",
    icon: Layers,
    items: [
      { name: "Profile", href: "/dashboard/profile", icon: User },
      { name: "Resume", href: "/dashboard/sections", icon: Layers },
      { name: "LinkedIn Sync", href: "/dashboard/sections?open=linkedin", icon: Link2 },
    ],
  },
  {
    label: "Communications",
    icon: MessageSquare,
    items: [
      { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
      { name: "Email", href: "/dashboard/communication", icon: Mail },
      { name: "Inbox", href: "/dashboard/inbox", icon: Inbox },
      { name: "Phone", href: "/dashboard/phone", icon: Phone },
      { name: "Voicemails", href: "/dashboard/voicemails", icon: Voicemail },
    ],
  },
  { name: "Job Tracker", href: "/dashboard/jobs", icon: Briefcase },
  { name: "Smart Variants", href: "/dashboard/variants", icon: Wand2 },
  { name: "Peer Review", href: "/dashboard/reviews", icon: ClipboardCheck },
  {
    label: "Insights",
    icon: BarChart3,
    items: [
      { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
      { name: "SEO", href: "/dashboard/seo", icon: Search },
    ],
  },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

/** Check if any item in a group matches the current path */
function isGroupActive(group: NavGroup, pathname: string): boolean {
  return group.items.some(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href))
  );
}

/** Get stored expanded groups from localStorage */
function getStoredExpanded(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("sidebar-expanded");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function storeExpanded(labels: string[]) {
  try {
    localStorage.setItem("sidebar-expanded", JSON.stringify(labels));
  } catch { /* ignore */ }
}

function SidebarContent({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Start empty to match server render, then hydrate from localStorage
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // On mount: restore stored state + auto-expand active groups
  useEffect(() => {
    const stored = new Set(getStoredExpanded());
    for (const entry of navigation) {
      if (isGroup(entry) && isGroupActive(entry, pathname)) {
        stored.add(entry.label);
      }
    }
    setExpandedGroups(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-expand when navigating to an item inside a collapsed group
  useEffect(() => {
    for (const entry of navigation) {
      if (isGroup(entry) && isGroupActive(entry, pathname)) {
        setExpandedGroups((prev) => {
          if (prev.has(entry.label)) return prev;
          const next = new Set(prev);
          next.add(entry.label);
          storeExpanded(Array.from(next));
          return next;
        });
      }
    }
  }, [pathname]);

  function toggleGroup(label: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      storeExpanded(Array.from(next));
      return next;
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navigation.map((entry) => {
          if (isGroup(entry)) {
            const groupActive = isGroupActive(entry, pathname);
            const isExpanded = expandedGroups.has(entry.label);

            // Collapsed: show only the group icon as a link to the first item
            if (collapsed) {
              return (
                <div key={entry.label} className="space-y-0.5">
                  <Link
                    href={entry.items[0].href}
                    onClick={onNavigate}
                    title={entry.label}
                    className={cn(
                      "flex items-center justify-center rounded-md p-2 transition-colors",
                      groupActive
                        ? "bg-sidebar-bg-active text-sidebar-text-active"
                        : "text-sidebar-text hover:bg-sidebar-bg-hover hover:text-sidebar-text-active"
                    )}
                  >
                    <entry.icon className="h-5 w-5 shrink-0" />
                  </Link>
                </div>
              );
            }

            return (
              <div key={entry.label} className="space-y-0.5">
                <button
                  onClick={() => toggleGroup(entry.label)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    groupActive
                      ? "text-sidebar-text-active"
                      : "text-sidebar-text hover:bg-sidebar-bg-hover hover:text-sidebar-text-active"
                  )}
                >
                  <entry.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{entry.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>
                {isExpanded && (
                  <div className="ml-4 space-y-0.5 border-l border-sidebar-border pl-3">
                    {entry.items.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href));
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors",
                            isActive
                              ? "bg-sidebar-bg-active text-sidebar-text-active font-medium"
                              : "text-sidebar-text hover:bg-sidebar-bg-hover hover:text-sidebar-text-active"
                          )}
                        >
                          <item.icon className="h-3.5 w-3.5 shrink-0" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Standalone item
          const isActive =
            pathname === entry.href ||
            (entry.href !== "/dashboard" && pathname.startsWith(entry.href));

          if (collapsed) {
            return (
              <Link
                key={entry.name}
                href={entry.href}
                onClick={onNavigate}
                title={entry.name}
                className={cn(
                  "flex items-center justify-center rounded-md p-2 transition-colors",
                  isActive
                    ? "bg-sidebar-bg-active text-sidebar-text-active"
                    : "text-sidebar-text hover:bg-sidebar-bg-hover hover:text-sidebar-text-active"
                )}
              >
                <entry.icon className="h-5 w-5 shrink-0" />
              </Link>
            );
          }

          return (
            <Link
              key={entry.name}
              href={entry.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-bg-active text-sidebar-text-active"
                  : "text-sidebar-text hover:bg-sidebar-bg-hover hover:text-sidebar-text-active"
              )}
            >
              <entry.icon className="h-4 w-4 shrink-0" />
              {entry.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <button
          className={cn(
            "flex w-full items-center rounded-md text-sm font-medium text-sidebar-text hover:bg-sidebar-bg-hover hover:text-sidebar-text-active transition-colors",
            collapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
          )}
          onClick={handleLogout}
          title="Sign out"
        >
          <LogOut className={collapsed ? "h-5 w-5" : "h-4 w-4"} />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </>
  );
}

function getStoredCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("sidebar-collapsed") === "true";
  } catch {
    return false;
  }
}

function storeCollapsed(value: boolean) {
  try {
    localStorage.setItem("sidebar-collapsed", String(value));
  } catch { /* ignore */ }
}

/** Desktop sidebar — hidden on mobile */
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    setCollapsed(getStoredCollapsed());
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      storeCollapsed(next);
      return next;
    });
  }

  return (
    <div
      className={cn(
        "hidden md:flex sticky top-0 h-screen shrink-0 flex-col bg-sidebar-bg transition-[width] duration-200 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-3">
        {collapsed ? (
          <Link href="/" className="flex w-full items-center justify-center text-sidebar-logo" title="rezm.ai">
            <RezmaiLogo size={24} />
          </Link>
        ) : (
          <>
            <Link href="/" className="flex items-center gap-2 px-3 text-lg font-bold tracking-tight text-sidebar-logo">
              <RezmaiLogo size={24} />
              rezm.ai
            </Link>
            <NotificationBell />
          </>
        )}
      </div>
      <SidebarContent collapsed={collapsed} />
      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={toggle}
          className="flex w-full items-center justify-center rounded-md p-2 text-sidebar-text hover:bg-sidebar-bg-hover hover:text-sidebar-text-active transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </button>
      </div>
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
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-brand">
          <RezmaiLogo size={24} />
          rezm.ai
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => setOpen(true)}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
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
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-sidebar-logo" onClick={() => setOpen(false)}>
            <RezmaiLogo size={24} />
            rezm.ai
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
