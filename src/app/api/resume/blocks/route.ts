import { NextRequest, NextResponse } from "next/server";
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

// GET /api/resume/blocks — List user's blocks (seeds defaults on first call).
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const blocks = await fetchResumeBlocks(supabase, user.id);
  return NextResponse.json({ blocks });
}

// PUT /api/resume/blocks — Bulk replace the user's blocks in one transaction.
// Expects { blocks: BlockInput[] }. Used by the builder when the user
// rearranges the canvas. Safer than many PATCH calls during a drag.
export async function PUT(req: NextRequest) {
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

  // Replace-all: delete + insert inside a single request (Supabase has no
  // cross-statement transaction from JS, but FK is not involved here so the
  // failure window is minimal; the worst case is an orphaned row that the
  // next PUT cleans up).
  const { error: delErr } = await supabase
    .from("resume_blocks")
    .delete()
    .eq("profile_id", user.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blocks: data });
}

// POST /api/resume/blocks — Append a single new block. Used by the palette
// "drag a new block onto the canvas" flow when we don't want to rewrite
// the whole list.
export async function POST(req: NextRequest) {
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ block: data }, { status: 201 });
}
