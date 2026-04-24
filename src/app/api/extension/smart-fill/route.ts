import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchResumeData } from "@/lib/pdf/fetch-resume-data";
import { snapshotPdfSettings } from "@/lib/pdf/snapshot";
import { generateTailoredVariant, applyVariantToResume } from "@/lib/tailor";
import { hasFeature, getLimit, getRequiredTier, getEffectiveTier } from "@/lib/stripe/feature-gate";
import { sanitizeJobDescription } from "@/lib/jobs/sanitize-description";
import { buildVariantFields } from "@/lib/extension/build-fields";
import type { Tier } from "@/types/database";

/**
 * POST /api/extension/smart-fill 
 *
 * One-shot endpoint for the Chrome extension Smart Tailor flow:
 * 1. Creates or finds a job application from scraped page data
 * 2. Generates an AI-tailored variant for that job
 * 3. Saves the variant
 * 4. Returns variant-aware profile fields (for form filling) + PDF URL
 *
 * Body: { job_title, company_name, job_url, description?, location?, remote_type? }
 * Returns: { fields, resume_pdf_url, variant_id, match_score, job_id }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile)
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Check tier access (respect tier_override)
  const tier = getEffectiveTier((profile.tier || "free") as Tier, profile.tier_override as Tier | null);
  if (!hasFeature(tier, "smart_apply")) {
    const requiredTier = getRequiredTier("smart_apply");
    return NextResponse.json(
      {
        error: `Smart Tailor requires the ${requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} plan. Your current plan: ${tier}.`,
        upgrade_required: true,
      },
      { status: 403 }
    );
  }

  const body = await req.json();
  const {
    job_title,
    company_name,
    job_url,
    description,
    description_html,
    location,
    remote_type,
  } = body;

  if (!job_title || !company_name) {
    return NextResponse.json(
      { error: "job_title and company_name are required" },
      { status: 400 }
    );
  }

  try {
    // Step 1: Find or create job application
    let jobId: string;
    let existingVariantId: string | null = null;

    if (job_url) {
      const { data: existingJob } = await supabase
        .from("job_applications")
        .select("id, variant_id")
        .eq("profile_id", user.id)
        .eq("job_url", job_url)
        .single();

      if (existingJob) {
        jobId = existingJob.id;
        existingVariantId = existingJob.variant_id;
      } else {
        const sanitizedHtml = description_html
          ? sanitizeJobDescription(description_html)
          : null;

        const { data: newJob, error: jobError } = await supabase
          .from("job_applications")
          .insert({
            profile_id: user.id,
            job_title,
            company_name,
            job_url,
            location: location || null,
            remote_type: remote_type || null,
            parsed_data: description
              ? { description_summary: description }
              : null,
            job_description_html: sanitizedHtml,
            status: "applied",
            source: "extension",
          })
          .select("id")
          .single();

        if (jobError)
          return NextResponse.json(
            { error: jobError.message },
            { status: 500 }
          );
        jobId = newJob.id;
      }
    } else {
      // No URL — always create new
      const sanitizedHtml = description_html
        ? sanitizeJobDescription(description_html)
        : null;

      const { data: newJob, error: jobError } = await supabase
        .from("job_applications")
        .insert({
          profile_id: user.id,
          job_title,
          company_name,
          location: location || null,
          remote_type: remote_type || null,
          parsed_data: description
            ? { description_summary: description }
            : null,
          job_description_html: sanitizedHtml,
          status: "applied",
          source: "extension",
        })
        .select("id")
        .single();

      if (jobError)
        return NextResponse.json(
          { error: jobError.message },
          { status: 500 }
        );
      jobId = newJob.id;
    }

    // Step 2: If this job already has a variant, reuse it
    if (existingVariantId) {
      const { data: existingVariant } = await supabase
        .from("profile_variants")
        .select("id, variant_data, match_score")
        .eq("id", existingVariantId)
        .single();

      if (existingVariant) {
        const fields = await buildVariantFields(
          supabase,
          user.id,
          profile,
          existingVariant.variant_data
        );
        return NextResponse.json({
          fields,
          resume_pdf_url: `/api/autofill/resume.pdf?variant=${existingVariant.id}`,
          variant_id: existingVariant.id,
          match_score: existingVariant.match_score,
          job_id: jobId,
          reused: true,
        });
      }
    }

    // Step 3: Check variant limit before generating
    const { count } = await supabase
      .from("profile_variants")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user.id);

    const max = getLimit(tier, "variants_max");
    if ((count || 0) >= max) {
      // Still return regular profile fields even if at limit
      const fields = await buildVariantFields(supabase, user.id, profile, null);
      return NextResponse.json({
        fields,
        resume_pdf_url: `/api/autofill/resume.pdf`,
        variant_id: null,
        match_score: null,
        job_id: jobId,
        limit_reached: true,
        error: `Variant limit reached (${max}). Using default profile.`,
      });
    }

    // Step 4: Generate AI-tailored variant
    const resumeData = await fetchResumeData(supabase, user.id);
    if (!resumeData)
      return NextResponse.json(
        { error: "Profile data not found" },
        { status: 404 }
      );

    const parsedJob = {
      job_title,
      company_name,
      location: location || null,
      remote_type: remote_type || null,
      description_summary: description || null,
      job_description: description_html
        ? description_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        : null,
    };

    const { variant_data, match_score } = await generateTailoredVariant(
      resumeData,
      parsedJob
    );

    // Step 5: Save variant with frozen resolved_resume + styling snapshot
    const resolvedResume = applyVariantToResume(resumeData, variant_data);
    const pdfSettingsSnapshot = await snapshotPdfSettings(supabase, user.id);
    const variantName = `${company_name} — ${job_title}`;
    const { data: savedVariant, error: variantError } = await supabase
      .from("profile_variants")
      .insert({
        profile_id: user.id,
        name: variantName.substring(0, 100),
        variant_data,
        resolved_resume: resolvedResume,
        match_score,
        job_application_id: jobId,
        source: "ai",
        pdf_settings_snapshot: pdfSettingsSnapshot,
      })
      .select("id")
      .single();

    if (variantError)
      return NextResponse.json(
        { error: variantError.message },
        { status: 500 }
      );

    // Link variant to job
    await supabase
      .from("job_applications")
      .update({ variant_id: savedVariant.id, match_score })
      .eq("id", jobId)
      .eq("profile_id", user.id);

    // Step 6: Build tailored fields for form filling
    const fields = await buildVariantFields(
      supabase,
      user.id,
      profile,
      variant_data as unknown as Record<string, unknown>
    );

    return NextResponse.json({
      fields,
      resume_pdf_url: `/api/autofill/resume.pdf?variant=${savedVariant.id}`,
      variant_id: savedVariant.id,
      match_score,
      job_id: jobId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Smart fill failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

