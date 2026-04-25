import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AutoApplyAnswer, AutoApplyCandidateStatus } from "@/types/database";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/auto-apply/candidates/[id] — full detail with job + events
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
      "*, job:job_applications(*), variant:profile_variants(id, match_score, variant_data)"
    )
    .eq("id", id)
    .eq("profile_id", user.id)
    .single();

  if (error || !candidate)
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  const { data: events } = await supabase
    .from("auto_apply_events")
    .select("*")
    .eq("candidate_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ candidate, events: events ?? [] });
}

// PATCH /api/auto-apply/candidates/[id] — edit ai_answers, change status (skip/approve)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    ai_answers?: AutoApplyAnswer[];
    status?: AutoApplyCandidateStatus;
    submit_mode?: "extension" | "server";
  };

  const updates: Record<string, unknown> = {};
  if (body.ai_answers !== undefined) updates.ai_answers = body.ai_answers;
  if (body.status !== undefined) updates.status = body.status;
  if (body.submit_mode !== undefined) updates.submit_mode = body.submit_mode;

  const { data, error } = await supabase
    .from("auto_apply_candidates")
    .update(updates)
    .eq("id", id)
    .eq("profile_id", user.id)
    .select()
    .single();

  if (error || !data)
    return NextResponse.json({ error: error?.message || "Not found" }, { status: 404 });

  await supabase.from("auto_apply_events").insert({
    candidate_id: id,
    event: body.status === "skipped" ? "skipped" : "updated",
    detail: { fields: Object.keys(updates) },
  });

  return NextResponse.json({ candidate: data });
}
