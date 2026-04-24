import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BlockType,
  BlockZone,
  BlockStyle,
  ResumeSection,
  ResumeBlock,
  PageTemplate,
} from "@/types/database";
import { sectionTypeToBlockType } from "./seed";

/**
 * A starter template = a recipe for how a fresh resume should be laid out
 * on the canvas. Each one corresponds to one of the four pre-existing PDF
 * layouts (Classic / Modern / Minimal / Executive); applying a starter
 * replaces the user's current resume_blocks with the starter's arrangement
 * so they get the visual feel of that layout while keeping the canvas's
 * full drag + inline editing.
 */
export type StarterId = "classic" | "modern" | "minimal" | "executive";

export interface Starter {
  id: StarterId;
  label: string;
  description: string;
  pageTemplate: PageTemplate;
  sidebarWidth?: number;
  /**
   * Which zone a given section type lands in. Sections that don't have a
   * preference (e.g. starters that only differentiate sidebar/main) fall
   * back to "main". Returning "header" is reserved for the synthetic header
   * block — sections never go there.
   */
  zoneFor: (type: BlockType) => Exclude<BlockZone, "header">;
  /**
   * Optional per-block-type style hint applied at apply-time. Lets a
   * starter set things like "show_dates: true" or future accent colors.
   */
  blockStyleFor?: (type: BlockType) => BlockStyle;
}

// ----------------------------------------------------------------------------
// Recipes
// ----------------------------------------------------------------------------

/** Single-column traditional layout. Every section flows top-to-bottom. */
const CLASSIC: Starter = {
  id: "classic",
  label: "Classic",
  description: "Single column with conventional section dividers",
  pageTemplate: "single-column",
  zoneFor: () => "main",
};

/** Sidebar-left arrangement. Skills, certs, and contact recap live in the
 *  sidebar; experience / education / projects / summary stay in main. */
const MODERN: Starter = {
  id: "modern",
  label: "Modern",
  description: "Coloured sidebar for skills + certs, main column for experience",
  pageTemplate: "sidebar-left",
  sidebarWidth: 180,
  zoneFor: (type) => (type === "skills" || type === "certifications") ? "sidebar" : "main",
};

/** Visually quieter single-column. The visual difference is mostly typography
 *  + spacing, which is set on pdf_settings — the starter just commits to the
 *  same single-column flow as Classic. */
const MINIMAL: Starter = {
  id: "minimal",
  label: "Minimal",
  description: "Spacious single column — pair with the Spacious size preset",
  pageTemplate: "single-column",
  zoneFor: () => "main",
};

/** Executive — bold header across the top, single column body. Same flow
 *  as Classic; the difference shows up in the typography + colour theme. */
const EXECUTIVE: Starter = {
  id: "executive",
  label: "Executive",
  description: "Strong header band, structured single-column body",
  pageTemplate: "single-column",
  zoneFor: () => "main",
};

export const STARTERS: Record<StarterId, Starter> = {
  classic: CLASSIC,
  modern: MODERN,
  minimal: MINIMAL,
  executive: EXECUTIVE,
};

// ----------------------------------------------------------------------------
// Apply
// ----------------------------------------------------------------------------

/**
 * Replace the user's resume_blocks with the arrangement implied by the given
 * starter. Destructive — callers should confirm before invoking. The
 * underlying section content (resume_sections, experiences, etc.) is never
 * touched; only the canvas layout is rewritten.
 *
 * Steps:
 *   1. Delete every existing resume_blocks row for this profile.
 *   2. Insert one header block in the header zone.
 *   3. For each visible resume_section, insert a block in the zone the
 *      starter prescribes, preserving the user's current section order.
 */
export async function applyStarter(
  supabase: SupabaseClient,
  profileId: string,
  starter: Starter,
): Promise<ResumeBlock[]> {
  // Wipe the old layout — the new starter is the source of truth from here on.
  await supabase.from("resume_blocks").delete().eq("profile_id", profileId);

  const { data: sections } = await supabase
    .from("resume_sections")
    .select("id, section_type, display_order")
    .eq("profile_id", profileId)
    .eq("is_visible", true)
    .order("display_order");

  const sectionRows = (sections || []) as Pick<ResumeSection, "id" | "section_type" | "display_order">[];

  type Row = {
    profile_id: string;
    type: BlockType;
    zone: BlockZone;
    display_order: number;
    source_section_id: string | null;
    style: BlockStyle;
  };

  const rows: Row[] = [
    {
      profile_id: profileId,
      type: "header",
      zone: "header",
      display_order: 0,
      source_section_id: null,
      style: starter.blockStyleFor?.("header") ?? {},
    },
  ];

  // Track per-zone display_order so blocks slot in cleanly after the wipe.
  const orderInZone = new Map<BlockZone, number>();

  for (const sec of sectionRows) {
    const type = sectionTypeToBlockType(sec.section_type);
    if (!type) continue;
    const zone: BlockZone = starter.zoneFor(type);
    const order = orderInZone.get(zone) ?? 0;
    rows.push({
      profile_id: profileId,
      type,
      zone,
      display_order: order,
      source_section_id: sec.id,
      style: starter.blockStyleFor?.(type) ?? {},
    });
    orderInZone.set(zone, order + 1);
  }

  const { data, error } = await supabase
    .from("resume_blocks")
    .insert(rows)
    .select();

  if (error) throw error;
  return (data || []) as ResumeBlock[];
}

/**
 * Update pdf_settings to point at the starter's page template (and
 * optionally sidebar width). Use alongside applyStarter so the layout
 * picker reflects the new arrangement.
 */
export async function applyStarterPageSettings(
  supabase: SupabaseClient,
  profileId: string,
  starter: Starter,
): Promise<void> {
  const patch: Record<string, unknown> = {
    layout: "custom",
    page_template: starter.pageTemplate,
  };
  if (starter.sidebarWidth) patch.sidebar_width = starter.sidebarWidth;

  // pdf_settings is upserted: insert if missing, update otherwise.
  const { data: existing } = await supabase
    .from("pdf_settings")
    .select("id")
    .eq("profile_id", profileId)
    .single();

  if (existing) {
    await supabase
      .from("pdf_settings")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("profile_id", profileId);
  } else {
    await supabase.from("pdf_settings").insert({ profile_id: profileId, ...patch });
  }
}
