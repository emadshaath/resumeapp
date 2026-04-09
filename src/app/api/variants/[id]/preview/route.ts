import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/variants/[id]/preview — Returns frozen resolved_resume + metadata + linked job
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: variant, error } = await supabase
    .from("profile_variants")
    .select("*")
    .eq("id", id)
    .eq("profile_id", user.id)
    .single();

  if (error || !variant) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  // Fetch linked job info (including job_description_html)
  let job = null;
  if (variant.job_application_id) {
    const { data } = await supabase
      .from("job_applications")
      .select(
        "id, company_name, job_title, job_url, status, location, remote_type, salary_min, salary_max, parsed_data, job_description_html"
      )
      .eq("id", variant.job_application_id)
      .single();
    job = data;
  }

  return NextResponse.json({
    variant: {
      id: variant.id,
      name: variant.name,
      match_score: variant.match_score,
      source: variant.source,
      is_default: variant.is_default,
      created_at: variant.created_at,
      variant_data: variant.variant_data,
      resolved_resume: variant.resolved_resume,
    },
    job,
  });
}
