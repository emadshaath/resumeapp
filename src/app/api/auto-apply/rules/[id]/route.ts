import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

// PATCH /api/auto-apply/rules/[id] — update a rule
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  const allowed = [
    "name",
    "enabled",
    "title_keywords",
    "excluded_companies",
    "locations",
    "remote_types",
    "salary_min",
    "seniority",
    "min_match_score",
    "sources",
    "company_slugs",
  ];
  for (const f of allowed) {
    if (f in body) updates[f] = body[f];
  }

  const { data, error } = await supabase
    .from("auto_apply_rules")
    .update(updates)
    .eq("id", id)
    .eq("profile_id", user.id)
    .select()
    .single();

  if (error || !data)
    return NextResponse.json({ error: error?.message || "Not found" }, { status: 404 });
  return NextResponse.json({ rule: data });
}

// DELETE /api/auto-apply/rules/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("auto_apply_rules")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
