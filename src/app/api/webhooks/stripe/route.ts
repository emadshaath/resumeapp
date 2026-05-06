import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { getPlan } from "@/lib/stripe/config";
import {
  sendSubscriptionReceipt,
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
} from "@/lib/resend/send";
import type Stripe from "stripe";

type AdminClient = ReturnType<typeof createAdminClient>;

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

    // Idempotency: Stripe retries deliveries on any non-2xx response, and
    // sometimes redelivers anyway. The first time we process an event we
    // insert its id; on retry, the conflicting insert tells us to skip.
    const { error: dupErr } = await admin
      .from("stripe_webhook_events")
      .insert({ event_id: event.id, type: event.type });
    if (dupErr) {
      // 23505 = unique_violation. Anything else is unexpected but we still
      // ack the event so Stripe doesn't loop on us.
      if ((dupErr as { code?: string }).code === "23505") {
        return NextResponse.json({ received: true, duplicate: true });
      }
      console.error("Failed to insert webhook event id:", dupErr);
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(admin, session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpserted(admin, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(admin, subscription);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(admin, invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(admin, invoice);
        break;
      }

      default:
        // Unhandled event type — acknowledge and ignore.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}

async function handleCheckoutCompleted(
  admin: AdminClient,
  session: Stripe.Checkout.Session
) {
  const profileId = session.metadata?.profile_id;
  const plan = session.metadata?.plan;
  const subscriptionId = session.subscription as string;

  if (!profileId || !plan) {
    console.error("Checkout completed without profile_id or plan metadata");
    return;
  }

  await admin
    .from("profiles")
    .update({
      tier: plan,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: session.customer as string,
    })
    .eq("id", profileId);
}

async function handleSubscriptionUpserted(
  admin: AdminClient,
  subscription: Stripe.Subscription
) {
  const profileId = await resolveProfileId(admin, subscription);
  if (!profileId) return;
  await applySubscriptionState(admin, profileId, subscription);
}

async function applySubscriptionState(
  admin: AdminClient,
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

  const periodEndUnix =
    (subscription as unknown as { current_period_end?: number }).current_period_end ?? null;

  await admin
    .from("profiles")
    .update({
      tier,
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      current_period_end: periodEndUnix
        ? new Date(periodEndUnix * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq("id", profileId);

  if (tier === "free" || tier === "pro") {
    await handleDowngrade(admin, profileId, tier);
  }
}

async function handleSubscriptionDeleted(
  admin: AdminClient,
  subscription: Stripe.Subscription
) {
  const profileId = await resolveProfileId(admin, subscription);
  if (!profileId) return;

  // Capture previous plan name before resetting, so the email can mention it.
  const { data: prevProfile } = await admin
    .from("profiles")
    .select("tier, email, first_name")
    .eq("id", profileId)
    .single();
  const previousTier = (prevProfile?.tier as string | undefined) ?? "pro";

  await admin
    .from("profiles")
    .update({
      tier: "free",
      stripe_subscription_id: null,
      subscription_status: subscription.status,
      cancel_at_period_end: false,
    })
    .eq("id", profileId);

  await handleDowngrade(admin, profileId, "free");

  if (prevProfile?.email) {
    try {
      await sendSubscriptionCanceledEmail({
        to: prevProfile.email,
        firstName: prevProfile.first_name ?? "there",
        previousPlan: getPlan(previousTier).name,
      });
    } catch (err) {
      console.error("sendSubscriptionCanceledEmail failed:", err);
    }
  }
}

async function handleInvoicePaid(admin: AdminClient, invoice: Stripe.Invoice) {
  // Subscription invoices only — ignore one-off invoices.
  const subscriptionId =
    (invoice as unknown as { subscription?: string | null }).subscription ?? null;
  if (!subscriptionId) return;

  const customerId = invoice.customer as string;
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, first_name, tier")
    .eq("stripe_customer_id", customerId)
    .single();
  if (!profile?.email) return;

  const paidAt = invoice.status_transitions?.paid_at ?? Math.floor(Date.now() / 1000);

  await admin
    .from("profiles")
    .update({
      last_payment_at: new Date(paidAt * 1000).toISOString(),
      payment_failed_at: null,
    })
    .eq("id", profile.id);

  const periodEnd =
    (invoice as unknown as { period_end?: number }).period_end ?? null;
  const planName = getPlan(profile.tier as string).name;

  try {
    await sendSubscriptionReceipt({
      to: profile.email,
      firstName: profile.first_name ?? "there",
      planName,
      amountFormatted: formatAmount(invoice.amount_paid, invoice.currency),
      invoiceNumber: invoice.number ?? null,
      paidAt: formatDate(paidAt),
      periodEnd: periodEnd ? formatDate(periodEnd) : "—",
    });
  } catch (err) {
    console.error("sendSubscriptionReceipt failed:", err);
  }
}

async function handlePaymentFailed(admin: AdminClient, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, first_name, tier")
    .eq("stripe_customer_id", customerId)
    .single();
  if (!profile?.email) {
    console.warn(`Payment failed for customer ${customerId}, no profile match`);
    return;
  }

  await admin
    .from("profiles")
    .update({ payment_failed_at: new Date().toISOString() })
    .eq("id", profile.id);

  const nextRetry =
    (invoice as unknown as { next_payment_attempt?: number | null })
      .next_payment_attempt ?? null;
  const attemptCount = invoice.attempt_count ?? 1;
  const planName = getPlan(profile.tier as string).name;

  try {
    await sendPaymentFailedEmail({
      to: profile.email,
      firstName: profile.first_name ?? "there",
      planName,
      amountFormatted: formatAmount(invoice.amount_due, invoice.currency),
      attemptCount,
      nextRetryAt: nextRetry ? formatDate(nextRetry) : null,
    });
  } catch (err) {
    console.error("sendPaymentFailedEmail failed:", err);
  }
}

/**
 * Clean up features that are no longer available after a downgrade.
 */
async function handleDowngrade(
  admin: AdminClient,
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

async function resolveProfileId(
  admin: AdminClient,
  subscription: Stripe.Subscription
): Promise<string | null> {
  const fromMetadata = subscription.metadata?.profile_id;
  if (fromMetadata) return fromMetadata;

  const customerId = subscription.customer as string;
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();
  return profile?.id ?? null;
}

function formatAmount(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
