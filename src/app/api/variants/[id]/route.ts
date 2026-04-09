import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/variants/[id] — Get variant details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: variant, error } = await supabase
    .from("profile_variants")
    .select("*")
    .eq("id", id)
    .eq("profile_id", user.id)
    .single();

  if (error || !variant) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  // Fetch linked job info
  let job = null;
  if (variant.job_application_id) {
    const { data } = await supabase
      .from("job_applications")
      .select("id, company_name, job_title, job_url, status")
      .eq("id", variant.job_application_id)
      .single();
    job = data;
  }

  return NextResponse.json({ variant, job });
}

// PUT /api/variants/[id] — Update variant
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.variant_data !== undefined) updates.variant_data = body.variant_data;
  if (body.resolved_resume !== undefined) updates.resolved_resume = body.resolved_resume;
  if (body.is_default !== undefined) updates.is_default = body.is_default;

  const { data: variant, error } = await supabase
    .from("profile_variants")
    .update(updates)
    .eq("id", id)
    .eq("profile_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ variant });
}

// DELETE /api/variants/[id] — Delete variant
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Unlink from any job applications first
  await supabase
    .from("job_applications")
    .update({ variant_id: null })
    .eq("variant_id", id)
    .eq("profile_id", user.id);

  const { error } = await supabase
    .from("profile_variants")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
