"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Bell, MessageSquare, Mail, Voicemail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface UnreadCounts {
  messages: number;
  emails: number;
  voicemails: number;
}

const POLL_INTERVAL = 60_000;

export function NotificationBell() {
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, emails: 0, voicemails: 0 });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchCounts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [msgRes, emailRes, vmRes] = await Promise.all([
      supabase
        .from("contact_submissions")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", user.id)
        .eq("is_read", false)
        .eq("is_spam", false),
      supabase
        .from("email_messages")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", user.id)
        .eq("is_read", false)
        .eq("is_spam", false),
      supabase
        .from("voicemails")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", user.id)
        .eq("is_read", false)
        .eq("is_spam", false),
    ]);

    setCounts({
      messages: msgRes.count ?? 0,
      emails: emailRes.count ?? 0,
      voicemails: vmRes.count ?? 0,
    });
  }, [supabase]);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  const total = counts.messages + counts.emails + counts.voicemails;

  const items = [
    { label: "Messages", count: counts.messages, href: "/dashboard/messages", icon: MessageSquare },
    { label: "Emails", count: counts.emails, href: "/dashboard/inbox", icon: Mail },
    { label: "Voicemails", count: counts.voicemails, href: "/dashboard/voicemails", icon: Voicemail },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-md p-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Notifications${total > 0 ? ` (${total} unread)` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-border bg-popover shadow-lg">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
            Notifications
          </div>
          <div className="py-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{item.label}</span>
                {item.count > 0 && (
                  <span className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium",
                    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  )}>
                    {item.count}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
