import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResumeBlock } from "@/types/database";
import { ensureBlocksSynced } from "./seed";

/**
 * Load the user's blocks, auto-reconciling them with resume_sections first
 * so the builder never starts with orphan sections (sections that were added
 * via import / LinkedIn sync / AI review / extension and don't have a
 * matching canvas block yet).
 */
export async function fetchResumeBlocks(
  supabase: SupabaseClient,
  profileId: string,
): Promise<ResumeBlock[]> {
  await ensureBlocksSynced(supabase, profileId);

  const { data } = await supabase
    .from("resume_blocks")
    .select("*")
    .eq("profile_id", profileId)
    .order("zone")
    .order("display_order");

  return (data || []) as ResumeBlock[];
}
