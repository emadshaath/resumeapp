import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import type Stripe from "stripe";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: "Missing signature or webhook secret." }, { status: 400 });
    }

    const stripe = getStripe();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }

    const admin = createAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(admin, session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(admin, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(admin, subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(admin, invoice);
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}

async function handleCheckoutCompleted(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session
) {
  const profileId = session.metadata?.profile_id;
  const plan = session.metadata?.plan;
  const subscriptionId = session.subscription as string;

  if (!profileId || !plan) {
    console.error("Checkout completed without profile_id or plan metadata");
    return;
  }

  await admin.from("profiles").update({
    tier: plan,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: session.customer as string,
  }).eq("id", profileId);
}

async function handleSubscriptionUpdated(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription
) {
  const profileId = subscription.metadata?.profile_id;
  if (!profileId) {
    // Try to find by customer ID
    const customerId = subscription.customer as string;
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();
    if (!profile) return;
    await updateSubscriptionTier(admin, profile.id, subscription);
    return;
  }

  await updateSubscriptionTier(admin, profileId, subscription);
}

async function updateSubscriptionTier(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  subscription: Stripe.Subscription
) {
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
  const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID;

  // Determine tier from subscription items
  const priceId = subscription.items.data[0]?.price?.id;
  let tier = "free";

  if (priceId === premiumPriceId) {
    tier = "premium";
  } else if (priceId === proPriceId) {
    tier = "pro";
  }

  // If subscription is not active, downgrade to free
  if (subscription.status !== "active" && subscription.status !== "trialing") {
    tier = "free";
  }

  await admin.from("profiles").update({
    tier,
    stripe_subscription_id: subscription.id,
  }).eq("id", profileId);

  // Handle downgrade cleanup
  if (tier === "free" || tier === "pro") {
    await handleDowngrade(admin, profileId, tier);
  }
}

async function handleSubscriptionDeleted(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) return;

  await admin.from("profiles").update({
    tier: "free",
    stripe_subscription_id: null,
  }).eq("id", profile.id);

  await handleDowngrade(admin, profile.id, "free");
}

async function handlePaymentFailed(
  admin: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice
) {
  // Log payment failure — Stripe will retry automatically
  // Could send an email notification here
  const customerId = invoice.customer as string;
  console.warn(`Payment failed for customer ${customerId}, invoice ${invoice.id}`);
}

/**
 * Clean up features that are no longer available after a downgrade.
 */
async function handleDowngrade(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  newTier: string
) {
  // If downgraded from Premium, deactivate phone number
  if (newTier !== "premium") {
    await admin
      .from("platform_phones")
      .update({ is_active: false })
      .eq("profile_id", profileId);

    // Switch email routing from inbox to forward if downgraded from Premium
    if (newTier !== "premium") {
      await admin
        .from("platform_emails")
        .update({ routing_mode: "forward" })
        .eq("profile_id", profileId)
        .eq("routing_mode", "inbox");
    }
  }

  // If downgraded to Free, deactivate platform email
  if (newTier === "free") {
    await admin
      .from("platform_emails")
      .update({ is_active: false })
      .eq("profile_id", profileId);
  }
}
