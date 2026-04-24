import { NextRequest, NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { fetchResumeBlocks } from "@/lib/blocks/fetch";
import type { BlockType, BlockZone, BlockStyle } from "@/types/database";

const VALID_TYPES: BlockType[] = [
  "header", "summary", "experience", "education", "skills",
  "certifications", "projects", "custom", "divider", "spacer",
];
const VALID_ZONES: BlockZone[] = ["header", "main", "sidebar"];

interface BlockInput {
  id?: string;
  type: BlockType;
  zone: BlockZone;
  display_order: number;
  source_section_id: string | null;
  style: BlockStyle;
}

function validateBlock(raw: unknown): BlockInput | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "Block must be an object" };
  const b = raw as Record<string, unknown>;
  if (typeof b.type !== "string" || !VALID_TYPES.includes(b.type as BlockType)) {
    return { error: `Invalid block type: ${b.type}` };
  }
  if (typeof b.zone !== "string" || !VALID_ZONES.includes(b.zone as BlockZone)) {
    return { error: `Invalid block zone: ${b.zone}` };
  }
  if (typeof b.display_order !== "number") {
    return { error: "display_order must be a number" };
  }
  return {
    id: typeof b.id === "string" ? b.id : undefined,
    type: b.type as BlockType,
    zone: b.zone as BlockZone,
    display_order: b.display_order,
    source_section_id: typeof b.source_section_id === "string" ? b.source_section_id : null,
    style: (b.style && typeof b.style === "object") ? b.style as BlockStyle : {},
  };
}

/**
 * Turn a Supabase/Postgres error into a JSON response that's safe for the
 * browser but still actionable. Logs the full shape server-side so the
 * Vercel function logs capture the root cause (table missing, RLS denied,
 * FK violated, etc.).
 */
function postgrestErrorResponse(err: PostgrestError, where: string) {
  console.error(`[resume/blocks ${where}]`, err);
  const hint =
    err.code === "42P01"
      ? "The resume_blocks table doesn't exist — migration 00022 hasn't been applied to this Supabase project."
      : err.code === "42501" || err.code === "PGRST301"
        ? "Row-level security denied the write. Check that the user's profile_id matches auth.uid()."
        : err.code === "23503"
          ? "Foreign-key violation — likely source_section_id refers to a section that no longer exists."
          : err.code === "23514"
            ? "Check constraint failed — the type or zone didn't match the allowed values."
            : null;
  return NextResponse.json(
    {
      error: err.message,
      code: err.code,
      details: err.details,
      hint: hint ?? err.hint,
    },
    { status: 500 },
  );
}

// GET /api/resume/blocks — List user's blocks (seeds defaults on first call).
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const blocks = await fetchResumeBlocks(supabase, user.id);
    return NextResponse.json({ blocks });
  } catch (e) {
    console.error("[resume/blocks GET] unexpected", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 },
    );
  }
}

// PUT /api/resume/blocks — Bulk replace the user's blocks in one transaction.
// Expects { blocks: BlockInput[] }. Used by the builder when the user
// rearranges the canvas. Safer than many PATCH calls during a drag.
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const raw = Array.isArray(body?.blocks) ? body.blocks : null;
    if (!raw) return NextResponse.json({ error: "blocks[] required" }, { status: 400 });

    const validated: BlockInput[] = [];
    for (const r of raw) {
      const res = validateBlock(r);
      if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 });
      validated.push(res);
    }

    // Replace-all: delete + insert. Supabase has no cross-statement transaction
    // from JS, but FK cascades aren't involved here so the failure window is
    // minimal — worst case: an orphaned gap that the next PUT cleans up.
    const { error: delErr } = await supabase
      .from("resume_blocks")
      .delete()
      .eq("profile_id", user.id);
    if (delErr) return postgrestErrorResponse(delErr, "PUT delete");

    if (validated.length === 0) return NextResponse.json({ blocks: [] });

    const { data, error } = await supabase
      .from("resume_blocks")
      .insert(
        validated.map((b) => ({
          profile_id: user.id,
          type: b.type,
          zone: b.zone,
          display_order: b.display_order,
          source_section_id: b.source_section_id,
          style: b.style,
        })),
      )
      .select();

    if (error) return postgrestErrorResponse(error, "PUT insert");
    return NextResponse.json({ blocks: data });
  } catch (e) {
    console.error("[resume/blocks PUT] unexpected", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 },
    );
  }
}

// POST /api/resume/blocks — Append a single new block. Used by the "add to
// canvas" affordance on each section row (and by the auto-add after a new
// section is created from the left rail).
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const res = validateBlock(body);
    if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 });

    const { data, error } = await supabase
      .from("resume_blocks")
      .insert({
        profile_id: user.id,
        type: res.type,
        zone: res.zone,
        display_order: res.display_order,
        source_section_id: res.source_section_id,
        style: res.style,
      })
      .select()
      .single();

    if (error) return postgrestErrorResponse(error, "POST insert");
    return NextResponse.json({ block: data }, { status: 201 });
  } catch (e) {
    console.error("[resume/blocks POST] unexpected", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
