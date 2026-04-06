export type PlanId = "free" | "pro" | "premium";

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number; // monthly in dollars
  stripePriceId: string | null;
  features: string[];
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    stripePriceId: null,
    features: [
      "Public profile page",
      "Up to 3 resume sections",
      "1 AI review per month",
      "Basic analytics (view count)",
      "Contact form (5/day)",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 12,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || null,
    features: [
      "Everything in Free",
      "Unlimited resume sections",
      "10 AI reviews per month",
      "Platform email (forwarding)",
      "Full analytics dashboard",
      "Full SEO controls",
      "3 profile templates",
      "Contact form (50/day)",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    price: 29,
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID || null,
    features: [
      "Everything in Pro",
      "Unlimited AI reviews",
      "Platform email (inbox mode)",
      "Platform phone number",
      "Voicemail with transcription",
      "Analytics export",
      "All templates + custom CSS",
      "Custom domain support",
      "Unlimited contact form",
    ],
  },
};

export function getPlan(tier: string): PlanConfig {
  return PLANS[(tier as PlanId)] || PLANS.free;
}
