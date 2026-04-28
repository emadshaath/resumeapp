"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Briefcase,
} from "lucide-react";

// ─── Refresh stale variant ──────────────────────────────────────────────────
// Single-row CTA in the "Needs your attention" panel. Reuses the same
// /api/variants/[id]/refresh endpoint that the variant detail header uses,
// so behavior is identical (re-applies variant_data to current base content,
// preserves blocks_snapshot and pdf_settings_snapshot).
export function RefreshVariantButton({
  variantId,
}: {
  variantId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    const res = await fetch(`/api/variants/${variantId}/refresh`, {
      method: "POST",
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <Button size="sm" onClick={handleClick} disabled={busy}>
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5 mr-1" />
      )}
      Refresh from base
    </Button>
  );
}

// ─── Move job to next status ────────────────────────────────────────────────
// Used for cold screenings/interviews on the dashboard. Forward-only — the
// dashboard's job is to keep the queue moving, not to expose every status
// transition. For backwards moves the user goes to the kanban.
export function MoveToNextButton({
  jobId,
  nextStatus,
  nextLabel,
}: {
  jobId: string;
  nextStatus: string;
  nextLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={busy}>
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
      ) : null}
      Move to {nextLabel}
      <ArrowRight className="h-3.5 w-3.5 ml-1" />
    </Button>
  );
}

// ─── Mark follow-up done ────────────────────────────────────────────────────
// Clears follow_up_date so the job stops appearing in the dashboard queue.
// User can set a new follow-up date from the job drawer if they need one.
export function MarkFollowedUpButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ follow_up_date: null }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={busy}>
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
      )}
      Mark followed up
    </Button>
  );
}

// ─── Apply Faster card ──────────────────────────────────────────────────────
// Tailor flow needs the JobDetailDrawer's diff-review UI, so we deep-link
// into the Job Tracker with the job pre-selected. The drawer's existing
// Smart Tailor section takes over from there. Two clicks instead of five —
// not one-click, but composing 1-click here would mean rebuilding the diff
// editor on the dashboard.
export function ApplyFasterCard({
  jobs,
}: {
  jobs: { id: string; company_name: string; job_title: string }[];
}) {
  if (jobs.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand" />
        <h2 className="text-sm font-semibold">Apply faster</h2>
        <span className="text-xs text-zinc-500">
          {jobs.length} job{jobs.length === 1 ? "" : "s"} ready to tailor
        </span>
      </div>
      <div className="space-y-2">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center justify-between gap-2 rounded-md border border-zinc-100 dark:border-zinc-800/60 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{job.job_title}</p>
              <p className="text-xs text-zinc-500 truncate">{job.company_name}</p>
            </div>
            <Link
              href={`/dashboard/jobs?job=${job.id}`}
              className="shrink-0"
            >
              <Button size="sm" variant="outline">
                <Briefcase className="h-3.5 w-3.5 mr-1" />
                Tailor
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
