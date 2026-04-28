import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchBaseResumeModifiedAt } from "@/lib/variants/staleness";
import {
  AlertCircle,
  Clock,
  CalendarClock,
  ArrowRight,
  Sparkles,
  MessageSquare,
  FileText,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import {
  RefreshVariantButton,
  MoveToNextButton,
  MarkFollowedUpButton,
  ApplyFasterCard,
} from "./dashboard-actions";

export const metadata = { title: "Dashboard" };

// Job statuses we treat as "active" for staleness gating. Variants linked to
// jobs in terminal states (accepted/rejected/withdrawn) don't need refresh
// nudges since the user isn't applying with them anymore.
const ACTIVE_JOB_STATUSES = new Set([
  "saved",
  "applied",
  "screening",
  "interview",
  "offer",
]);

// Pipeline columns we render in the strip, in the order they flow.
const PIPELINE_COLUMNS = [
  { key: "saved", label: "Saved" },
  { key: "applied", label: "Applied" },
  { key: "screening", label: "Screening" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
] as const;

// Forward transitions used by "Move to next" CTAs in Needs Your Attention.
// Mirrors the kanban's getNextStatus rules.
const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  saved: { status: "applied", label: "Applied" },
  applied: { status: "screening", label: "Screening" },
  screening: { status: "interview", label: "Interview" },
  interview: { status: "offer", label: "Offer" },
};

// Days a job can sit in screening/interview before it shows up as a cold lead.
const COLD_DAYS_THRESHOLD = 7;

function daysAgo(timestamp: string): number {
  const ms = Date.now() - new Date(timestamp).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// Compact relative timestamps for the activity feed. Server-rendered, so
// "now" is the request time — close enough for a list that refreshes on
// every navigation. Skips the "in the future" branch since every
// timestamp here is historical by construction.
function formatRelativeTime(timestamp: string): string {
  const ms = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(ms / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile && !profile.onboarding_completed) {
    redirect("/dashboard/onboarding");
  }

  if (!profile) {
    // Auto-create profile if it doesn't exist (trigger may have failed)
    const firstName = user.user_metadata?.first_name || user.email?.split("@")[0] || "User";
    const lastName = user.user_metadata?.last_name || "";
    const slug = user.user_metadata?.slug || firstName.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      slug,
      first_name: firstName,
      last_name: lastName,
      email: user.email!,
    });

    if (insertError) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="text-xl font-semibold">Setting up your profile...</h2>
          <p className="mt-2 text-zinc-500">There was an issue creating your profile. Please try refreshing.</p>
        </div>
      );
    }

    redirect("/dashboard");
  }

  // Window for the Recent Activity feed. Anything older than this is
  // forgotten — a 3-week-old status change isn't activity, it's history.
  const ACTIVITY_DAYS = 14;
  const activitySince = new Date(
    Date.now() - ACTIVITY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  // The "This Week" strip needs delta comparisons, so we fetch both the
  // current and prior 7-day windows. Activity-feed window covers both.
  const weekStart = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Parallel fetch — none of these depend on each other.
  const [
    sectionResult,
    jobsResult,
    variantsResult,
    baseModifiedAt,
    commentsResult,
    pageViewsResult,
  ] = await Promise.all([
    supabase
      .from("resume_sections")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user.id),
    supabase
      .from("job_applications")
      .select("id, company_name, job_title, status, variant_id, updated_at, follow_up_date")
      .eq("profile_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("profile_variants")
      .select("id, name, job_application_id, is_default, updated_at, created_at")
      .eq("profile_id", user.id),
    fetchBaseResumeModifiedAt(supabase, user.id),
    supabase
      .from("review_comments")
      .select("id, comment_text, reviewer_name, created_at")
      .eq("profile_id", user.id)
      .gte("created_at", activitySince)
      .order("created_at", { ascending: false })
      .limit(10),
    // Just viewed_at — we count rows in JS to compute current vs prior
    // week. Fetching IDs would double the row size; we don't need them.
    supabase
      .from("page_views")
      .select("viewed_at")
      .eq("profile_id", user.id)
      .gte("viewed_at", activitySince),
  ]);

  const sectionCount = sectionResult.count || 0;
  const jobs = jobsResult.data || [];
  const variants = variantsResult.data || [];
  const recentComments = commentsResult.data || [];
  const pageViewRows = pageViewsResult.data || [];

  // Job-status events depend on the jobs[] list (we need the IDs first to
  // scope the query), so it's a second-stage fetch. Cheap — single index
  // hit on job_application_id IN (...).
  const jobIds = jobs.map((j) => j.id);
  const eventsResult = jobIds.length > 0
    ? await supabase
        .from("job_application_events")
        .select("id, job_application_id, from_status, to_status, created_at")
        .in("job_application_id", jobIds)
        .gte("created_at", activitySince)
        .order("created_at", { ascending: false })
        .limit(15)
    : { data: [] as { id: string; job_application_id: string; from_status: string | null; to_status: string; created_at: string }[] };
  const recentEvents = eventsResult.data || [];

  // Pipeline counts — single pass over jobs so we don't need a separate
  // aggregate query.
  const pipeline: Record<string, number> = {};
  for (const job of jobs) pipeline[job.status] = (pipeline[job.status] || 0) + 1;

  // Active applications headline number for the welcome banner.
  const activeCount = jobs.filter((j) => ACTIVE_JOB_STATUSES.has(j.status)).length;

  // ── Needs your attention rows ──────────────────────────────────────────
  // Computed server-side so the page hydrates already in the right state.
  // Three sources:
  //   1. Stale variants whose linked job is still active
  //   2. Cold screenings/interviews (no movement in 7+ days)
  //   3. Follow-ups due today or earlier
  type AttentionRow =
    | {
        kind: "stale-variant";
        variantId: string;
        variantName: string;
        jobTitle: string;
        company: string;
        jobStatus: string;
      }
    | {
        kind: "cold-job";
        jobId: string;
        jobTitle: string;
        company: string;
        jobStatus: string;
        daysIdle: number;
      }
    | {
        kind: "follow-up";
        jobId: string;
        jobTitle: string;
        company: string;
        followUpDate: string;
      };

  const attentionRows: AttentionRow[] = [];

  // (1) Stale variants linked to active jobs.
  if (baseModifiedAt) {
    const baseTime = new Date(baseModifiedAt).getTime();
    const jobById = new Map(jobs.map((j) => [j.id, j]));
    for (const variant of variants) {
      const variantTime = new Date(
        variant.updated_at || variant.created_at
      ).getTime();
      if (variantTime >= baseTime) continue;
      if (!variant.job_application_id) continue;
      const job = jobById.get(variant.job_application_id);
      if (!job || !ACTIVE_JOB_STATUSES.has(job.status)) continue;
      attentionRows.push({
        kind: "stale-variant",
        variantId: variant.id,
        variantName: variant.name,
        jobTitle: job.job_title,
        company: job.company_name,
        jobStatus: job.status,
      });
    }
  }

  // (2) Cold screenings/interviews.
  for (const job of jobs) {
    if (job.status !== "screening" && job.status !== "interview") continue;
    const idle = daysAgo(job.updated_at);
    if (idle < COLD_DAYS_THRESHOLD) continue;
    attentionRows.push({
      kind: "cold-job",
      jobId: job.id,
      jobTitle: job.job_title,
      company: job.company_name,
      jobStatus: job.status,
      daysIdle: idle,
    });
  }

  // (3) Follow-ups due today or earlier.
  const today = new Date().toISOString().slice(0, 10);
  for (const job of jobs) {
    if (!job.follow_up_date) continue;
    if (job.follow_up_date > today) continue;
    if (!ACTIVE_JOB_STATUSES.has(job.status)) continue;
    attentionRows.push({
      kind: "follow-up",
      jobId: job.id,
      jobTitle: job.job_title,
      company: job.company_name,
      followUpDate: job.follow_up_date,
    });
  }

  // Cap the panel to keep the surface scannable.
  const attentionDisplayed = attentionRows.slice(0, 5);
  const attentionOverflow = attentionRows.length - attentionDisplayed.length;

  // ── Apply Faster: jobs with no variant yet ─────────────────────────────
  const applyFasterJobs = jobs
    .filter(
      (j) =>
        (j.status === "saved" || j.status === "applied") && !j.variant_id
    )
    .slice(0, 3)
    .map((j) => ({
      id: j.id,
      company_name: j.company_name,
      job_title: j.job_title,
    }));

  // ── Recent Activity feed ───────────────────────────────────────────────
  // Union of three sources (status changes, variant creations, reviewer
  // comments), sorted by timestamp desc, capped at 5. Hidden entirely when
  // fewer than 3 events surface — empty activity is depressing, not
  // informative. The first JobApplicationEvent for a brand-new job (its
  // initial "Job added" creation event) is intentionally suppressed: the
  // creation is already implicit in the user adding the job, and showing
  // it doubles up with the kanban Saved column.
  type ActivityItem = {
    timestamp: string;
    kind: "status" | "variant" | "comment";
    text: string;
    href: string;
  };

  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const activityItems: ActivityItem[] = [];

  for (const ev of recentEvents) {
    if (!ev.from_status) continue; // initial creation, skip
    const job = jobById.get(ev.job_application_id);
    if (!job) continue;
    activityItems.push({
      timestamp: ev.created_at,
      kind: "status",
      text: `${job.company_name} moved to ${ev.to_status}`,
      href: `/dashboard/jobs?job=${job.id}`,
    });
  }

  for (const variant of variants) {
    if (variant.created_at < activitySince) continue;
    activityItems.push({
      timestamp: variant.created_at,
      kind: "variant",
      text: `Variant "${variant.name}" created`,
      href: `/dashboard/variants/${variant.id}`,
    });
  }

  for (const comment of recentComments) {
    const reviewer = comment.reviewer_name || "Anonymous reviewer";
    activityItems.push({
      timestamp: comment.created_at,
      kind: "comment",
      text: `${reviewer} left a review comment`,
      href: "/dashboard/reviews",
    });
  }

  activityItems.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  const activityDisplayed = activityItems.slice(0, 5);
  const showActivity = activityItems.length >= 3;

  // ── This Week numbers ──────────────────────────────────────────────────
  // Vanity-but-motivating snapshot. Four numbers, each with a delta vs the
  // prior 7-day window. Hidden when all four are zero AND all four prior
  // values are also zero — quiet weeks should stay quiet, not announce a
  // run of nothing.
  type WeekTile = {
    label: string;
    current: number;
    delta: number; // current - prior
  };

  // Status events: count transitions where to_status matches, scoped to
  // current vs prior week. Skips initial "Job added" creations
  // (from_status null) so that adding a Saved job doesn't inflate the
  // "Applied" count.
  function countEvents(
    statuses: Set<string>,
    sinceISO: string,
    untilISO: string
  ): number {
    let n = 0;
    for (const ev of recentEvents) {
      if (!ev.from_status) continue;
      if (!statuses.has(ev.to_status)) continue;
      if (ev.created_at < sinceISO) continue;
      if (ev.created_at >= untilISO) continue;
      n++;
    }
    return n;
  }

  const nowISO = new Date().toISOString();
  const APPLIED = new Set(["applied"]);
  const INTERVIEWS = new Set(["screening", "interview"]);

  const appliedThisWeek = countEvents(APPLIED, weekStart, nowISO);
  const appliedPriorWeek = countEvents(APPLIED, activitySince, weekStart);
  const interviewsThisWeek = countEvents(INTERVIEWS, weekStart, nowISO);
  const interviewsPriorWeek = countEvents(INTERVIEWS, activitySince, weekStart);

  const variantsThisWeek = variants.filter(
    (v) => v.created_at >= weekStart
  ).length;
  const variantsPriorWeek = variants.filter(
    (v) => v.created_at >= activitySince && v.created_at < weekStart
  ).length;

  const viewsThisWeek = pageViewRows.filter(
    (r) => r.viewed_at >= weekStart
  ).length;
  const viewsPriorWeek = pageViewRows.filter(
    (r) => r.viewed_at >= activitySince && r.viewed_at < weekStart
  ).length;

  const weekTiles: WeekTile[] = [
    { label: "Applied", current: appliedThisWeek, delta: appliedThisWeek - appliedPriorWeek },
    { label: "Interviews", current: interviewsThisWeek, delta: interviewsThisWeek - interviewsPriorWeek },
    { label: "Variants", current: variantsThisWeek, delta: variantsThisWeek - variantsPriorWeek },
    { label: "Profile views", current: viewsThisWeek, delta: viewsThisWeek - viewsPriorWeek },
  ];
  const showWeekTiles = weekTiles.some((t) => t.current > 0 || t.delta !== 0);

  // ── Default variant ────────────────────────────────────────────────────
  // The variant the user uses when no per-job tailoring exists. Shows the
  // active default + the date it was last edited so the user can spot a
  // dusty default before sending it out. If no default is set, prompt the
  // user to pick one (single-CTA empty state, only when they actually have
  // variants).
  const defaultVariant = variants.find((v) => v.is_default) || null;

  // ── Upcoming follow-ups (next 7 days, look-ahead) ──────────────────────
  // Distinct from the "due today / overdue" rows in Needs Your Attention —
  // those nag, these forecast. Capped at 3.
  const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const todayDate = new Date().toISOString().slice(0, 10);
  const upcomingFollowUps = jobs
    .filter(
      (j) =>
        j.follow_up_date &&
        j.follow_up_date > todayDate &&
        j.follow_up_date <= sevenDaysOut &&
        ACTIVE_JOB_STATUSES.has(j.status)
    )
    .sort((a, b) => (a.follow_up_date! < b.follow_up_date! ? -1 : 1))
    .slice(0, 3);

  // ── Resume Health checks ───────────────────────────────────────────────
  // Diagnostic snapshot at the bottom of the page, collapsed by default
  // since it's not action-driving for users who already shipped their
  // profile. Each row is a single boolean; we don't grade severity.
  const healthChecks: { label: string; done: boolean; href: string }[] = [
    { label: "Profile published", done: profile.is_published, href: "/dashboard/public-profile" },
    { label: "Headline set", done: !!profile.headline, href: "/dashboard/profile" },
    { label: "Profile photo uploaded", done: !!profile.avatar_url, href: "/dashboard/profile" },
    { label: "LinkedIn URL added", done: !!profile.linkedin_url, href: "/dashboard/profile" },
    { label: "At least one resume section", done: sectionCount > 0, href: "/dashboard/sections" },
    { label: "Default variant chosen", done: !!defaultVariant, href: "/dashboard/variants" },
  ];
  const healthScore = healthChecks.filter((c) => c.done).length;

  // ── Quick Start visibility ─────────────────────────────────────────────
  // Auto-hide once all three steps are complete; returning users should
  // not see this card at all.
  const quickStartSteps = [
    { done: !!profile.headline, label: "Add a professional headline", href: "/dashboard/profile" },
    { done: sectionCount > 0, label: "Add at least one resume section", href: "/dashboard/sections" },
    { done: profile.is_published, label: "Publish your profile", href: "/dashboard/public-profile" },
  ];
  const quickStartIncomplete = quickStartSteps.some((s) => !s.done);

  // Welcome banner subline — dynamic if the user has any activity, generic
  // fallback otherwise. Suppresses noise on day-1 accounts.
  const welcomeSubline =
    activeCount > 0
      ? `${activeCount} active application${activeCount === 1 ? "" : "s"}` +
        (attentionRows.length > 0
          ? ` · ${attentionRows.length} need${attentionRows.length === 1 ? "s" : ""} attention`
          : "")
      : "Welcome to your job-hunt dashboard.";

  return (
    <div className="space-y-6">
      {/* Welcome banner — name + dynamic state, no duplicate publish chrome.
          The Live/Draft indicator and "View profile" button moved to the
          sidebar (Eye/EyeOff icon) and the dedicated Public Profile page. */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {profile.first_name}
        </h1>
        <p className="text-zinc-500 mt-1">{welcomeSubline}</p>
      </div>

      {/* Pipeline strip — replaces the four passive stat tiles with one
          row of decision-relevant numbers. Each segment links to its
          kanban column so users can drill in directly. */}
      {jobs.length > 0 && (
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-5 gap-2 sm:gap-4">
              {PIPELINE_COLUMNS.map((col) => {
                const count = pipeline[col.key] || 0;
                return (
                  <Link
                    key={col.key}
                    href="/dashboard/jobs"
                    className={`block rounded-md px-2 py-2 text-center transition-colors ${
                      count > 0
                        ? "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        : "opacity-50"
                    }`}
                  >
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-[10px] uppercase tracking-wide text-zinc-500 mt-0.5">
                      {col.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* This week — vanity but motivating. Four small tiles in a single
          horizontal strip. Hidden entirely when nothing happened in
          either window — quiet weeks should stay quiet. */}
      {showWeekTiles && (
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xs uppercase tracking-wide text-zinc-500 font-medium">
                This week
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {weekTiles.map((tile) => (
                <div
                  key={tile.label}
                  className="rounded-md px-2 py-2"
                >
                  <div className="text-2xl font-bold">{tile.current}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1.5">
                    <span>{tile.label}</span>
                    {tile.delta !== 0 && (
                      <span
                        className={
                          tile.delta > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-zinc-400"
                        }
                      >
                        {tile.delta > 0 ? "↑" : "↓"}
                        {Math.abs(tile.delta)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Needs your attention — converged action queue. Empty state is a
          single line so the absence of items reads as a positive signal,
          not a void. */}
      {attentionRows.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Needs your attention
              <Badge variant="secondary" className="text-[10px]">
                {attentionRows.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {attentionDisplayed.map((row, i) => (
              <AttentionRowView key={`${row.kind}-${i}`} row={row} />
            ))}
            {attentionOverflow > 0 && (
              <p className="text-xs text-zinc-500 pt-1">
                +{attentionOverflow} more —{" "}
                <Link href="/dashboard/jobs" className="underline">
                  see all
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      ) : jobs.length > 0 ? (
        <p className="text-sm text-zinc-500 px-1">
          Nothing needs your attention. Nice work.
        </p>
      ) : null}

      {/* Apply faster — hidden entirely when there are no qualifying
          jobs (per the agent's guidance: empty panels are noise). */}
      <ApplyFasterCard jobs={applyFasterJobs} />

      {/* Default variant — utility card for the resume the user sends out
          when there's no per-job tailoring. Stays present whenever the
          user has at least one variant; renders an "unset" state if no
          default is chosen so the prompt to pick one is the only CTA. */}
      {variants.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-zinc-500" />
              Default variant
            </CardTitle>
          </CardHeader>
          <CardContent>
            {defaultVariant ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {defaultVariant.name}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Last edited{" "}
                    {formatRelativeTime(
                      defaultVariant.updated_at || defaultVariant.created_at
                    )}
                  </p>
                </div>
                <Link
                  href={`/dashboard/variants/${defaultVariant.id}`}
                  className="shrink-0 text-sm underline underline-offset-2 hover:text-zinc-900"
                >
                  Open
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-zinc-500">
                  No default variant set. Pick one to make tailoring faster.
                </p>
                <Link
                  href="/dashboard/variants"
                  className="shrink-0 text-sm underline underline-offset-2 hover:text-zinc-900"
                >
                  Choose
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upcoming follow-ups — forecast view, distinct from the "due today"
          rows in Needs Your Attention. Looks at the next 7 days only;
          anything farther out lives in the kanban / job drawer. Hidden
          when zero. */}
      {upcomingFollowUps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-zinc-500" />
              Upcoming follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingFollowUps.map((job) => (
              <Link
                key={job.id}
                href={`/dashboard/jobs?job=${job.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-zinc-100 dark:border-zinc-800/60 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {job.company_name}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {job.job_title}
                  </p>
                </div>
                <span className="text-xs text-zinc-500 shrink-0">
                  {job.follow_up_date}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent activity — answers "what changed since I was last here?"
          Hidden when fewer than 3 events surface in the last 14 days;
          empty activity is depressing, not informative. */}
      {showActivity && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {activityDisplayed.map((item, i) => (
              <Link
                key={`${item.kind}-${i}-${item.timestamp}`}
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  {item.kind === "status" && (
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  )}
                  {item.kind === "variant" && (
                    <Sparkles className="h-3.5 w-3.5 text-brand shrink-0" />
                  )}
                  {item.kind === "comment" && (
                    <MessageSquare className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  )}
                  <span className="truncate">{item.text}</span>
                </span>
                <span className="text-xs text-zinc-400 shrink-0">
                  {formatRelativeTime(item.timestamp)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Resume Health — diagnostic snapshot collapsed by default. Lives
          at the bottom because it's reference, not action: most returning
          users won't open it, and that's correct. Native <details> is
          enough; we're not animating the disclosure. */}
      <details className="group rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex items-center justify-between cursor-pointer list-none p-4 select-none">
          <span className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-zinc-500" />
            Resume health
            <span className="text-xs text-zinc-500 font-normal">
              {healthScore}/{healthChecks.length} checks passing
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-zinc-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4 space-y-1.5">
          {healthChecks.map((check) => (
            <Link
              key={check.label}
              href={check.href}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <div
                className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                  check.done
                    ? "border-green-500 bg-green-500"
                    : "border-zinc-300 dark:border-zinc-600"
                }`}
              >
                {check.done && (
                  <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span
                className={
                  check.done ? "text-zinc-500" : "text-zinc-900 dark:text-zinc-100"
                }
              >
                {check.label}
              </span>
            </Link>
          ))}
        </div>
      </details>

      {/* Quick Start — only rendered while at least one step is incomplete.
          Returning users with everything checked off never see this card. */}
      {quickStartIncomplete && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>Complete these steps to launch your profile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quickStartSteps.map((step) => (
                <Link
                  key={step.label}
                  href={step.href}
                  className="flex items-center gap-3 rounded-md border border-zinc-200 px-4 py-3 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 transition-colors"
                >
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      step.done
                        ? "border-green-500 bg-green-500"
                        : "border-zinc-300 dark:border-zinc-600"
                    }`}
                  >
                    {step.done && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={step.done ? "text-zinc-400 line-through" : ""}>{step.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Attention row renderer ───────────────────────────────────────────────
// Inline component so the page stays one file. Each row carries its own
// inline CTA from dashboard-actions.tsx — clicking it resolves the row
// and (via router.refresh in the client component) shrinks the panel.
function AttentionRowView({
  row,
}: {
  row:
    | {
        kind: "stale-variant";
        variantId: string;
        variantName: string;
        jobTitle: string;
        company: string;
        jobStatus: string;
      }
    | {
        kind: "cold-job";
        jobId: string;
        jobTitle: string;
        company: string;
        jobStatus: string;
        daysIdle: number;
      }
    | {
        kind: "follow-up";
        jobId: string;
        jobTitle: string;
        company: string;
        followUpDate: string;
      };
}) {
  if (row.kind === "stale-variant") {
    return (
      <div className="flex items-start justify-between gap-3 rounded-md border border-zinc-100 dark:border-zinc-800/60 px-3 py-2.5">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm">
              <span className="font-medium">&ldquo;{row.variantName}&rdquo;</span>{" "}
              variant is out of sync with your base resume
            </p>
            <p className="text-xs text-zinc-500 mt-0.5 truncate">
              Linked job in {row.jobStatus} · {row.jobTitle} at {row.company}
            </p>
          </div>
        </div>
        <RefreshVariantButton variantId={row.variantId} />
      </div>
    );
  }

  if (row.kind === "cold-job") {
    const next = NEXT_STATUS[row.jobStatus];
    return (
      <div className="flex items-start justify-between gap-3 rounded-md border border-zinc-100 dark:border-zinc-800/60 px-3 py-2.5">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm">
              <span className="font-medium">{row.company}</span> {row.jobStatus}{" "}
              — no movement in {row.daysIdle} days
            </p>
            <p className="text-xs text-zinc-500 mt-0.5 truncate">
              {row.jobTitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {next && (
            <MoveToNextButton
              jobId={row.jobId}
              nextStatus={next.status}
              nextLabel={next.label}
            />
          )}
          <Link href={`/dashboard/jobs?job=${row.jobId}`}>
            <span className="text-xs text-zinc-500 hover:text-zinc-900 underline underline-offset-2">
              Open
            </span>
          </Link>
        </div>
      </div>
    );
  }

  // follow-up
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-zinc-100 dark:border-zinc-800/60 px-3 py-2.5">
      <div className="flex items-start gap-2 min-w-0 flex-1">
        <CalendarClock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm">
            <span className="font-medium">{row.company}</span> follow-up due
          </p>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">
            {row.jobTitle} · scheduled for {row.followUpDate}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <MarkFollowedUpButton jobId={row.jobId} />
        <Link href={`/dashboard/jobs?job=${row.jobId}`}>
          <span className="text-xs text-zinc-500 hover:text-zinc-900 underline underline-offset-2">
            Open
          </span>
        </Link>
      </div>
    </div>
  );
}
