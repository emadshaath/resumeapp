import type { Tier } from "@/types/database";

/**
 * Feature gating — checks if a tier has access to a specific feature.
 * Used in API routes and dashboard UI to enforce plan limits.
 */

const TIER_LEVEL: Record<Tier, number> = {
  free: 0,
  pro: 1,
  premium: 2,
};

export type Feature =
  | "unlimited_sections"
  | "ai_review"
  | "platform_email"
  | "email_inbox"
  | "platform_phone"
  | "full_analytics"
  | "seo_controls"
  | "templates"
  | "custom_css"
  | "custom_domain"
  | "analytics_export"
  | "profile_variants"
  | "linkedin_integration"
  | "job_optimizer"
  | "job_tracker"
  | "smart_apply"
  | "pdf_resume"
  | "peer_review";

const FEATURE_MIN_TIER: Record<Feature, Tier> = {
  unlimited_sections: "pro",
  ai_review: "free", // available to all, limits differ
  platform_email: "pro",
  email_inbox: "premium",
  platform_phone: "premium",
  full_analytics: "pro",
  seo_controls: "pro",
  templates: "pro",
  custom_css: "premium",
  custom_domain: "premium",
  analytics_export: "premium",
  profile_variants: "pro",
  linkedin_integration: "premium",
  job_optimizer: "premium",
  job_tracker: "free",
  smart_apply: "pro",
  pdf_resume: "free",
  peer_review: "premium",
};

export function getEffectiveTier(tier: Tier, tierOverride?: Tier | null): Tier {
  return tierOverride ?? tier;
}

export function hasFeature(tier: Tier, feature: Feature): boolean {
  const required = FEATURE_MIN_TIER[feature];
  return TIER_LEVEL[tier] >= TIER_LEVEL[required];
}

export function getRequiredTier(feature: Feature): Tier {
  return FEATURE_MIN_TIER[feature];
}

// Limits that vary by tier
export const TIER_LIMITS = {
  ai_reviews_per_month: { free: 1, pro: 10, premium: 999 },
  sections_max: { free: 3, pro: 999, premium: 999 },
  contacts_per_day: { free: 5, pro: 50, premium: 999 },
  snapshots_max: { free: 5, pro: 50, premium: 999 },
  variants_max: { free: 0, pro: 3, premium: 999 },
  job_optimizations_per_month: { free: 0, pro: 0, premium: 10 },
  jobs_max: { free: 5, pro: 50, premium: 999 },
  review_links_max: { free: 0, pro: 0, premium: 999 },
} as const;

export function getLimit(tier: Tier, limit: keyof typeof TIER_LIMITS): number {
  return TIER_LIMITS[limit][tier];
}
