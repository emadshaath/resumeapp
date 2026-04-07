import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchResumeData } from "@/lib/pdf/fetch-resume-data";
import { generateTailoredVariant, applyVariantToResume } from "@/lib/tailor";
import { hasFeature, getLimit, getRequiredTier, getEffectiveTier } from "@/lib/stripe/feature-gate";
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
    };

    const { variant_data, match_score } = await generateTailoredVariant(
      resumeData,
      parsedJob
    );

    // Step 5: Save variant
    const variantName = `${company_name} — ${job_title}`;
    const { data: savedVariant, error: variantError } = await supabase
      .from("profile_variants")
      .insert({
        profile_id: user.id,
        name: variantName.substring(0, 100),
        variant_data,
        match_score,
        job_application_id: jobId,
        source: "extension",
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

// Build profile fields with optional variant overrides
async function buildVariantFields(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  profile: Record<string, unknown>,
  variantData: Record<string, unknown> | null
) {
  const { data: experiences } = await supabase
    .from("experiences")
    .select("*")
    .eq("profile_id", userId)
    .order("start_date", { ascending: false })
    .limit(5);

  const currentJob =
    experiences?.find((e: Record<string, unknown>) => e.is_current) ||
    experiences?.[0];

  const { data: educations } = await supabase
    .from("educations")
    .select("*")
    .eq("profile_id", userId)
    .order("end_date", { ascending: false })
    .limit(3);

  const topEducation = educations?.[0];

  const { data: skills } = await supabase
    .from("skills")
    .select("id, name")
    .eq("profile_id", userId)
    .order("display_order", { ascending: true });

  let yearsExperience = 0;
  if (experiences && experiences.length > 0) {
    const earliest = experiences[experiences.length - 1];
    const start = new Date(earliest.start_date as string);
    yearsExperience = Math.round(
      (Date.now() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
  }

  const educationSummary = topEducation
    ? [topEducation.degree, topEducation.field_of_study, topEducation.institution]
        .filter(Boolean)
        .join(", ")
    : null;

  const skillsSummary = skills?.map((s: Record<string, unknown>) => s.name).join(", ") || null;

  // Parse location
  const locationStr = (profile.location as string) || "";
  const locationParts = locationStr.split(",").map((s: string) => s.trim());
  let city: string | null = null;
  let state: string | null = null;
  let zip_code: string | null = null;

  if (locationParts.length >= 1) city = locationParts[0] || null;
  if (locationParts.length >= 2) {
    const stateZip = locationParts[1].match(
      /^([A-Za-z\s]+?)(?:\s+(\d{5}(?:-\d{4})?))?$/
    );
    if (stateZip) {
      state = stateZip[1]?.trim() || null;
      zip_code = stateZip[2] || null;
    } else {
      state = locationParts[1] || null;
    }
  }

  return {
    first_name: profile.first_name,
    last_name: profile.last_name,
    full_name: `${profile.first_name} ${profile.last_name}`,
    email: profile.email,
    phone: (profile.phone_personal as string) || null,
    website_url: (profile.website_url as string) || null,
    location: profile.location || null,
    city,
    state,
    zip_code,
    headline:
      (variantData?.headline as string) ||
      (profile.headline as string) ||
      null,
    summary: (variantData?.summary as string) || null,
    current_title: (currentJob?.position as string) || null,
    current_company: (currentJob?.company_name as string) || null,
    years_experience: yearsExperience > 0 ? String(yearsExperience) : null,
    education_summary: educationSummary,
    skills_summary: skillsSummary,
    linkedin_url: (profile.linkedin_url as string) || null,
    profile_url: `${process.env.NEXT_PUBLIC_APP_URL}/p/${profile.slug}`,
    // Application preferences
    work_authorization: (profile.work_authorization as string) || null,
    sponsorship_required: (profile.sponsorship_required as string) || null,
    gender_identity: (profile.gender_identity as string) || null,
    pronouns: (profile.pronouns as string) || null,
    race_ethnicity: (profile.race_ethnicity as string) || null,
    veteran_status: (profile.veteran_status as string) || null,
    disability_status: (profile.disability_status as string) || null,
    lgbtq_identity: (profile.lgbtq_identity as string) || null,
    salary_expectation: (profile.salary_expectation as string) || null,
    notice_period: (profile.notice_period as string) || null,
    preferred_work_setting: (profile.preferred_work_setting as string) || null,
    how_heard_default: (profile.how_heard_default as string) || null,
  };
}
