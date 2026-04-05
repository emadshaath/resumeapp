import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/jobs/[id] — Get a single job with events
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: job, error } = await supabase
    .from("job_applications")
    .select("*")
    .eq("id", id)
    .eq("profile_id", user.id)
    .single();

  if (error || !job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { data: events } = await supabase
    .from("job_application_events")
    .select("*")
    .eq("job_application_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ job, events: events || [] });
}

// PATCH /api/jobs/[id] — Update a job application
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get current job to track status change
  const { data: current } = await supabase
    .from("job_applications")
    .select("status")
    .eq("id", id)
    .eq("profile_id", user.id)
    .single();

  if (!current) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const body = await req.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  const allowedFields = [
    "company_name", "job_title", "job_url", "status", "applied_date",
    "location", "remote_type", "salary_min", "salary_max", "notes",
    "follow_up_date", "contact_name", "contact_email", "match_score",
    "resume_variant",
  ];

  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field];
  }

  // If status is changing to "applied" and no applied_date set, set it
  if (body.status === "applied" && !body.applied_date) {
    updates.applied_date = new Date().toISOString().split("T")[0];
  }

  const { data: job, error } = await supabase
    .from("job_applications")
    .update(updates)
    .eq("id", id)
    .eq("profile_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Track status change
  if (body.status && body.status !== current.status) {
    await supabase.from("job_application_events").insert({
      job_application_id: id,
      from_status: current.status,
      to_status: body.status,
      notes: body.status_note || null,
    });
  }

  return NextResponse.json({ job });
}

// DELETE /api/jobs/[id] — Delete a job application
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("job_applications")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
