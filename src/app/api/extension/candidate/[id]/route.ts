import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildVariantFields } from "@/lib/extension/build-fields";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/extension/candidate/[id]
// Serves pre-drafted fields + AI answers + PDF URL for a review-queue candidate.
// Called by the Chrome extension when a job page is opened with ?rezm_auto_apply=<id>.
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: candidate, error } = await supabase
    .from("auto_apply_candidates")
    .select(
      "id, variant_id, ai_answers, status, job:job_applications(id, job_url, company_name, job_title)"
    )
    .eq("id", id)
    .eq("profile_id", user.id)
    .single();
  if (error || !candidate)
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile)
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  let variantData: Record<string, unknown> | null = null;
  if (candidate.variant_id) {
    const { data: variant } = await supabase
      .from("profile_variants")
      .select("variant_data")
      .eq("id", candidate.variant_id)
      .single();
    variantData = (variant?.variant_data ?? null) as Record<string, unknown> | null;
  }

  const fields = await buildVariantFields(supabase, user.id, profile, variantData);

  const resumePdfUrl = candidate.variant_id
    ? `/api/autofill/resume.pdf?variant=${candidate.variant_id}`
    : `/api/autofill/resume.pdf`;

  return NextResponse.json({
    candidate_id: candidate.id,
    status: candidate.status,
    fields,
    ai_answers: candidate.ai_answers,
    resume_pdf_url: resumePdfUrl,
  });
}
