import type { JobSource, ScrapedJob } from "./types";
import { fetchGreenhouseJobs } from "./greenhouse";
import { fetchLeverJobs } from "./lever";
import { getSlugsForSource } from "./company-lists";

export type { JobSource, ScrapedJob };
export { fetchGreenhouseJobs, fetchLeverJobs };

export interface DiscoverOptions {
  sources: JobSource[];
  userSlugs?: Record<string, string[]> | null;
  maxPerSource?: number;
}

export async function discoverJobs(opts: DiscoverOptions): Promise<ScrapedJob[]> {
  const results: ScrapedJob[] = [];
  const seen = new Set<string>();

  for (const source of opts.sources) {
    const slugs = getSlugsForSource(source, opts.userSlugs);
    for (const slug of slugs) {
      try {
        const jobs =
          source === "greenhouse"
            ? await fetchGreenhouseJobs(slug)
            : await fetchLeverJobs(slug);
        for (const job of jobs) {
          if (seen.has(job.job_url)) continue;
          seen.add(job.job_url);
          results.push(job);
        }
      } catch (err) {
        // Swallow per-slug failures — one bad tenant shouldn't kill discovery.
        console.warn(`[discoverJobs] ${source}:${slug} failed:`, err);
      }
      // Light pacing: 250ms between per-slug calls
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  if (opts.maxPerSource) {
    const trimmed: ScrapedJob[] = [];
    const perSource = new Map<JobSource, number>();
    for (const job of results) {
      const count = perSource.get(job.source) ?? 0;
      if (count >= opts.maxPerSource) continue;
      perSource.set(job.source, count + 1);
      trimmed.push(job);
    }
    return trimmed;
  }
  return results;
}
