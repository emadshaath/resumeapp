import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLimit, getEffectiveTier } from "@/lib/stripe/feature-gate";
import type { Tier } from "@/types/database";

// GET /api/jobs — List job applications with filters
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "100");

  let query = supabase
    .from("job_applications")
    .select("*")
    .eq("profile_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (search) {
    query = query.or(`company_name.ilike.%${search}%,job_title.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get pipeline counts
  const { data: counts } = await supabase
    .from("job_applications")
    .select("status")
    .eq("profile_id", user.id);

  const pipeline: Record<string, number> = {};
  (counts || []).forEach((row: { status: string }) => {
    pipeline[row.status] = (pipeline[row.status] || 0) + 1;
  });

  return NextResponse.json({ jobs: data, pipeline });
}

// POST /api/jobs — Create a new job application
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, tier_override")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Check tier limit
  const tier = getEffectiveTier(profile.tier as Tier, profile.tier_override as Tier | null);
  const maxJobs = getLimit(tier, "jobs_max");
  const { count } = await supabase
    .from("job_applications")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id);

  if ((count || 0) >= maxJobs) {
    return NextResponse.json(
      { error: `Job tracking limit reached (${maxJobs}). Upgrade your plan for more.` },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { company_name, job_title, job_url, status, location, remote_type, salary_min, salary_max, notes, parsed_data, match_score, source } = body;

  if (!company_name || !job_title) {
    return NextResponse.json({ error: "Company name and job title are required" }, { status: 400 });
  }

  const { data: job, error } = await supabase
    .from("job_applications")
    .insert({
      profile_id: user.id,
      company_name,
      job_title,
      job_url: job_url || null,
      status: status || "saved",
      applied_date: status === "applied" ? new Date().toISOString().split("T")[0] : null,
      location: location || null,
      remote_type: remote_type || null,
      salary_min: salary_min || null,
      salary_max: salary_max || null,
      notes: notes || null,
      parsed_data: parsed_data || {},
      match_score: match_score || null,
      source: source || "manual",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create initial event
  await supabase.from("job_application_events").insert({
    job_application_id: job.id,
    from_status: null,
    to_status: job.status,
    notes: "Job added",
  });

  return NextResponse.json({ job });
}
