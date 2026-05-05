import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AI_FEATURE_TO_LIMIT_KEY,
  TIER_LIMITS,
  getEffectiveTier,
  type AIFeature,
} from "@/lib/stripe/feature-gate";
import type { Tier } from "@/types/database";

const FEATURES: AIFeature[] = [
  "ai_review",
  "ai_suggest",
  "ai_apply",
  "ai_form_answers",
  "job_parse",
  "linkedin_analyze",
  "resume_import",
  "smart_tailor",
];

// GET /api/billing/usage — current month's AI usage + caps for the signed-in
// user. Powers the Billing tab usage meters and any in-flow indicators.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("tier, tier_override")
    .eq("id", user.id)
    .single();

  const tier = getEffectiveTier(
    (profile?.tier ?? "free") as Tier,
    profile?.tier_override as Tier | null
  );

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const nextMonth = new Date(startOfMonth);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const resetsAt = nextMonth.toISOString();

  const counts = await Promise.all(
    FEATURES.map(async (feature) => {
      const { count } = await admin
        .from("ai_usage_events")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", user.id)
        .eq("feature", feature)
        .eq("status", "ok")
        .gte("created_at", startOfMonth.toISOString());
      return { feature, used: count ?? 0 };
    })
  );

  const features: Record<
    AIFeature,
    { used: number; limit: number; resetsAt: string }
  > = {} as Record<AIFeature, { used: number; limit: number; resetsAt: string }>;

  for (const { feature, used } of counts) {
    const limit = TIER_LIMITS[AI_FEATURE_TO_LIMIT_KEY[feature]][tier];
    features[feature] = { used, limit, resetsAt };
  }

  return NextResponse.json({ tier, features });
}
