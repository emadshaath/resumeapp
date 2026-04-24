import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface AutoApplyJobContext {
  summary: string;
  candidateCount: number;
}

// Pulls the user's pending auto-apply candidates and formats a compact summary
// to feed into AI section-suggestion prompts. Returns null when there's nothing
// pending — suggestions then stay generic.
export async function buildAutoApplyJobContext(
  supabase: SupabaseClient,
  userId: string,
  maxCandidates = 8
): Promise<AutoApplyJobContext | null> {
  const { data, error } = await supabase
    .from("auto_apply_candidates")
    .select(
      "match_score, job:job_applications(job_title, company_name, location, remote_type, job_description_html, parsed_data)"
    )
    .eq("profile_id", userId)
    .eq("status", "pending_review")
    .order("match_score", { ascending: false, nullsFirst: false })
    .limit(maxCandidates);

  if (error || !data || data.length === 0) return null;

  const lines: string[] = [];
  for (const row of data) {
    const job = Array.isArray(row.job) ? row.job[0] : row.job;
    if (!job) continue;
    const header = [
      job.job_title,
      job.company_name ? `@ ${job.company_name}` : null,
      job.location ? `(${job.location}${job.remote_type ? `, ${job.remote_type}` : ""})` : null,
      typeof row.match_score === "number" ? `— match ${row.match_score}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    lines.push(`- ${header}`);

    const desc = extractDescriptionSnippet(job);
    if (desc) lines.push(`  ${desc}`);
  }

  if (lines.length === 0) return null;

  return {
    summary: lines.join("\n"),
    candidateCount: data.length,
  };
}

function extractDescriptionSnippet(job: {
  job_description_html?: string | null;
  parsed_data?: Record<string, unknown> | null;
}): string | null {
  const parsed = job.parsed_data ?? null;
  const parsedSummary =
    parsed && typeof parsed === "object" && "description_summary" in parsed
      ? String((parsed as Record<string, unknown>).description_summary ?? "")
      : "";
  if (parsedSummary) return parsedSummary.slice(0, 300);

  const html = job.job_description_html;
  if (!html) return null;
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 300);
}
