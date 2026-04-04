import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY must be set");
    stripeInstance = new Stripe(key, { apiVersion: "2025-03-31.basil" });
  }
  return stripeInstance;
}
