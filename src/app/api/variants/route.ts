import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasFeature, getLimit } from "@/lib/stripe/feature-gate";
import type { Tier } from "@/types/database";

// GET /api/variants — List user's variants
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: variants, error } = await supabase
    .from("profile_variants")
    .select("id, name, match_score, source, is_default, job_application_id, created_at, updated_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch linked job info for each variant
  const jobIds = variants
    ?.map((v) => v.job_application_id)
    .filter(Boolean) as string[];

  let jobMap: Record<string, { company_name: string; job_title: string }> = {};
  if (jobIds.length > 0) {
    const { data: jobs } = await supabase
      .from("job_applications")
      .select("id, company_name, job_title")
      .in("id", jobIds);
    if (jobs) {
      jobMap = Object.fromEntries(jobs.map((j) => [j.id, { company_name: j.company_name, job_title: j.job_title }]));
    }
  }

  const enriched = (variants || []).map((v) => ({
    ...v,
    job: v.job_application_id ? jobMap[v.job_application_id] || null : null,
  }));

  return NextResponse.json({ variants: enriched });
}

// POST /api/variants — Save a variant (after generation or manual creation)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  const tier = (profile?.tier || "free") as Tier;
  if (!hasFeature(tier, "profile_variants")) {
    return NextResponse.json({ error: "Upgrade to Pro to save profile variants" }, { status: 403 });
  }

  // Check variant limit
  const { count } = await supabase
    .from("profile_variants")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id);

  const max = getLimit(tier, "variants_max");
  if ((count || 0) >= max) {
    return NextResponse.json({
      error: `You've reached your limit of ${max} variants. Upgrade for more.`,
    }, { status: 403 });
  }

  const body = await req.json();
  const { name, variant_data, match_score, job_application_id, source } = body;

  if (!name || !variant_data) {
    return NextResponse.json({ error: "Name and variant_data are required" }, { status: 400 });
  }

  const { data: variant, error } = await supabase
    .from("profile_variants")
    .insert({
      profile_id: user.id,
      name,
      variant_data,
      match_score: match_score || null,
      job_application_id: job_application_id || null,
      source: source || "manual",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Link variant to job application if provided
  if (job_application_id) {
    await supabase
      .from("job_applications")
      .update({ variant_id: variant.id })
      .eq("id", job_application_id)
      .eq("profile_id", user.id);
  }

  return NextResponse.json({ variant }, { status: 201 });
}
