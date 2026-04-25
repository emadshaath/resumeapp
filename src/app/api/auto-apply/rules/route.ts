import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getEffectiveTier,
  getLimit,
  hasFeature,
  getRequiredTier,
} from "@/lib/stripe/feature-gate";
import type { Tier } from "@/types/database";

// GET /api/auto-apply/rules — list current user's rules
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("auto_apply_rules")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rules: data });
}

// POST /api/auto-apply/rules — create rule
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, tier_override")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const tier = getEffectiveTier(
    (profile.tier || "free") as Tier,
    profile.tier_override as Tier | null
  );
  if (!hasFeature(tier, "auto_apply")) {
    return NextResponse.json(
      {
        error: `Auto-apply requires the ${getRequiredTier("auto_apply")} plan.`,
        upgrade_required: true,
      },
      { status: 403 }
    );
  }

  const { count } = await supabase
    .from("auto_apply_rules")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id);
  const max = getLimit(tier, "auto_apply_rules_max");
  if ((count || 0) >= max) {
    return NextResponse.json(
      { error: `Rule limit reached (${max}). Upgrade for more.`, upgrade_required: true },
      { status: 403 }
    );
  }

  const body = await req.json();
  const {
    name,
    enabled = true,
    title_keywords = [],
    excluded_companies = [],
    locations = [],
    remote_types = [],
    salary_min = null,
    seniority = [],
    min_match_score = 70,
    sources = ["greenhouse", "lever"],
    company_slugs = {},
  } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Rule name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("auto_apply_rules")
    .insert({
      profile_id: user.id,
      name,
      enabled,
      title_keywords,
      excluded_companies,
      locations,
      remote_types,
      salary_min,
      seniority,
      min_match_score,
      sources,
      company_slugs,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rule: data });
}
