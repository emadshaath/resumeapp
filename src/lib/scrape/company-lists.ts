import type { JobSource } from "./types";

// Default seed lists of well-known tenants for each ATS.
// Users can add custom slugs via auto_apply_rules.company_slugs.
export const DEFAULT_COMPANY_SLUGS: Record<JobSource, string[]> = {
  greenhouse: [
    "stripe",
    "airbnb",
    "gitlab",
    "dropbox",
    "asana",
    "figma",
    "notion",
    "anthropic",
    "discord",
    "doordash",
    "instacart",
    "plaid",
    "robinhood",
    "reddit",
    "canva",
  ],
  lever: [
    "netflix",
    "shopify",
    "spotify",
    "ramp",
    "mercury",
    "retool",
    "linear",
    "vercel",
    "supabase",
  ],
};

export function getSlugsForSource(
  source: JobSource,
  userSlugs: Record<string, string[]> | null | undefined
): string[] {
  const custom = userSlugs?.[source] ?? [];
  const defaults = DEFAULT_COMPANY_SLUGS[source];
  return Array.from(new Set([...defaults, ...custom]));
}
