"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Bell, MessageSquare, Mail, Voicemail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: "message" | "email" | "voicemail";
  title: string;
  subtitle: string;
  timestamp: string;
  href: string;
};

interface UnreadCounts {
  messages: number;
  emails: number;
  voicemails: number;
}

const POLL_INTERVAL = 60_000;

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const typeConfig = {
  message: { icon: MessageSquare, color: "text-blue-500" },
  email: { icon: Mail, color: "text-purple-500" },
  voicemail: { icon: Voicemail, color: "text-green-500" },
} as const;

export function NotificationBell() {
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, emails: 0, voicemails: 0 });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch counts and recent items in parallel
    const [msgCount, emailCount, vmCount, msgItems, emailItems, vmItems] = await Promise.all([
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
      supabase
        .from("contact_submissions")
        .select("id, sender_name, sender_email, subject, message, created_at")
        .eq("profile_id", user.id)
        .eq("is_read", false)
        .eq("is_spam", false)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("email_messages")
        .select("id, from_name, from_address, subject, received_at")
        .eq("profile_id", user.id)
        .eq("is_read", false)
        .eq("is_spam", false)
        .order("received_at", { ascending: false })
        .limit(5),
      supabase
        .from("voicemails")
        .select("id, caller_number, caller_city, caller_state, transcription, recording_duration, created_at")
        .eq("profile_id", user.id)
        .eq("is_read", false)
        .eq("is_spam", false)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    setCounts({
      messages: msgCount.count ?? 0,
      emails: emailCount.count ?? 0,
      voicemails: vmCount.count ?? 0,
    });

    const merged: Notification[] = [];

    if (msgItems.data) {
      for (const m of msgItems.data) {
        const snippet = m.subject
          ? `${m.subject}${m.message ? " — " + m.message : ""}`
          : m.message || "";
        merged.push({
          id: m.id,
          type: "message",
          title: m.sender_name || m.sender_email || "Unknown",
          subtitle: snippet,
          timestamp: m.created_at,
          href: "/dashboard/messages",
        });
      }
    }

    if (emailItems.data) {
      for (const e of emailItems.data) {
        merged.push({
          id: e.id,
          type: "email",
          title: e.from_name || e.from_address || "Unknown",
          subtitle: e.subject || "(no subject)",
          timestamp: e.received_at,
          href: "/dashboard/inbox",
        });
      }
    }

    if (vmItems.data) {
      for (const v of vmItems.data) {
        const location = [v.caller_city, v.caller_state].filter(Boolean).join(", ");
        const snippet = v.transcription
          ? v.transcription
          : v.recording_duration
            ? `${v.recording_duration}s voicemail`
            : "New voicemail";
        merged.push({
          id: v.id,
          type: "voicemail",
          title: v.caller_number || "Unknown caller",
          subtitle: location ? `${location} — ${snippet}` : snippet,
          timestamp: v.created_at,
          href: "/dashboard/voicemails",
        });
      }
    }

    merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setNotifications(merged.slice(0, 10));
  }, [supabase]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

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
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-white shadow-lg dark:bg-zinc-900">
          <div className="px-4 py-2.5 text-xs font-semibold text-muted-foreground border-b border-border">
            Notifications
            {total > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {total > 99 ? "99+" : total}
              </span>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No new notifications
              </div>
            ) : (
              notifications.map((n) => {
                const config = typeConfig[n.type];
                const Icon = config.icon;
                return (
                  <Link
                    key={`${n.type}-${n.id}`}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors border-b border-border last:border-b-0"
                  >
                    <div className={cn("mt-0.5 shrink-0", config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {n.title}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatRelativeTime(n.timestamp)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {n.subtitle}
                      </p>
                    </div>
                    <div className="mt-1.5 shrink-0">
                      <span className="block h-2 w-2 rounded-full bg-blue-500" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
