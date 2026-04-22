import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getEffectiveTier,
  hasFeature,
  getLimit,
  getRequiredTier,
} from "@/lib/stripe/feature-gate";
import { buildVariantFields } from "@/lib/extension/build-fields";
import { runServerAgent } from "@/lib/auto-apply/server-agent";
import type { Tier } from "@/types/database";

export const maxDuration = 120;

// POST /api/auto-apply/submit  { candidate_id }
// Pro+ server-side execution. Runs a headless browser session driven by Claude
// to fill + submit the application at job_url.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const tier = getEffectiveTier(
    (profile.tier || "free") as Tier,
    profile.tier_override as Tier | null
  );
  if (!hasFeature(tier, "auto_apply_server")) {
    return NextResponse.json(
      {
        error: `Server auto-submit requires the ${getRequiredTier("auto_apply_server")} plan.`,
        upgrade_required: true,
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const candidateId: string | undefined = body?.candidate_id;
  if (!candidateId)
    return NextResponse.json({ error: "candidate_id required" }, { status: 400 });

  // Monthly server-submit cap
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { count: thisMonth } = await supabase
    .from("auto_apply_candidates")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("submit_mode", "server")
    .eq("status", "submitted")
    .gte("updated_at", monthStart.toISOString());
  const cap = getLimit(tier, "auto_apply_server_submits_per_month");
  if ((thisMonth || 0) >= cap) {
    return NextResponse.json(
      { error: `Server submit limit reached (${cap}/month).`, upgrade_required: true },
      { status: 429 }
    );
  }

  const { data: candidate, error: loadErr } = await supabase
    .from("auto_apply_candidates")
    .select(
      "id, variant_id, ai_answers, status, job:job_applications(id, job_url, status, company_name, job_title)"
    )
    .eq("id", candidateId)
    .eq("profile_id", user.id)
    .single();
  if (loadErr || !candidate)
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  const job = Array.isArray(candidate.job) ? candidate.job[0] : candidate.job;
  if (!job?.job_url)
    return NextResponse.json({ error: "Candidate has no job_url" }, { status: 400 });
  if (candidate.status === "submitted")
    return NextResponse.json({ ok: true, already: true });

  let variantData: Record<string, unknown> | null = null;
  if (candidate.variant_id) {
    const { data: v } = await supabase
      .from("profile_variants")
      .select("variant_data")
      .eq("id", candidate.variant_id)
      .single();
    variantData = (v?.variant_data ?? null) as Record<string, unknown> | null;
  }

  const fields = await buildVariantFields(supabase, user.id, profile, variantData);
  const resumePdfUrl = candidate.variant_id
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/autofill/resume.pdf?variant=${candidate.variant_id}`
    : `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/autofill/resume.pdf`;

  const result = await runServerAgent({
    jobUrl: job.job_url,
    profileFields: fields,
    resumePdfUrl,
    aiAnswers: candidate.ai_answers,
  });

  if (result.success) {
    const today = new Date().toISOString().split("T")[0];
    await supabase
      .from("auto_apply_candidates")
      .update({ status: "submitted", submit_mode: "server", error: null })
      .eq("id", candidate.id)
      .eq("profile_id", user.id);
    await supabase
      .from("job_applications")
      .update({ status: "applied", applied_date: today })
      .eq("id", job.id)
      .eq("profile_id", user.id);
    await supabase.from("job_application_events").insert({
      job_application_id: job.id,
      from_status: job.status,
      to_status: "applied",
      notes: "Submitted via auto-apply (server agent)",
    });
  } else {
    await supabase
      .from("auto_apply_candidates")
      .update({
        status: "failed",
        submit_mode: "server",
        error: result.error ?? "unknown error",
      })
      .eq("id", candidate.id)
      .eq("profile_id", user.id);
  }

  await supabase.from("auto_apply_events").insert({
    candidate_id: candidate.id,
    event: result.success ? "submitted" : "failed",
    detail: {
      mode: "server",
      steps: result.steps,
      duration_ms: result.durationMs,
      cost_cents: result.costCents,
      error: result.error,
      trail: result.trail.slice(-20),
    },
  });

  return NextResponse.json({
    ok: result.success,
    error: result.error,
    steps: result.steps,
    duration_ms: result.durationMs,
    cost_cents: result.costCents,
  });
}
