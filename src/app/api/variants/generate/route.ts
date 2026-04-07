import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchResumeData } from "@/lib/pdf/fetch-resume-data";
import { generateTailoredVariant } from "@/lib/tailor";
import { hasFeature, getRequiredTier, getEffectiveTier } from "@/lib/stripe/feature-gate";
import type { Tier } from "@/types/database";

// POST /api/variants/generate — AI generates a tailored variant for a job
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, tier_override")
    .eq("id", user.id)
    .single();

  const tier = getEffectiveTier((profile?.tier || "free") as Tier, profile?.tier_override as Tier | null);
  if (!hasFeature(tier, "smart_apply")) {
    const requiredTier = getRequiredTier("smart_apply");
    return NextResponse.json({
      error: `Smart Tailor requires the ${requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} plan. Your current plan: ${tier}.`,
    }, { status: 403 });
  }

  const { job_application_id } = await req.json();
  if (!job_application_id) {
    return NextResponse.json({ error: "job_application_id is required" }, { status: 400 });
  }

  // Fetch the job application with parsed data
  const { data: job } = await supabase
    .from("job_applications")
    .select("*")
    .eq("id", job_application_id)
    .eq("profile_id", user.id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Job application not found" }, { status: 404 });
  }

  // Fetch full resume data
  const resumeData = await fetchResumeData(supabase, user.id);
  if (!resumeData) {
    return NextResponse.json({ error: "Profile data not found" }, { status: 404 });
  }

  // Build parsed job data from the job application
  const parsedJob = {
    job_title: job.job_title,
    company_name: job.company_name,
    location: job.location,
    remote_type: job.remote_type,
    ...(job.parsed_data || {}),
  };

  try {
    const { variant_data, match_score } = await generateTailoredVariant(
      resumeData,
      parsedJob
    );

    // Update the job application match_score
    await supabase
      .from("job_applications")
      .update({ match_score })
      .eq("id", job_application_id)
      .eq("profile_id", user.id);

    return NextResponse.json({
      variant_data,
      match_score,
      job: {
        id: job.id,
        company_name: job.company_name,
        job_title: job.job_title,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI tailoring failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
