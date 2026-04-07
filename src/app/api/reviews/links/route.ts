import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasFeature, getLimit } from "@/lib/stripe/feature-gate";
import { z } from "zod";
import { createHash } from "crypto";
import type { Tier } from "@/types/database";

const createLinkSchema = z.object({
  pseudonymize_options: z.object({
    name: z.boolean(),
    email: z.boolean(),
    phone: z.boolean(),
    location: z.boolean(),
    companies: z.boolean(),
  }),
  expires_in: z.enum(["24h", "7d", "30d"]),
  password: z.string().max(100).optional(),
});

const EXPIRY_MS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function hashPassword(token: string, password: string): string {
  return createHash("sha256").update(token + password).digest("hex");
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check tier
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier")
      .eq("id", user.id)
      .single();

    if (!profile || !hasFeature(profile.tier as Tier, "peer_review")) {
      return NextResponse.json(
        { error: "Peer review is a Premium feature. Please upgrade to access it." },
        { status: 403 }
      );
    }

    // Check link limit
    const admin = createAdminClient();
    const { count } = await admin
      .from("review_links")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .eq("is_active", true);

    const limit = getLimit(profile.tier as Tier, "review_links_max");
    if ((count ?? 0) >= limit) {
      return NextResponse.json(
        { error: "Review link limit reached" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { pseudonymize_options, expires_in, password } = parsed.data;
    const token = crypto.randomUUID();
    const expires_at = new Date(Date.now() + EXPIRY_MS[expires_in]).toISOString();
    const password_hash = password ? hashPassword(token, password) : null;

    const { data: link, error } = await admin
      .from("review_links")
      .insert({
        profile_id: user.id,
        token,
        pseudonymize_options,
        expires_at,
        password_hash,
      })
      .select()
      .single();

    if (error) {
      console.error("Review link insert error:", error);
      return NextResponse.json({ error: "Failed to create review link" }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.json({
      id: link.id,
      token,
      url: `${appUrl}/review/${token}`,
      expires_at,
      has_password: !!password_hash,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get all links for the user
    const { data: links, error } = await admin
      .from("review_links")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch links" }, { status: 500 });
    }

    // Get comment counts per link
    const linkIds = (links || []).map((l: { id: string }) => l.id);
    let commentCounts: Record<string, number> = {};

    if (linkIds.length > 0) {
      const { data: counts } = await admin
        .from("review_comments")
        .select("review_link_id")
        .in("review_link_id", linkIds);

      if (counts) {
        commentCounts = counts.reduce((acc: Record<string, number>, c: { review_link_id: string }) => {
          acc[c.review_link_id] = (acc[c.review_link_id] || 0) + 1;
          return acc;
        }, {});
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const enriched = (links || []).map((link: Record<string, unknown>) => ({
      ...link,
      password_hash: undefined,
      has_password: !!link.password_hash,
      comment_count: commentCounts[link.id as string] || 0,
      url: `${appUrl}/review/${link.token}`,
      status: !(link.is_active as boolean)
        ? "deactivated"
        : new Date(link.expires_at as string) < new Date()
          ? "expired"
          : "active",
    }));

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
