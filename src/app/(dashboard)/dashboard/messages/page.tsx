"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Mail, AlertTriangle, Clock, ChevronDown, ChevronUp, Inbox } from "lucide-react";
import type { ContactSubmission } from "@/types/database";

export default function MessagesPage() {
  const [messages, setMessages] = useState<ContactSubmission[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data } = await supabase
      .from("contact_submissions")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setMessages(data as ContactSubmission[]);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { load(); }, [load]);

  async function markAsRead(id: string) {
    await supabase.from("contact_submissions").update({ is_read: true }).eq("id", id);
    setMessages(messages.map((m) => (m.id === id ? { ...m, is_read: true } : m)));
  }

  if (loading) {
    return <div className="py-20 text-center text-zinc-500">Loading messages...</div>;
  }

  const unreadCount = messages.filter((m) => !m.is_read && !m.is_spam).length;
  const spamCount = messages.filter((m) => m.is_spam).length;
  const nonSpamMessages = messages.filter((m) => !m.is_spam);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <p className="text-zinc-500 mt-1">
            Contact form submissions from your profile visitors.
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Badge variant="default">{unreadCount} unread</Badge>
          )}
          {spamCount > 0 && (
            <Badge variant="secondary">{spamCount} spam</Badge>
          )}
        </div>
      </div>

      {nonSpamMessages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Inbox className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium">No messages yet</h3>
            <p className="text-sm text-zinc-500 mt-1">
              When visitors contact you through your profile, messages will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {nonSpamMessages.map((msg) => {
            const isExpanded = expandedId === msg.id;
            return (
              <Card
                key={msg.id}
                className={`cursor-pointer transition-shadow hover:shadow-md ${!msg.is_read ? "border-l-4 border-l-blue-500" : ""}`}
              >
                <div
                  className="px-4 py-3"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : msg.id);
                    if (!msg.is_read) markAsRead(msg.id);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium">
                          {msg.sender_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm truncate ${!msg.is_read ? "font-semibold" : ""}`}>
                            {msg.sender_name}
                          </span>
                          <span className="text-xs text-zinc-400 truncate">{msg.sender_email}</span>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                          {msg.subject ? <span className="font-medium">{msg.subject} &ndash; </span> : null}
                          {msg.message.slice(0, 100)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <span className="text-xs text-zinc-400">
                        {formatRelativeTime(msg.created_at)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-zinc-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-zinc-400" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <>
                    <Separator />
                    <div className="px-4 py-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-zinc-500">From:</span>{" "}
                          <span className="font-medium">{msg.sender_name}</span>{" "}
                          <span className="text-zinc-400">&lt;{msg.sender_email}&gt;</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Received:</span>{" "}
                          {new Date(msg.created_at).toLocaleString()}
                        </div>
                      </div>
                      {msg.subject && (
                        <div className="text-sm">
                          <span className="text-zinc-500">Subject:</span>{" "}
                          <span className="font-medium">{msg.subject}</span>
                        </div>
                      )}
                      <div className="rounded-md bg-zinc-50 dark:bg-zinc-900 p-4 text-sm whitespace-pre-wrap leading-relaxed">
                        {msg.message}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `mailto:${msg.sender_email}?subject=Re: ${msg.subject || "Your message"}`;
                          }}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Reply via Email
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
