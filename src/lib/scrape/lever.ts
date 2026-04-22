import type { ScrapedJob } from "./types";
import { fetchJson, inferRemoteType, stripHtml } from "./fetch";

// https://help.lever.co/hc/en-us/articles/360003152173-Lever-API-Postings-JSON-feed
// GET https://api.lever.co/v0/postings/{slug}?mode=json
interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  categories?: {
    location?: string;
    team?: string;
    commitment?: string;
  };
  workplaceType?: string;
  descriptionPlain?: string;
  description?: string;
  createdAt?: number;
}

export async function fetchLeverJobs(slug: string): Promise<ScrapedJob[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
  const data = await fetchJson<LeverPosting[]>(url);
  if (!Array.isArray(data)) {
    throw new Error(`Lever: unexpected response shape for "${slug}"`);
  }

  return data.map((p) => {
    const location = p.categories?.location ?? null;
    const workplace = p.workplaceType?.toLowerCase() ?? null;
    const remoteType =
      workplace === "remote" || workplace === "hybrid" || workplace === "onsite"
        ? (workplace as "remote" | "hybrid" | "onsite")
        : inferRemoteType(`${location ?? ""} ${p.descriptionPlain ?? ""}`);
    return {
      source: "lever" as const,
      external_id: `lever:${slug}:${p.id}`,
      company_name: prettifySlug(slug),
      company_slug: slug,
      job_title: p.text,
      job_url: p.hostedUrl,
      location,
      remote_type: remoteType,
      salary_min: null,
      salary_max: null,
      department: p.categories?.team ?? null,
      description_html: p.description ?? null,
      description_text: p.descriptionPlain ?? stripHtml(p.description ?? null),
      posted_at: p.createdAt ? new Date(p.createdAt).toISOString() : null,
    };
  });
}

function prettifySlug(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
