import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResumeBlock } from "@/types/database";
import { fetchResumeBlocks } from "./fetch";

/**
 * Read the user's current resume_blocks (auto-seeding via fetchResumeBlocks
 * if needed) and return them as a snapshot payload safe to embed on a
 * `profile_variants.blocks_snapshot` column.
 *
 * The bookkeeping fields (id, profile_id, created_at, updated_at) are kept
 * on the rows because they're cheap and make a future "restore this variant
 * to the live canvas" feature trivial — but only `type`, `zone`,
 * `display_order`, `source_section_id`, and `style` actually drive the
 * downstream PDF render.
 */
export async function snapshotResumeBlocks(
  supabase: SupabaseClient,
  profileId: string,
): Promise<ResumeBlock[]> {
  return fetchResumeBlocks(supabase, profileId);
}
