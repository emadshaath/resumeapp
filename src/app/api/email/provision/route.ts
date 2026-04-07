import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMAIL_DOMAIN } from "@/lib/resend/client";
import { getEffectiveTier } from "@/lib/stripe/feature-gate";
import type { Tier } from "@/types/database";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get user profile for slug
    const { data: profile } = await admin
      .from("profiles")
      .select("slug, tier, tier_override")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check tier — email is available for Pro+ users
    const effectiveTier = getEffectiveTier(profile.tier as Tier, profile.tier_override as Tier | null);
    if (effectiveTier === "free") {
      return NextResponse.json(
        { error: "Platform email requires a Pro or Premium plan" },
        { status: 403 }
      );
    }

    // Check if already provisioned
    const { data: existing } = await admin
      .from("platform_emails")
      .select("id, email_address")
      .eq("profile_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        email_address: existing.email_address,
        message: "Email already provisioned",
      });
    }

    // Create the platform email
    const emailAddress = `${profile.slug}@${EMAIL_DOMAIN}`;

    const { data: created, error: createError } = await admin
      .from("platform_emails")
      .insert({
        profile_id: user.id,
        email_address: emailAddress,
        routing_mode: "forward",
        forward_to: user.email,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      if (createError.code === "23505") {
        return NextResponse.json(
          { error: "This email address is already in use" },
          { status: 409 }
        );
      }
      console.error("Email provision error:", createError);
      return NextResponse.json(
        { error: "Failed to provision email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      email_address: created.email_address,
    });
  } catch (error) {
    console.error("Email provision error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
