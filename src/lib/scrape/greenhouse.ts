import type { ScrapedJob } from "./types";
import { fetchJson, inferRemoteType, stripHtml } from "./fetch";

// https://developers.greenhouse.io/job-board.html
// GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  departments?: Array<{ name: string }>;
  content?: string;
  updated_at?: string;
  metadata?: Array<{ name: string; value: string | null }>;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
  meta?: { total?: number };
}

export async function fetchGreenhouseJobs(slug: string): Promise<ScrapedJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`;
  const data = await fetchJson<GreenhouseResponse>(url);
  if (!data.jobs || !Array.isArray(data.jobs)) {
    throw new Error(`Greenhouse: unexpected response shape for "${slug}"`);
  }

  return data.jobs.map((j) => {
    const locationName = j.location?.name ?? null;
    const htmlContent = j.content ? decodeHtmlEntities(j.content) : null;
    const textContent = stripHtml(htmlContent);
    return {
      source: "greenhouse" as const,
      external_id: `greenhouse:${slug}:${j.id}`,
      company_name: prettifySlug(slug),
      company_slug: slug,
      job_title: j.title,
      job_url: j.absolute_url,
      location: locationName,
      remote_type: inferRemoteType(`${locationName ?? ""} ${textContent ?? ""}`),
      salary_min: null,
      salary_max: null,
      department: j.departments?.[0]?.name ?? null,
      description_html: htmlContent,
      description_text: textContent,
      posted_at: j.updated_at ?? null,
    };
  });
}

function decodeHtmlEntities(s: string): string {
  // Greenhouse returns content with entities; decode a minimal subset
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function prettifySlug(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
