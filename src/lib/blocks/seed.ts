import type { SupabaseClient } from "@supabase/supabase-js";
import type { BlockType, ResumeBlock, ResumeSection, SectionType } from "@/types/database";

/**
 * Map a resume_sections.section_type to the corresponding block.type.
 * Returns null for section types that don't have a direct block equivalent
 * (shouldn't happen today but guards us for future section types).
 */
export function sectionTypeToBlockType(sectionType: SectionType): BlockType | null {
  switch (sectionType) {
    case "summary":
      return "summary";
    case "experience":
      return "experience";
    case "education":
      return "education";
    case "skills":
      return "skills";
    case "certifications":
      return "certifications";
    case "projects":
      return "projects";
    case "custom":
      return "custom";
    default:
      return null;
  }
}

/**
 * Reconcile resume_blocks with the user's current resume_sections. Safe to
 * run on every page load — only inserts what's missing, never deletes.
 *
 * Specifically:
 *   - Ensures exactly one `header` block exists in the `header` zone.
 *   - For every visible section without a backing block, appends one to the
 *     `main` zone after any existing main-zone blocks (preserving whatever
 *     order the canvas already had).
 *
 * Sections the user hides or deletes don't get their blocks touched here —
 * the section editor handles the delete cascade explicitly, and hidden
 * sections keep their block so toggling visibility is a no-op for layout.
 */
export async function ensureBlocksSynced(
  supabase: SupabaseClient,
  profileId: string,
): Promise<void> {
  const [sectionsRes, blocksRes] = await Promise.all([
    supabase
      .from("resume_sections")
      .select("id, section_type, display_order")
      .eq("profile_id", profileId)
      .eq("is_visible", true)
      .order("display_order"),
    supabase
      .from("resume_blocks")
      .select("id, zone, source_section_id")
      .eq("profile_id", profileId),
  ]);

  const sections = (sectionsRes.data || []) as Pick<ResumeSection, "id" | "section_type" | "display_order">[];
  const existing = (blocksRes.data || []) as Pick<ResumeBlock, "id" | "zone" | "source_section_id">[];

  const hasHeader = existing.some((b) => b.zone === "header");
  const backedSectionIds = new Set(
    existing.map((b) => b.source_section_id).filter((id): id is string => typeof id === "string"),
  );

  const rows: Array<{
    profile_id: string;
    type: BlockType;
    zone: "header" | "main" | "sidebar";
    display_order: number;
    source_section_id: string | null;
    style: Record<string, unknown>;
  }> = [];

  if (!hasHeader) {
    rows.push({
      profile_id: profileId,
      type: "header",
      zone: "header",
      display_order: 0,
      source_section_id: null,
      style: {},
    });
  }

  let nextMainOrder = existing.filter((b) => b.zone === "main").length;
  for (const sec of sections) {
    if (backedSectionIds.has(sec.id)) continue;
    const type = sectionTypeToBlockType(sec.section_type);
    if (!type) continue;
    rows.push({
      profile_id: profileId,
      type,
      zone: "main",
      display_order: nextMainOrder++,
      source_section_id: sec.id,
      style: {},
    });
  }

  if (rows.length === 0) return;
  await supabase.from("resume_blocks").insert(rows);
}

/**
 * @deprecated Use {@link ensureBlocksSynced}. Retained for the migration
 * path — removes on the next cleanup pass.
 */
export const seedBlocksFromSections = ensureBlocksSynced;
