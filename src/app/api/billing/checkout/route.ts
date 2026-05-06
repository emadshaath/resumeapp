import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { PLANS, type PlanId } from "@/lib/stripe/config";
import { getEffectiveTier } from "@/lib/stripe/feature-gate";
import type { Tier } from "@/types/database";
import { z } from "zod";

const checkoutSchema = z.object({
  plan: z.enum(["pro", "premium"]),
});

type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; status: number; error: string };

async function createSession(plan: "pro" | "premium"): Promise<CheckoutResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const planConfig = PLANS[plan as PlanId];
  if (!planConfig.stripePriceId) {
    return { ok: false, status: 400, error: "Plan not configured." };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, stripe_customer_id, tier, tier_override")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { ok: false, status: 404, error: "Profile not found." };
  }

  const effectiveTier = getEffectiveTier(
    profile.tier as Tier,
    profile.tier_override as Tier | null
  );
  if (effectiveTier === plan || (effectiveTier === "premium" && plan === "pro")) {
    return {
      ok: false,
      status: 400,
      error: "You are already on this plan or a higher one.",
    };
  }

  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000";

  // Get or create Stripe customer (pre-fills email at Checkout).
  let customerId = profile.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email,
      metadata: { profile_id: profile.id },
    });
    customerId = customer.id;
    await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", profile.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    allow_promotion_codes: true,
    line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard/settings?tab=billing&success=true`,
    cancel_url: `${baseUrl}/dashboard/settings?tab=billing&canceled=true`,
    subscription_data: {
      metadata: { profile_id: profile.id, plan },
    },
    metadata: { profile_id: profile.id, plan },
  });

  if (!session.url) {
    return { ok: false, status: 500, error: "Stripe did not return a URL." };
  }

  return { ok: true, url: session.url };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    const result = await createSession(parsed.data.plan);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}

// GET path used by the email-confirm callback during signup→checkout flow:
// the user lands here freshly confirmed and we 302 them straight to Stripe.
export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const planParam = searchParams.get("plan");
    const parsed = checkoutSchema.safeParse({ plan: planParam });
    if (!parsed.success) {
      return NextResponse.redirect(
        `${origin}/dashboard/settings?tab=billing&error=invalid_plan`
      );
    }

    const result = await createSession(parsed.data.plan);
    if (!result.ok) {
      const reason = result.status === 401 ? "auth" : "checkout";
      return NextResponse.redirect(
        `${origin}/dashboard/settings?tab=billing&error=${reason}`
      );
    }
    return NextResponse.redirect(result.url);
  } catch (error) {
    console.error("Checkout GET error:", error);
    const { origin } = new URL(request.url);
    return NextResponse.redirect(
      `${origin}/dashboard/settings?tab=billing&error=checkout`
    );
  }
}
