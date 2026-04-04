"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Radio,
  Voicemail,
  CreditCard,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
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
  { name: "Version History", href: "/dashboard/snapshots", icon: History },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex h-16 items-center border-b border-zinc-200 px-6 dark:border-zinc-800">
        <Link href="/" className="text-lg font-bold tracking-tight">
          ResumeProfile
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-zinc-600 dark:text-zinc-400"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
