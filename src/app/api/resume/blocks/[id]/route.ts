import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { BlockStyle, BlockZone } from "@/types/database";

const VALID_ZONES: BlockZone[] = ["header", "main", "sidebar"];

// PATCH /api/resume/blocks/[id] — Partial update for a single block.
// Accepts any subset of: zone, display_order, source_section_id, style.
// Used for style tweaks from the right-rail properties panel.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (body.zone !== undefined) {
    if (!VALID_ZONES.includes(body.zone)) {
      return NextResponse.json({ error: "Invalid zone" }, { status: 400 });
    }
    updates.zone = body.zone;
  }
  if (body.display_order !== undefined) {
    if (typeof body.display_order !== "number") {
      return NextResponse.json({ error: "display_order must be a number" }, { status: 400 });
    }
    updates.display_order = body.display_order;
  }
  if (body.source_section_id !== undefined) {
    updates.source_section_id = body.source_section_id;
  }
  if (body.style !== undefined) {
    if (!body.style || typeof body.style !== "object") {
      return NextResponse.json({ error: "style must be an object" }, { status: 400 });
    }
    updates.style = body.style as BlockStyle;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updatable fields supplied" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("resume_blocks")
    .update(updates)
    .eq("id", id)
    .eq("profile_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ block: data });
}

// DELETE /api/resume/blocks/[id] — Remove a single block.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("resume_blocks")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
