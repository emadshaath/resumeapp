export type JobSource = "greenhouse" | "lever";

export interface ScrapedJob {
  source: JobSource;
  external_id: string;
  company_name: string;
  company_slug: string;
  job_title: string;
  job_url: string;
  location: string | null;
  remote_type: "onsite" | "remote" | "hybrid" | null;
  salary_min: number | null;
  salary_max: number | null;
  department: string | null;
  description_html: string | null;
  description_text: string | null;
  posted_at: string | null;
}
