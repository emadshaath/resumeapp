import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveTier, hasFeature } from "@/lib/stripe/feature-gate";
import type { Tier } from "@/types/database";

const TABLE_MAP: Record<string, string> = {
  experience: "experiences",
  education: "educations",
  skills: "skills",
  certifications: "certifications",
  projects: "projects",
  summary: "custom_sections",
  custom: "custom_sections",
};

const STRIPPED_FIELDS = [
  "id",
  "section_id",
  "profile_id",
  "created_at",
  "updated_at",
  "display_order",
];

// POST /api/ai/apply-recommendation/commit
// Writes a previously-previewed AI recommendation to the DB. No AI call here —
// the client has already previewed the proposal via /api/ai/apply-recommendation
// with preview=true and the user has approved the diff.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("tier, tier_override")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const tier = getEffectiveTier(
      (profile.tier || "free") as Tier,
      profile.tier_override as Tier | null
    );
    if (!hasFeature(tier, "ai_apply_recommendation")) {
      return NextResponse.json(
        { error: "Upgrade to Pro to apply AI recommendations." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      section_id?: string;
      section_type?: string;
      updates?: { id: string; fields: Record<string, unknown> }[];
      inserts?: Record<string, unknown>[];
    };

    const { section_id, section_type, updates = [], inserts = [] } = body;

    if (!section_id || !section_type) {
      return NextResponse.json(
        { error: "Missing section_id or section_type." },
        { status: 400 }
      );
    }

    const tableName = TABLE_MAP[section_type];
    if (!tableName) {
      return NextResponse.json(
        { error: "Invalid section type." },
        { status: 400 }
      );
    }

    // Verify the section belongs to the authed user
    const { data: section } = await admin
      .from("resume_sections")
      .select("id, section_type")
      .eq("id", section_id)
      .eq("profile_id", user.id)
      .single();
    if (!section) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }

    // Load current item ids so we can guard updates against injection
    const { data: items } = await admin
      .from(tableName)
      .select("id")
      .eq("section_id", section.id);
    const validIds = new Set((items ?? []).map((i: { id: string }) => i.id));

    let updatesApplied = 0;
    for (const update of updates) {
      if (!validIds.has(update.id)) continue;
      const safeFields = { ...update.fields };
      for (const key of STRIPPED_FIELDS) delete safeFields[key];
      if (Object.keys(safeFields).length === 0) continue;
      const { error: updErr } = await admin
        .from(tableName)
        .update(safeFields)
        .eq("id", update.id)
        .eq("section_id", section.id);
      if (!updErr) updatesApplied++;
    }

    let insertsApplied = 0;
    const currentCount = items?.length ?? 0;
    for (let i = 0; i < inserts.length; i++) {
      const safeInsert = { ...inserts[i] };
      for (const key of ["id", "created_at", "updated_at"]) {
        delete safeInsert[key];
      }
      const { error: insErr } = await admin.from(tableName).insert({
        ...safeInsert,
        section_id: section.id,
        profile_id: user.id,
        display_order: currentCount + i,
      });
      if (!insErr) insertsApplied++;
    }

    return NextResponse.json({
      success: true,
      updates_applied: updatesApplied,
      inserts_applied: insertsApplied,
    });
  } catch (error) {
    console.error("Apply recommendation commit error:", error);
    return NextResponse.json(
      { error: "Failed to apply recommendation." },
      { status: 500 }
    );
  }
}
