import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/auto-apply/candidates?status=pending_review
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("auto_apply_candidates")
    .select(
      "id, rule_id, job_application_id, variant_id, match_score, ai_answers, status, submit_mode, error, created_at, updated_at, job:job_applications(id, company_name, job_title, job_url, location, remote_type, parsed_data)"
    )
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ candidates: data });
}
