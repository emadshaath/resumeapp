import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  hasFeature,
  getLimit,
  getEffectiveTier,
  getRequiredTier,
} from "@/lib/stripe/feature-gate";
import { discoverJobs } from "@/lib/scrape";
import type { JobSource } from "@/lib/scrape/types";
import { matchRule, extractScreenerQuestions } from "@/lib/auto-apply/matcher";
import { draftAnswers } from "@/lib/auto-apply/answer-questions";
import { fetchResumeData } from "@/lib/pdf/fetch-resume-data";
import { generateTailoredVariant, applyVariantToResume } from "@/lib/tailor";
import { sanitizeJobDescription } from "@/lib/jobs/sanitize-description";
import type { Tier, AutoApplyRule } from "@/types/database";

// POST /api/auto-apply/discover
// Runs enabled rules for the authed user: scrapes sources, filters, scores via
// Claude (generateTailoredVariant), persists candidates + pre-drafted answers.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, tier_override")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const tier = getEffectiveTier(
    (profile.tier || "free") as Tier,
    profile.tier_override as Tier | null
  );
  if (!hasFeature(tier, "auto_apply")) {
    return NextResponse.json(
      {
        error: `Auto-apply requires the ${getRequiredTier("auto_apply")} plan.`,
        upgrade_required: true,
      },
      { status: 403 }
    );
  }

  // Optional single-rule execution via body.rule_id
  const body = await req.json().catch(() => ({}));
  const ruleId: string | undefined = body?.rule_id;

  const rulesQuery = supabase
    .from("auto_apply_rules")
    .select("*")
    .eq("profile_id", user.id)
    .eq("enabled", true);
  if (ruleId) rulesQuery.eq("id", ruleId);

  const { data: rules, error: rulesErr } = await rulesQuery;
  if (rulesErr) return NextResponse.json({ error: rulesErr.message }, { status: 500 });
  if (!rules || rules.length === 0) {
    return NextResponse.json(
      { error: "No enabled auto-apply rules. Create one first." },
      { status: 400 }
    );
  }

  // Monthly cap
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { count: thisMonthCount } = await supabase
    .from("auto_apply_candidates")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .gte("created_at", monthStart.toISOString());
  const monthlyCap = getLimit(tier, "auto_applies_per_month");
  const remainingBudget = Math.max(0, monthlyCap - (thisMonthCount || 0));
  if (remainingBudget === 0) {
    return NextResponse.json(
      {
        error: `Monthly auto-apply limit reached (${monthlyCap}).`,
        upgrade_required: true,
      },
      { status: 429 }
    );
  }

  // Preload resume once (Claude scoring is expensive; fetch before the loop)
  const resumeData = await fetchResumeData(supabase, user.id);
  if (!resumeData)
    return NextResponse.json({ error: "Profile data not found" }, { status: 404 });

  const createdCandidates: Array<{ id: string; job_title: string; company_name: string }> = [];
  let drafted = 0;
  let skipped = 0;

  for (const ruleRow of rules as AutoApplyRule[]) {
    if (createdCandidates.length >= remainingBudget) break;

    // Scrape
    const jobs = await discoverJobs({
      sources: ruleRow.sources as JobSource[],
      userSlugs: ruleRow.company_slugs,
      maxPerSource: 50,
    });

    for (const job of jobs) {
      if (createdCandidates.length >= remainingBudget) break;

      const pre = matchRule(job, ruleRow);
      if (!pre.matches) {
        skipped++;
        continue;
      }

      // De-dupe: if we already have a job_application with this url for this user, skip
      const { data: existingApp } = await supabase
        .from("job_applications")
        .select("id")
        .eq("profile_id", user.id)
        .eq("job_url", job.job_url)
        .maybeSingle();
      if (existingApp) {
        skipped++;
        continue;
      }

      // AI match score via existing tailor
      let variantData: Record<string, unknown> | null = null;
      let matchScore = 0;
      try {
        const tailored = await generateTailoredVariant(resumeData, {
          job_title: job.job_title,
          company_name: job.company_name,
          location: job.location,
          remote_type: job.remote_type,
          description_summary: null,
          job_description: job.description_text,
        });
        variantData = tailored.variant_data as unknown as Record<string, unknown>;
        matchScore = tailored.match_score;
      } catch (err) {
        console.warn("[discover] tailor failed", err);
        skipped++;
        continue;
      }

      if (matchScore < ruleRow.min_match_score) {
        skipped++;
        continue;
      }

      // Persist job_applications row (source=agent)
      const sanitizedHtml = job.description_html
        ? sanitizeJobDescription(job.description_html)
        : null;
      const { data: newJob, error: jobErr } = await supabase
        .from("job_applications")
        .insert({
          profile_id: user.id,
          job_title: job.job_title,
          company_name: job.company_name,
          job_url: job.job_url,
          location: job.location,
          remote_type: job.remote_type,
          parsed_data: { source: job.source, external_id: job.external_id },
          job_description_html: sanitizedHtml,
          status: "saved",
          source: "agent",
          match_score: matchScore,
        })
        .select("id")
        .single();
      if (jobErr || !newJob) {
        skipped++;
        continue;
      }

      // Save variant
      let variantId: string | null = null;
      if (variantData) {
        const resolvedResume = applyVariantToResume(
          resumeData,
          variantData as unknown as import("@/types/database").VariantData
        );
        const { data: savedVariant } = await supabase
          .from("profile_variants")
          .insert({
            profile_id: user.id,
            name: `${job.company_name} — ${job.job_title}`.substring(0, 100),
            variant_data: variantData,
            resolved_resume: resolvedResume,
            match_score: matchScore,
            job_application_id: newJob.id,
            source: "ai",
          })
          .select("id")
          .single();
        variantId = savedVariant?.id ?? null;
        if (variantId) {
          await supabase
            .from("job_applications")
            .update({ variant_id: variantId })
            .eq("id", newJob.id)
            .eq("profile_id", user.id);
        }
      }

      // Draft answers if we can detect screener questions
      let answers: { question: string; answer: string }[] = [];
      const questions = extractScreenerQuestions(job.description_text);
      if (questions.length > 0) {
        try {
          answers = await draftAnswers(
            resumeData,
            job.job_title,
            job.company_name,
            job.description_text ?? "",
            questions
          );
          drafted++;
        } catch (err) {
          console.warn("[discover] draftAnswers failed", err);
        }
      }

      const { data: candidate, error: candErr } = await supabase
        .from("auto_apply_candidates")
        .insert({
          profile_id: user.id,
          rule_id: ruleRow.id,
          job_application_id: newJob.id,
          variant_id: variantId,
          match_score: matchScore,
          ai_answers: answers,
          status: "pending_review",
        })
        .select("id")
        .single();

      if (candErr || !candidate) {
        skipped++;
        continue;
      }

      await supabase.from("auto_apply_events").insert({
        candidate_id: candidate.id,
        event: "discovered",
        detail: { source: job.source, match_score: matchScore, answers_drafted: answers.length },
      });

      createdCandidates.push({
        id: candidate.id,
        job_title: job.job_title,
        company_name: job.company_name,
      });
    }
  }

  return NextResponse.json({
    candidates: createdCandidates,
    drafted_answers: drafted,
    skipped,
    remaining_budget: remainingBudget - createdCandidates.length,
  });
}
