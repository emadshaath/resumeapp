import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchResumeData } from "@/lib/pdf/fetch-resume-data";
import { applyVariantToResume } from "@/lib/tailor";
import type { VariantData } from "@/types/database";

// POST /api/variants/[id]/refresh — Re-applies the variant's variant_data
// to the user's current base resume content, producing a fresh
// resolved_resume snapshot. Layout (blocks_snapshot) and PDF styling
// (pdf_settings_snapshot) are preserved on purpose — only content drift
// is reconciled here. Updated_at bumps so staleness checks reset.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: variant, error } = await supabase
    .from("profile_variants")
    .select("id, variant_data")
    .eq("id", id)
    .eq("profile_id", user.id)
    .single();

  if (error || !variant) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  const resumeData = await fetchResumeData(supabase, user.id);
  if (!resumeData) {
    return NextResponse.json(
      { error: "No base resume to refresh from" },
      { status: 400 }
    );
  }

  const resolvedResume = applyVariantToResume(
    resumeData,
    variant.variant_data as VariantData
  );

  const { data: updated, error: updateError } = await supabase
    .from("profile_variants")
    .update({ resolved_resume: resolvedResume })
    .eq("id", id)
    .eq("profile_id", user.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ variant: updated });
}
