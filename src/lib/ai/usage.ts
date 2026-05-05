import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AI_FEATURE_TO_LIMIT_KEY,
  TIER_LIMITS,
  getEffectiveTier,
  type AIFeature,
} from "@/lib/stripe/feature-gate";
import type { Tier } from "@/types/database";

type AdminClient = SupabaseClient;

export type EnforceFailure = {
  ok: false;
  status: 429;
  code: "monthly_cap" | "throttle";
  message: string;
  upgradeTo?: Tier;
};

export type EnforceSuccess = {
  ok: true;
  tier: Tier;
  used: number;
  limit: number;
  remaining: number;
};

export type EnforceResult = EnforceSuccess | EnforceFailure;

type ThrottleSpec = { limit: number; windowSec: number };

const DEFAULT_THROTTLES: Record<AIFeature, ThrottleSpec> = {
  ai_review: { limit: 3, windowSec: 5 * 60 },
  ai_suggest: { limit: 10, windowSec: 60 },
  ai_apply: { limit: 5, windowSec: 60 },
  ai_form_answers: { limit: 10, windowSec: 60 },
  job_parse: { limit: 10, windowSec: 60 },
  linkedin_analyze: { limit: 3, windowSec: 5 * 60 },
  resume_import: { limit: 3, windowSec: 5 * 60 },
  smart_tailor: { limit: 5, windowSec: 5 * 60 },
};

function nextTierUp(tier: Tier): Tier | undefined {
  if (tier === "free") return "pro";
  if (tier === "pro") return "premium";
  return undefined;
}

function monthlyCapMessage(feature: AIFeature, limit: number, tier: Tier): string {
  const upgrade = nextTierUp(tier);
  const upgradeNote = upgrade ? ` Upgrade to ${upgrade} for more.` : "";
  const featureLabel: Record<AIFeature, string> = {
    ai_review: "AI reviews",
    ai_suggest: "section suggestions",
    ai_apply: "AI apply actions",
    ai_form_answers: "AI form answers",
    job_parse: "job-URL parses",
    linkedin_analyze: "LinkedIn analyses",
    resume_import: "resume imports",
    smart_tailor: "smart-tailor runs",
  };
  return `You've used all ${limit} ${featureLabel[feature]} for this month.${upgradeNote}`;
}

/**
 * Gate an AI request. Reads the caller's tier, increments their short-term
 * throttle bucket, and counts this month's successful events for the feature.
 *
 * Returns ok=true if the call may proceed; ok=false with a 429-shaped payload
 * otherwise. Always called BEFORE the Anthropic call.
 *
 * The throttle bucket is incremented as part of the gate — a denied request
 * does still consume a throttle slot, but a request denied for `monthly_cap`
 * does not (the cap check runs before the throttle bump).
 */
export async function enforceAILimit(
  admin: AdminClient,
  profileId: string,
  feature: AIFeature,
  opts?: { throttle?: Partial<ThrottleSpec> }
): Promise<EnforceResult> {
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("tier, tier_override")
    .eq("id", profileId)
    .single();

  if (profileError || !profile) {
    return {
      ok: false,
      status: 429,
      code: "monthly_cap",
      message: "Profile not found.",
    };
  }

  const tier = getEffectiveTier(
    (profile.tier ?? "free") as Tier,
    profile.tier_override as Tier | null
  );

  const limitKey = AI_FEATURE_TO_LIMIT_KEY[feature];
  const monthlyLimit = TIER_LIMITS[limitKey][tier];

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const { count: usedThisMonth } = await admin
    .from("ai_usage_events")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("feature", feature)
    .eq("status", "ok")
    .gte("created_at", startOfMonth.toISOString());

  const used = usedThisMonth ?? 0;
  if (used >= monthlyLimit) {
    return {
      ok: false,
      status: 429,
      code: "monthly_cap",
      message: monthlyCapMessage(feature, monthlyLimit, tier),
      upgradeTo: nextTierUp(tier),
    };
  }

  const defaults = DEFAULT_THROTTLES[feature];
  const throttle: ThrottleSpec = {
    limit: opts?.throttle?.limit ?? defaults.limit,
    windowSec: opts?.throttle?.windowSec ?? defaults.windowSec,
  };

  const { data: bumped, error: throttleError } = await admin.rpc("bump_ai_throttle", {
    p_profile_id: profileId,
    p_feature: feature,
    p_window_seconds: throttle.windowSec,
  });

  if (throttleError) {
    // Fail open: a broken throttle table shouldn't block paying users.
    console.error("bump_ai_throttle failed", throttleError);
  } else if (typeof bumped === "number" && bumped > throttle.limit) {
    await logUsage(admin, { profileId, feature, status: "rate_limited" });
    return {
      ok: false,
      status: 429,
      code: "throttle",
      message: "You're sending requests too quickly. Please wait a moment and try again.",
    };
  }

  return {
    ok: true,
    tier,
    used,
    limit: monthlyLimit,
    remaining: Math.max(0, monthlyLimit - used - 1),
  };
}

/**
 * Record a single AI call. Always called in a finally{} after the AI call
 * lands, regardless of outcome. Errors here are swallowed — logging must
 * never break a user-facing request.
 */
export async function logUsage(
  admin: AdminClient,
  args: {
    profileId: string;
    feature: AIFeature;
    status?: "ok" | "error" | "rate_limited";
    tokensIn?: number;
    tokensOut?: number;
    model?: string;
    requestId?: string;
  }
): Promise<void> {
  try {
    await admin.from("ai_usage_events").insert({
      profile_id: args.profileId,
      feature: args.feature,
      status: args.status ?? "ok",
      tokens_in: args.tokensIn ?? null,
      tokens_out: args.tokensOut ?? null,
      model: args.model ?? null,
      request_id: args.requestId ?? null,
    });
  } catch (err) {
    console.error("logUsage failed", err);
  }
}
