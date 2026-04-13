import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEffectiveTier } from "@/lib/stripe/feature-gate";
import { DEFAULT_THEME } from "@/lib/themes";
import type { Tier } from "@/types/database";
import { OnboardingClient } from "./onboarding-client";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, tier_override, profile_theme")
    .eq("id", user.id)
    .single();

  const tier: Tier = profile
    ? getEffectiveTier(profile.tier as Tier, (profile.tier_override as Tier | null) ?? null)
    : "free";

  return (
    <OnboardingClient
      tier={tier}
      initialTheme={profile?.profile_theme || DEFAULT_THEME}
    />
  );
}
