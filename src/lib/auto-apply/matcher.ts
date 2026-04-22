import type { AutoApplyRule } from "@/types/database";
import type { ScrapedJob } from "@/lib/scrape/types";

export interface RuleMatchResult {
  matches: boolean;
  reasons: string[];
}

// Fast, local pre-filter applied BEFORE calling Claude for match_score.
// This is cheap text matching; the AI scoring happens after.
export function matchRule(job: ScrapedJob, rule: AutoApplyRule): RuleMatchResult {
  const reasons: string[] = [];

  if (rule.title_keywords.length > 0) {
    const title = job.job_title.toLowerCase();
    const anyHit = rule.title_keywords.some((kw) =>
      title.includes(kw.toLowerCase())
    );
    if (!anyHit) {
      return { matches: false, reasons: ["title keywords not matched"] };
    }
    reasons.push("title keyword matched");
  }

  if (rule.excluded_companies.length > 0) {
    const company = job.company_name.toLowerCase();
    const excluded = rule.excluded_companies.some(
      (c) => company === c.toLowerCase() || job.company_slug === c.toLowerCase()
    );
    if (excluded) {
      return { matches: false, reasons: ["company excluded"] };
    }
  }

  if (rule.remote_types.length > 0 && job.remote_type) {
    if (!rule.remote_types.includes(job.remote_type)) {
      return { matches: false, reasons: [`remote_type ${job.remote_type} not allowed`] };
    }
    reasons.push(`remote_type ${job.remote_type} ok`);
  }

  if (rule.locations.length > 0 && job.location) {
    const loc = job.location.toLowerCase();
    const anyHit = rule.locations.some((l) => loc.includes(l.toLowerCase()));
    // Remote jobs pass the location filter regardless
    if (!anyHit && job.remote_type !== "remote") {
      return { matches: false, reasons: ["location not matched"] };
    }
  }

  if (rule.salary_min && job.salary_min !== null && job.salary_min < rule.salary_min) {
    return { matches: false, reasons: [`salary_min ${job.salary_min} < ${rule.salary_min}`] };
  }

  return { matches: true, reasons };
}

// Extract likely screener questions from a job description. Best-effort heuristic;
// most Greenhouse/Lever listings don't include screener questions in the public feed,
// so we return an empty list in that case — questions will be discovered at submit time.
export function extractScreenerQuestions(descriptionText: string | null): string[] {
  if (!descriptionText) return [];
  const lines = descriptionText
    .split(/\n|\?/)
    .map((l) => l.trim())
    .filter(Boolean);

  const questions: string[] = [];
  for (const line of lines) {
    // Very loose: treat a line ending in ? as a question. Cap length.
    if (line.length < 8 || line.length > 280) continue;
    if (/\?$/.test(line)) {
      questions.push(line);
    }
  }
  return questions.slice(0, 5);
}
