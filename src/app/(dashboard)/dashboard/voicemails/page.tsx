"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Voicemail,
  Phone,
  Clock,
  MapPin,
  FileText,
  Trash2,
  RefreshCw,
  Lock,
} from "lucide-react";

interface VoicemailData {
  id: string;
  caller_number: string;
  caller_city: string | null;
  caller_state: string | null;
  caller_country: string | null;
  recording_url: string | null;
  recording_duration: number | null;
  transcription: string | null;
  transcription_status: string;
  is_read: boolean;
  is_spam: boolean;
  created_at: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatPhone(phone: string): string {
  // Simple format for US numbers
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export default function VoicemailsPage() {
  const [voicemails, setVoicemails] = useState<VoicemailData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<string>("free");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "spam">("all");
  const router = useRouter();
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tier")
      .eq("id", user.id)
      .single();
    if (profile) setTier(profile.tier);

    let query = supabase
      .from("voicemails")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false });

    if (filter === "unread") query = query.eq("is_read", false);
    if (filter === "spam") query = query.eq("is_spam", true);
    if (filter !== "spam") query = query.eq("is_spam", false);

    const { data } = await query.limit(50);
    if (data) setVoicemails(data as VoicemailData[]);
    setLoading(false);
  }, [supabase, router, filter]);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    await supabase.from("voicemails").update({ is_read: true }).eq("id", id);
    setVoicemails(voicemails.map((v) => (v.id === id ? { ...v, is_read: true } : v)));
  }

  async function deleteVoicemail(id: string) {
    await supabase.from("voicemails").delete().eq("id", id);
    setVoicemails(voicemails.filter((v) => v.id !== id));
  }

  function toggleExpand(id: string) {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      // Mark as read when expanded
      const vm = voicemails.find((v) => v.id === id);
      if (vm && !vm.is_read) markRead(id);
    }
  }

  if (tier !== "premium") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Voicemails</h1>
          <p className="text-zinc-500 mt-1">Listen to and manage your voicemail messages.</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Lock className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium">Premium Feature</h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-md text-center">
              Voicemail with transcription is available on the Premium plan.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/billing")}>
              Upgrade to Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const unreadCount = voicemails.filter((v) => !v.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Voicemails
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-2 text-xs">{unreadCount} new</Badge>
            )}
          </h1>
          <p className="text-zinc-500 mt-1">Listen to and manage your voicemail messages.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="spam">Spam</option>
          </select>
          <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading && voicemails.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <RefreshCw className="h-8 w-8 text-zinc-400 animate-spin" />
          </CardContent>
        </Card>
      )}

      {!loading && voicemails.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Voicemail className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium">No voicemails</h3>
            <p className="text-sm text-zinc-500 mt-1">
              {filter === "all" ? "You haven't received any voicemails yet." : `No ${filter} voicemails.`}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {voicemails.map((vm) => (
          <Card
            key={vm.id}
            className={`cursor-pointer transition-colors ${
              !vm.is_read ? "border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20" : ""
            }`}
          >
            <CardContent className="p-4">
              <button
                onClick={() => toggleExpand(vm.id)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${vm.is_read ? "bg-transparent" : "bg-blue-500"}`} />
                    <div>
                      <p className="font-medium text-sm flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-zinc-400" />
                        {formatPhone(vm.caller_number)}
                        {vm.is_spam && <Badge variant="destructive" className="text-xs">Spam</Badge>}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
                        {(vm.caller_city || vm.caller_state) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[vm.caller_city, vm.caller_state].filter(Boolean).join(", ")}
                          </span>
                        )}
                        {vm.recording_duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(vm.recording_duration)}
                          </span>
                        )}
                        <span>{new Date(vm.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  {vm.transcription_status === "completed" && (
                    <Badge variant="secondary" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      Transcribed
                    </Badge>
                  )}
                </div>
              </button>

              {expanded === vm.id && (
                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 space-y-3">
                  {/* Audio Player */}
                  {vm.recording_url && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">Recording</p>
                      <audio controls className="w-full" preload="none">
                        <source src={vm.recording_url} type="audio/mpeg" />
                        Your browser does not support audio playback.
                      </audio>
                    </div>
                  )}

                  {/* Transcription */}
                  {vm.transcription && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">Transcription</p>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
                        {vm.transcription}
                      </p>
                    </div>
                  )}
                  {vm.transcription_status === "pending" && (
                    <p className="text-xs text-zinc-400">Transcription in progress...</p>
                  )}
                  {vm.transcription_status === "failed" && (
                    <p className="text-xs text-red-500">Transcription failed.</p>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={(e) => { e.stopPropagation(); deleteVoicemail(vm.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
