import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResumeBlock } from "@/types/database";
import { seedBlocksFromSections } from "./seed";

/**
 * Load the user's blocks. On first load, if the user has zero blocks but does
 * have resume_sections, seed a default layout from those sections so the
 * Resume Builder never starts empty for an existing user.
 */
export async function fetchResumeBlocks(
  supabase: SupabaseClient,
  profileId: string,
): Promise<ResumeBlock[]> {
  const { data: existing } = await supabase
    .from("resume_blocks")
    .select("*")
    .eq("profile_id", profileId)
    .order("zone")
    .order("display_order");

  if (existing && existing.length > 0) return existing as ResumeBlock[];

  await seedBlocksFromSections(supabase, profileId);

  const { data: fresh } = await supabase
    .from("resume_blocks")
    .select("*")
    .eq("profile_id", profileId)
    .order("zone")
    .order("display_order");

  return (fresh || []) as ResumeBlock[];
}
