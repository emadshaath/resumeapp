/**
 * Vercel Domains API client.
 *
 * Registers custom domains with the Vercel project so that SSL
 * certificates are issued and requests are routed correctly.
 *
 * Docs: https://vercel.com/docs/rest-api/endpoints/projects#add-a-domain-to-a-project
 *
 * Required env vars:
 *   VERCEL_TOKEN       — Personal or team API token
 *   VERCEL_PROJECT_ID  — The project ID (or name)
 *   VERCEL_TEAM_ID     — Optional; required for team projects
 *
 * If VERCEL_TOKEN or VERCEL_PROJECT_ID are not set, all functions
 * become no-ops so local development keeps working.
 */

const VERCEL_API = "https://api.vercel.com";

export interface VercelVerificationChallenge {
  type: "TXT" | "CNAME" | "A";
  domain: string;
  value: string;
  reason: string;
}

export interface VercelDomain {
  name: string;
  apexName: string;
  projectId: string;
  verified: boolean;
  verification?: VercelVerificationChallenge[];
}

export function isVercelConfigured(): boolean {
  return Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID);
}

function getConfig() {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    throw new Error("Vercel API is not configured");
  }

  return { token, projectId, teamId };
}

function buildUrl(path: string): string {
  const { teamId } = getConfig();
  const url = new URL(`${VERCEL_API}${path}`);
  if (teamId) url.searchParams.set("teamId", teamId);
  return url.toString();
}

async function vercelFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { token } = getConfig();
  const res = await fetch(buildUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vercel API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Add a domain to the Vercel project.
 * Returns the domain record including verification challenges.
 */
export async function addDomainToVercel(domain: string): Promise<VercelDomain> {
  const { projectId } = getConfig();
  return vercelFetch<VercelDomain>(`/v10/projects/${projectId}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: domain }),
  });
}

/**
 * Fetch a domain's current state from Vercel.
 * Returns null if the domain isn't attached to the project.
 */
export async function getDomainFromVercel(domain: string): Promise<VercelDomain | null> {
  const { projectId } = getConfig();
  try {
    return await vercelFetch<VercelDomain>(
      `/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}`,
      { method: "GET" }
    );
  } catch (error) {
    // 404 = domain not found on project
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

/**
 * Trigger Vercel's verification check for a domain.
 * Vercel will re-check DNS and update the verified status.
 */
export async function verifyDomainInVercel(domain: string): Promise<VercelDomain> {
  const { projectId } = getConfig();
  return vercelFetch<VercelDomain>(
    `/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}/verify`,
    { method: "POST" }
  );
}

/**
 * Remove a domain from the Vercel project.
 * Safe to call even if the domain is not attached (catches 404).
 */
export async function removeDomainFromVercel(domain: string): Promise<void> {
  const { projectId } = getConfig();
  try {
    await vercelFetch<unknown>(
      `/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}`,
      { method: "DELETE" }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return;
    }
    throw error;
  }
}
