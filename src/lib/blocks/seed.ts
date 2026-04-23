import type { SupabaseClient } from "@supabase/supabase-js";
import type { BlockType, ResumeSection, SectionType } from "@/types/database";

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
 * Build the default block layout for a user who has no blocks yet but already
 * has resume_sections. Used on first visit to the unified Resume Builder so
 * nobody sees an empty canvas.
 *
 * Shape of the default layout:
 *   - 1x `header` block in the `header` zone (always first).
 *   - 1x block per existing visible section, in the `main` zone, preserving
 *     the user's current `display_order`.
 *
 * Idempotent by design: callers should only invoke when the user has zero
 * existing blocks. This helper does not check for itself.
 */
export async function seedBlocksFromSections(
  supabase: SupabaseClient,
  profileId: string,
): Promise<void> {
  const { data: sections } = await supabase
    .from("resume_sections")
    .select("id, section_type, display_order")
    .eq("profile_id", profileId)
    .eq("is_visible", true)
    .order("display_order");

  const sectionRows = (sections || []) as Pick<ResumeSection, "id" | "section_type" | "display_order">[];

  const rows = [
    {
      profile_id: profileId,
      type: "header" as BlockType,
      zone: "header" as const,
      display_order: 0,
      source_section_id: null,
      style: {},
    },
    ...sectionRows
      .map((sec, idx) => {
        const blockType = sectionTypeToBlockType(sec.section_type);
        if (!blockType) return null;
        return {
          profile_id: profileId,
          type: blockType,
          zone: "main" as const,
          display_order: idx,
          source_section_id: sec.id,
          style: {},
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null),
  ];

  if (rows.length === 0) return;
  await supabase.from("resume_blocks").insert(rows);
}
