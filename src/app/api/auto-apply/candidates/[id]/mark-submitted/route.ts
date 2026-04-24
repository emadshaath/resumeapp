import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/auto-apply/candidates/[id]/mark-submitted
// Called by the Chrome extension (or UI) after the user confirms submission.
// Flips candidate to 'submitted' and updates the linked job_applications row.
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: candidate, error: loadErr } = await supabase
    .from("auto_apply_candidates")
    .select("id, job_application_id, status")
    .eq("id", id)
    .eq("profile_id", user.id)
    .single();
  if (loadErr || !candidate)
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  if (candidate.status === "submitted") {
    return NextResponse.json({ ok: true, already: true });
  }

  const today = new Date().toISOString().split("T")[0];

  const { error: candErr } = await supabase
    .from("auto_apply_candidates")
    .update({ status: "submitted", submit_mode: "extension" })
    .eq("id", id)
    .eq("profile_id", user.id);
  if (candErr) return NextResponse.json({ error: candErr.message }, { status: 500 });

  const { data: job } = await supabase
    .from("job_applications")
    .select("status")
    .eq("id", candidate.job_application_id)
    .single();

  await supabase
    .from("job_applications")
    .update({ status: "applied", applied_date: today })
    .eq("id", candidate.job_application_id)
    .eq("profile_id", user.id);

  await supabase.from("job_application_events").insert({
    job_application_id: candidate.job_application_id,
    from_status: job?.status ?? null,
    to_status: "applied",
    notes: "Submitted via auto-apply (extension)",
  });

  await supabase.from("auto_apply_events").insert({
    candidate_id: id,
    event: "submitted",
    detail: { mode: "extension" },
  });

  return NextResponse.json({ ok: true });
}
