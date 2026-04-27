import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/variants/[id]/clone — Duplicates a variant under a new name.
// Useful when the user is applying to several similar roles and wants to
// reuse the AI-tailored framing without re-running Smart Tailor (and
// without paying the AI cost or waiting on it). The clone is treated as a
// hand-edited starting point: it inherits the source's variant_data,
// resolved_resume, and frozen layout/PDF snapshots, but is detached from
// any job and is not the default.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: source, error } = await supabase
    .from("profile_variants")
    .select(
      "name, variant_data, resolved_resume, match_score, pdf_settings_snapshot, blocks_snapshot"
    )
    .eq("id", id)
    .eq("profile_id", user.id)
    .single();

  if (error || !source) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  // Allow the caller to override the cloned name; otherwise append " (copy)".
  let body: { name?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is fine — we'll use the default name.
  }
  const cloneName =
    body.name?.trim() || `${source.name} (copy)`;

  const { data: cloned, error: insertError } = await supabase
    .from("profile_variants")
    .insert({
      profile_id: user.id,
      name: cloneName,
      variant_data: source.variant_data,
      resolved_resume: source.resolved_resume,
      match_score: source.match_score,
      pdf_settings_snapshot: source.pdf_settings_snapshot,
      blocks_snapshot: source.blocks_snapshot,
      // Clones intentionally start unlinked and non-default — the user
      // attaches them to a job (or sets default) explicitly.
      job_application_id: null,
      is_default: false,
      source: "manual",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ variant: cloned }, { status: 201 });
}
