"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Sparkles,
  ExternalLink,
  Settings,
  CheckCircle2,
  XCircle,
  Zap,
  Target,
  Building2,
  MapPin,
} from "lucide-react";

interface CandidateRow {
  id: string;
  match_score: number | null;
  status: string;
  submit_mode: "extension" | "server" | null;
  ai_answers: { question: string; answer: string }[];
  job: {
    id: string;
    company_name: string;
    job_title: string;
    job_url: string | null;
    location: string | null;
    remote_type: string | null;
  } | null;
}

export default function AutoApplyPage() {
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submittingServer, setSubmittingServer] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/auto-apply/candidates?status=pending_review");
    const data = await res.json();
    if (res.ok) setCandidates(data.candidates || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runDiscover() {
    setDiscovering(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/auto-apply/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(data.error || "Discovery failed");
      } else {
        setStatusMsg(
          `Added ${data.candidates.length} candidates (${data.skipped} skipped). ${data.remaining_budget} slots left this month.`
        );
        await load();
      }
    } finally {
      setDiscovering(false);
    }
  }

  function openViaExtension(c: CandidateRow) {
    if (!c.job?.job_url) return;
    const u = new URL(c.job.job_url);
    u.searchParams.set("rezm_auto_apply", c.id);
    window.open(u.toString(), "_blank", "noopener");
  }

  async function serverSubmit(c: CandidateRow) {
    setSubmittingServer(c.id);
    try {
      const res = await fetch("/api/auto-apply/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_id: c.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(data.error || "Server submit failed");
      } else {
        setStatusMsg(`Submitted ${c.job?.company_name} — ${c.job?.job_title}`);
        await load();
      }
    } finally {
      setSubmittingServer(null);
    }
  }

  async function skip(c: CandidateRow) {
    const res = await fetch(`/api/auto-apply/candidates/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "skipped" }),
    });
    if (res.ok) await load();
  }

  async function saveAnswers(
    candidateId: string,
    answers: { question: string; answer: string }[]
  ) {
    await fetch(`/api/auto-apply/candidates/${candidateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai_answers: answers }),
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Auto-apply queue</h1>
          <p className="text-sm text-muted-foreground">
            AI-drafted applications waiting for your approval.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/auto-apply/rules">
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Rules
            </Button>
          </Link>
          <Button onClick={runDiscover} disabled={discovering} size="sm">
            {discovering ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Discover jobs
          </Button>
        </div>
      </div>

      {statusMsg && (
        <Card>
          <CardContent className="py-3 text-sm">{statusMsg}</CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : candidates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No candidates yet. Create a rule, then click{" "}
            <span className="font-medium">Discover jobs</span>.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {candidates.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">
                      {c.job?.job_title ?? "Untitled"}
                    </CardTitle>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {c.job?.company_name}
                      </span>
                      {c.job?.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {c.job.location}
                        </span>
                      )}
                      {c.job?.remote_type && (
                        <Badge variant="secondary" className="text-[10px]">
                          {c.job.remote_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {typeof c.match_score === "number" && (
                    <div className="flex items-center gap-1 text-sm">
                      <Target className="h-4 w-4 text-emerald-600" />
                      <span className="font-semibold">{c.match_score}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {c.ai_answers.length > 0 && (
                  <button
                    className="mb-3 text-xs font-medium text-blue-600 hover:underline"
                    onClick={() =>
                      setExpandedId(expandedId === c.id ? null : c.id)
                    }
                  >
                    {expandedId === c.id ? "Hide" : "Show"} {c.ai_answers.length}{" "}
                    drafted answer(s)
                  </button>
                )}
                {expandedId === c.id && (
                  <AnswerEditor
                    answers={c.ai_answers}
                    onSave={(answers) => saveAnswers(c.id, answers)}
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => openViaExtension(c)}
                    disabled={!c.job?.job_url}
                  >
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    Open &amp; apply (extension)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => serverSubmit(c)}
                    disabled={submittingServer === c.id || !c.job?.job_url}
                  >
                    {submittingServer === c.id ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="mr-1.5 h-4 w-4" />
                    )}
                    Auto-submit (Pro)
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => skip(c)}>
                    <XCircle className="mr-1.5 h-4 w-4" />
                    Skip
                  </Button>
                  {c.job?.job_url && (
                    <a
                      href={c.job.job_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 self-center text-xs text-muted-foreground hover:underline"
                    >
                      view posting
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        Candidates are drafts. Nothing is submitted without your click.
      </div>
    </div>
  );
}

function AnswerEditor({
  answers,
  onSave,
}: {
  answers: { question: string; answer: string }[];
  onSave: (answers: { question: string; answer: string }[]) => Promise<void>;
}) {
  const [local, setLocal] = useState(answers);
  const [saving, setSaving] = useState(false);
  return (
    <div className="mb-3 space-y-2 rounded-md border bg-muted/30 p-3">
      {local.map((a, i) => (
        <div key={i} className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">{a.question}</div>
          <Textarea
            value={a.answer}
            rows={3}
            onChange={(e) => {
              const next = [...local];
              next[i] = { ...a, answer: e.target.value };
              setLocal(next);
            }}
          />
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave(local);
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
        Save edits
      </Button>
    </div>
  );
}
