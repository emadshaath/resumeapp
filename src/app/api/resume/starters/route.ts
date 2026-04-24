import { NextRequest, NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { STARTERS, applyStarter, applyStarterPageSettings, type StarterId } from "@/lib/blocks/starters";

const VALID_IDS: StarterId[] = ["classic", "modern", "minimal", "executive"];

/**
 * POST /api/resume/starters
 * Body: { id: StarterId }
 *
 * Replaces the user's resume_blocks with the chosen starter's arrangement
 * and updates pdf_settings.page_template (+ sidebar_width) to match. The
 * caller should confirm with the user first — this discards the current
 * canvas layout.
 *
 * Returns the new blocks list so the client can update local state without
 * a re-fetch.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (typeof body?.id !== "string" || !VALID_IDS.includes(body.id as StarterId)) {
      return NextResponse.json(
        { error: `Invalid starter id. Expected one of: ${VALID_IDS.join(", ")}` },
        { status: 400 },
      );
    }

    const starter = STARTERS[body.id as StarterId];
    const blocks = await applyStarter(supabase, user.id, starter);
    await applyStarterPageSettings(supabase, user.id, starter);

    return NextResponse.json({
      blocks,
      starter: { id: starter.id, pageTemplate: starter.pageTemplate, sidebarWidth: starter.sidebarWidth ?? null },
    });
  } catch (e) {
    const err = e as Partial<PostgrestError> & { message?: string };
    console.error("[resume/starters POST]", err);
    return NextResponse.json(
      {
        error: err?.message ?? "Unexpected error",
        code: err?.code,
        details: err?.details,
      },
      { status: 500 },
    );
  }
}
