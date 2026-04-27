import type { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

const BASE_RESUME_TABLES = [
  "experiences",
  "educations",
  "skills",
  "certifications",
  "projects",
  "custom_sections",
  "resume_sections",
] as const;

// Returns the most recent updated_at across the user's base resume content
// tables (profile + section/content tables). Used to flag variants whose
// frozen snapshots predate the latest base edit. Layout and PDF styling
// tables are intentionally excluded — variants freeze those independently
// in blocks_snapshot and pdf_settings_snapshot, so they never cause drift.
export async function fetchBaseResumeModifiedAt(
  supabase: SupabaseServer,
  userId: string
): Promise<string | null> {
  const results = await Promise.all([
    supabase.from("profiles").select("updated_at").eq("id", userId).maybeSingle(),
    ...BASE_RESUME_TABLES.map((t) =>
      supabase
        .from(t)
        .select("updated_at")
        .eq("profile_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ),
  ]);
  let max: string | null = null;
  for (const res of results) {
    const ts = (res.data as { updated_at?: string } | null)?.updated_at;
    if (ts && (!max || ts > max)) max = ts;
  }
  return max;
}
