import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Crown } from "lucide-react";
import { PLANS } from "@/lib/stripe/config";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rezm.ai";

export const metadata: Metadata = {
  title: "Pricing — rezm.ai",
  description:
    "Free, Pro, and Premium plans for rezm.ai. Public profile, AI reviews, platform email, and custom domains. Upgrade anytime, cancel anytime.",
  openGraph: {
    title: "Pricing — rezm.ai",
    description:
      "Free, Pro, and Premium plans for rezm.ai. Upgrade anytime, cancel anytime.",
    url: `${APP_URL}/pricing`,
    type: "website",
  },
  alternates: {
    canonical: `${APP_URL}/pricing`,
  },
};

const FEATURES_BY_PLAN: Record<"free" | "pro" | "premium", string[]> = {
  free: PLANS.free.features,
  pro: PLANS.pro.features,
  premium: PLANS.premium.features,
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Simple, predictable pricing
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          Start free. Upgrade when you need more reviews, custom domains, or
          platform email. No hidden fees, cancel anytime.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <PlanCard
          tier="free"
          name={PLANS.free.name}
          price={PLANS.free.price}
          tagline="Get your professional profile online."
          features={FEATURES_BY_PLAN.free}
          ctaHref="/signup"
          ctaLabel="Sign up free"
          ctaVariant="outline"
        />
        <PlanCard
          tier="pro"
          name={PLANS.pro.name}
          price={PLANS.pro.price}
          tagline="More AI reviews, full analytics, profile templates."
          features={FEATURES_BY_PLAN.pro}
          ctaHref="/signup?plan=pro"
          ctaLabel="Start with Pro"
          ctaVariant="default"
          icon={<Sparkles className="h-3.5 w-3.5 mr-1" />}
        />
        <PlanCard
          tier="premium"
          name={PLANS.premium.name}
          price={PLANS.premium.price}
          tagline="Unlimited AI reviews, platform phone, custom domains."
          features={FEATURES_BY_PLAN.premium}
          ctaHref="/signup?plan=premium"
          ctaLabel="Start with Premium"
          ctaVariant="default"
          popular
          icon={<Crown className="h-3.5 w-3.5 mr-1" />}
        />
      </div>

      <div className="mt-16 text-center text-sm text-zinc-600 dark:text-zinc-400">
        <p>
          All paid plans renew monthly and can be canceled anytime from your{" "}
          <Link href="/dashboard/settings?tab=billing" className="underline">
            billing portal
          </Link>
          . Already have an account?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
          .
        </p>
      </div>

      <FaqSection />
    </div>
  );
}

function PlanCard({
  tier,
  name,
  price,
  tagline,
  features,
  ctaHref,
  ctaLabel,
  ctaVariant,
  popular,
  icon,
}: {
  tier: "free" | "pro" | "premium";
  name: string;
  price: number;
  tagline: string;
  features: string[];
  ctaHref: string;
  ctaLabel: string;
  ctaVariant: "default" | "outline";
  popular?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Card className={`relative ${popular ? "border-brand ring-1 ring-brand" : ""}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge>Most Popular</Badge>
        </div>
      )}
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          {icon}
          {name}
        </CardTitle>
        <CardDescription className="space-y-2">
          {price === 0 ? (
            <span className="text-3xl font-bold text-zinc-900 dark:text-white">Free</span>
          ) : (
            <span>
              <span className="text-3xl font-bold text-zinc-900 dark:text-white">${price}</span>
              <span className="text-zinc-500"> /month</span>
            </span>
          )}
          <span className="block text-sm text-zinc-600 dark:text-zinc-400">{tagline}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {features.map((feature) => (
            <li key={feature} className="text-sm flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span className="text-zinc-600 dark:text-zinc-400">{feature}</span>
            </li>
          ))}
        </ul>
        <Link href={ctaHref} className="block">
          <Button className="w-full" variant={ctaVariant}>
            {ctaLabel}
          </Button>
        </Link>
      </CardContent>
      {tier !== "free" && (
        <div className="px-6 pb-4 text-xs text-zinc-500 text-center">
          7-day refund, no questions asked.
        </div>
      )}
    </Card>
  );
}

function FaqSection() {
  const faqs = [
    {
      q: "Can I switch plans later?",
      a: "Yes — upgrade or downgrade anytime from your billing settings. Pro-rated charges apply via Stripe.",
    },
    {
      q: "What happens when I hit a usage limit?",
      a: "We'll tell you in-product and link to upgrade. Your data is never deleted; only feature access is paused.",
    },
    {
      q: "How do cancellations work?",
      a: "Cancel from the customer portal. You keep paid features until the end of the current billing period, then move to Free.",
    },
    {
      q: "Is there a free trial of paid plans?",
      a: "We don't run trials, but the Free plan lets you publish a real profile without a card. Upgrade only when you need more.",
    },
  ];

  return (
    <div className="mt-20 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold tracking-tight text-center mb-8">
        Frequently asked
      </h2>
      <div className="space-y-4">
        {faqs.map(({ q, a }) => (
          <div
            key={q}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4"
          >
            <h3 className="font-medium text-sm">{q}</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
