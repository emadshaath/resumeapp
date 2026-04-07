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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    const { plan } = parsed.data;
    const planConfig = PLANS[plan as PlanId];

    if (!planConfig.stripePriceId) {
      return NextResponse.json({ error: "Plan not configured." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, email, stripe_customer_id, tier, tier_override")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    // Don't allow checkout if already on this plan or higher
    const effectiveTier = getEffectiveTier(profile.tier as Tier, profile.tier_override as Tier | null);
    if (effectiveTier === plan || (effectiveTier === "premium" && plan === "pro")) {
      return NextResponse.json(
        { error: "You are already on this plan or a higher one." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000";

    // Get or create Stripe customer
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

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: planConfig.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard/billing?success=true`,
      cancel_url: `${baseUrl}/dashboard/billing?canceled=true`,
      subscription_data: {
        metadata: { profile_id: profile.id, plan },
      },
      metadata: { profile_id: profile.id, plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session." }, { status: 500 });
  }
}
