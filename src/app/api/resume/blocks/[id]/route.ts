import { NextRequest, NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { BlockStyle, BlockZone } from "@/types/database";

const VALID_ZONES: BlockZone[] = ["header", "main", "sidebar"];

function postgrestErrorResponse(err: PostgrestError, where: string) {
  console.error(`[resume/blocks/[id] ${where}]`, err);
  const hint =
    err.code === "42P01"
      ? "The resume_blocks table doesn't exist — migration 00022 hasn't been applied to this Supabase project."
      : err.code === "42501" || err.code === "PGRST301"
        ? "Row-level security denied the write."
        : err.code === "23503"
          ? "Foreign-key violation — likely source_section_id refers to a section that no longer exists."
          : err.code === "23514"
            ? "Check constraint failed."
            : null;
  return NextResponse.json(
    { error: err.message, code: err.code, details: err.details, hint: hint ?? err.hint },
    { status: 500 },
  );
}

// PATCH /api/resume/blocks/[id] — Partial update for a single block.
// Accepts any subset of: zone, display_order, source_section_id, style.
// Used for style tweaks from the right-rail properties panel.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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

    if (error) return postgrestErrorResponse(error, "PATCH");
    return NextResponse.json({ block: data });
  } catch (e) {
    console.error("[resume/blocks/[id] PATCH] unexpected", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 },
    );
  }
}

// DELETE /api/resume/blocks/[id] — Remove a single block.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("resume_blocks")
      .delete()
      .eq("id", id)
      .eq("profile_id", user.id);

    if (error) return postgrestErrorResponse(error, "DELETE");
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[resume/blocks/[id] DELETE] unexpected", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
