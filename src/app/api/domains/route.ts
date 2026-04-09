import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveTier, hasFeature } from "@/lib/stripe/feature-gate";
import type { Tier } from "@/types/database";
import { randomBytes } from "crypto";

/**
 * GET — fetch the user's custom domain (if any)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: domain } = await supabase
      .from("custom_domains")
      .select("*")
      .eq("profile_id", user.id)
      .single();

    return NextResponse.json({ domain: domain || null });
  } catch (error) {
    console.error("Domain fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST — add a custom domain (Premium only)
 * Body: { domain: "resume.johndoe.com" }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get profile & check tier
    const { data: profile } = await admin
      .from("profiles")
      .select("slug, tier, tier_override")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const effectiveTier = getEffectiveTier(profile.tier as Tier, profile.tier_override as Tier | null);
    if (!hasFeature(effectiveTier, "custom_domain")) {
      return NextResponse.json(
        { error: "Custom domains require a Premium plan" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const rawDomain = (body.domain || "").trim().toLowerCase();

    // Basic domain validation
    if (!rawDomain || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(rawDomain)) {
      return NextResponse.json(
        { error: "Please enter a valid domain (e.g. resume.example.com)" },
        { status: 400 }
      );
    }

    // Block our own domain
    const appDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN || "rezm.ai").replace(/:\d+$/, "");
    if (rawDomain === appDomain || rawDomain.endsWith(`.${appDomain}`)) {
      return NextResponse.json(
        { error: "You cannot use a rezm.ai subdomain as a custom domain" },
        { status: 400 }
      );
    }

    // Check if user already has a custom domain
    const { data: existing } = await admin
      .from("custom_domains")
      .select("id, domain")
      .eq("profile_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "You already have a custom domain configured. Remove it first to add a new one." },
        { status: 409 }
      );
    }

    // Generate verification token
    const verificationToken = `rezm-verify-${randomBytes(16).toString("hex")}`;

    const { data: created, error: createError } = await admin
      .from("custom_domains")
      .insert({
        profile_id: user.id,
        domain: rawDomain,
        status: "pending",
        verification_token: verificationToken,
      })
      .select()
      .single();

    if (createError) {
      if (createError.code === "23505") {
        return NextResponse.json(
          { error: "This domain is already in use by another account" },
          { status: 409 }
        );
      }
      console.error("Domain creation error:", createError);
      return NextResponse.json(
        { error: "Failed to add domain" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, domain: created });
  } catch (error) {
    console.error("Domain add error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE — remove the user's custom domain
 */
export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { error: deleteError } = await admin
      .from("custom_domains")
      .delete()
      .eq("profile_id", user.id);

    if (deleteError) {
      console.error("Domain delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to remove domain" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Domain delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
