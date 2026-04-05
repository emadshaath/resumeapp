"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Inbox, Mail, ChevronDown, ChevronUp, AlertTriangle, ArrowLeft } from "lucide-react";

interface EmailMessage {
  id: string;
  from_address: string;
  from_name: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  is_read: boolean;
  is_spam: boolean;
  spam_score: number | null;
  received_at: string;
}

export default function EmailInboxPage() {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSpam, setShowSpam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasEmail, setHasEmail] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Check if user has a platform email
    const { data: platformEmail } = await supabase
      .from("platform_emails")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (!platformEmail) {
      setHasEmail(false);
      setLoading(false);
      return;
    }
    setHasEmail(true);

    const { data } = await supabase
      .from("email_messages")
      .select("*")
      .eq("profile_id", user.id)
      .order("received_at", { ascending: false })
      .limit(100);

    if (data) setMessages(data as EmailMessage[]);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { load(); }, [load]);

  async function markAsRead(id: string) {
    await supabase.from("email_messages").update({ is_read: true }).eq("id", id);
    setMessages(messages.map((m) => (m.id === id ? { ...m, is_read: true } : m)));
  }

  if (loading) {
    return <div className="py-20 text-center text-zinc-500">Loading inbox...</div>;
  }

  if (!hasEmail) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Inbox</h1>
          <p className="text-zinc-500 mt-1">View emails received at your platform address.</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Mail className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium">No platform email yet</h3>
            <p className="text-sm text-zinc-500 mt-1 mb-4">
              Set up your platform email to start receiving messages here.
            </p>
            <Button onClick={() => router.push("/dashboard/communication")}>
              Set Up Email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredMessages = showSpam ? messages.filter((m) => m.is_spam) : messages.filter((m) => !m.is_spam);
  const unreadCount = messages.filter((m) => !m.is_read && !m.is_spam).length;
  const spamCount = messages.filter((m) => m.is_spam).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Inbox</h1>
          <p className="text-zinc-500 mt-1">Emails received at your platform address.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {unreadCount > 0 && <Badge variant="default">{unreadCount} unread</Badge>}
          <Button
            variant={showSpam ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSpam(!showSpam)}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Spam ({spamCount})
          </Button>
        </div>
      </div>

      {filteredMessages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Inbox className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium">
              {showSpam ? "No spam" : "No emails yet"}
            </h3>
            <p className="text-sm text-zinc-500 mt-1">
              {showSpam
                ? "Your spam folder is clean."
                : "Emails sent to your platform address will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredMessages.map((msg) => {
            const isExpanded = expandedId === msg.id;
            const displayName = msg.from_name || msg.from_address.split("@")[0];

            return (
              <Card
                key={msg.id}
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  !msg.is_read && !msg.is_spam ? "border-l-4 border-l-brand" : ""
                } ${msg.is_spam ? "opacity-70" : ""}`}
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
                      <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {displayName[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm truncate ${!msg.is_read ? "font-semibold" : ""}`}>
                            {displayName}
                          </span>
                          <span className="text-xs text-zinc-400 truncate hidden sm:inline">{msg.from_address}</span>
                          {msg.is_spam && <Badge variant="destructive" className="text-xs shrink-0">Spam</Badge>}
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                          {msg.subject || "(no subject)"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 sm:ml-4 flex-shrink-0">
                      <span className="text-xs text-zinc-400 hidden sm:inline">
                        {new Date(msg.received_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <>
                    <Separator />
                    <div className="px-4 py-4 space-y-3">
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-zinc-500">From:</span>{" "}
                          {msg.from_name && <span className="font-medium">{msg.from_name} </span>}
                          <span className="text-zinc-400">&lt;{msg.from_address}&gt;</span>
                        </p>
                        <p>
                          <span className="text-zinc-500">Subject:</span>{" "}
                          <span className="font-medium">{msg.subject || "(no subject)"}</span>
                        </p>
                      </div>

                      {msg.body_html ? (
                        <div
                          className="rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-4 text-sm prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: msg.body_html }}
                        />
                      ) : (
                        <div className="rounded-md bg-zinc-50 dark:bg-zinc-900 p-4 text-sm whitespace-pre-wrap leading-relaxed">
                          {msg.body_text || "(empty message)"}
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `mailto:${msg.from_address}?subject=Re: ${msg.subject || ""}`;
                        }}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Reply
                      </Button>
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
