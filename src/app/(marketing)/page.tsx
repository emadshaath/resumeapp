import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Globe,
  Sparkles,
  Mail,
  Phone,
  BarChart3,
  Search,
  Lock,
  Layers,
  Check,
} from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "Custom Subdomain",
    description: "Get your own professional URL like yourname.resumeprofile.com. Share it anywhere.",
  },
  {
    icon: Shield,
    title: "Anti-Scam Protection",
    description: "Your personal details stay hidden. All communication goes through our secure platform.",
  },
  {
    icon: Sparkles,
    title: "AI Resume Review",
    description: "Get intelligent recommendations to improve your resume with ATS compatibility scoring.",
  },
  {
    icon: Mail,
    title: "Platform Email",
    description: "Receive emails at yourname@resumeprofile.com. Forward to your inbox or read in-app.",
  },
  {
    icon: Phone,
    title: "Dedicated Phone Number",
    description: "Get a phone number that forwards to you or takes voicemail. With call screening.",
  },
  {
    icon: BarChart3,
    title: "Visitor Analytics",
    description: "See who views your profile, where they come from, and how they found you.",
  },
  {
    icon: Search,
    title: "SEO Optimized",
    description: "Automatic meta tags, structured data, and sitemap. Be found on Google.",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "No cookie banners needed. Privacy-respecting analytics. Your data stays yours.",
  },
  {
    icon: Layers,
    title: "Easy Section Editor",
    description: "Drag-and-drop sections for experience, education, skills, projects, and more.",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Get started with a professional profile",
    features: [
      "Public profile with subdomain",
      "Up to 3 resume sections",
      "1 AI review per month",
      "Basic visitor count",
      "Contact form (5/day)",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/month",
    description: "Everything you need to stand out",
    features: [
      "Unlimited resume sections",
      "10 AI reviews per month",
      "Platform email (forwarding)",
      "Full analytics dashboard",
      "Contact form (50/day)",
      "SEO controls",
      "3 profile templates",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Premium",
    price: "$29",
    period: "/month",
    description: "The complete professional identity",
    features: [
      "Everything in Pro",
      "Dedicated phone number",
      "Email inbox in-app",
      "Unlimited AI reviews",
      "All templates + custom CSS",
      "Unlimited contacts",
      "Custom domain support",
      "Priority support",
    ],
    cta: "Start Premium Trial",
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Badge variant="secondary" className="mb-6">
            Your Professional Identity, Secured
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            One link for your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-600 to-zinc-900 dark:from-zinc-300 dark:to-white">
              entire resume
            </span>
          </h1>
          <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Create a beautiful, SEO-optimized resume profile with your own subdomain.
            Get a platform email and phone number that protect your personal details.
            Let AI review and improve your resume.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="px-8">
                Create Your Profile
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg">
                See Features
              </Button>
            </a>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            Free to start. No credit card required.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything you need for your professional presence
            </h2>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              From AI-powered resume review to secure communication channels,
              we have every tool to present yourself professionally.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border-zinc-200 dark:border-zinc-800">
                <CardHeader>
                  <feature.icon className="h-8 w-8 text-zinc-700 dark:text-zinc-300 mb-2" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              Start for free, upgrade when you need more.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlighted
                    ? "border-zinc-900 dark:border-zinc-100 shadow-lg scale-105"
                    : "border-zinc-200 dark:border-zinc-800"
                }
              >
                <CardHeader>
                  {plan.highlighted && (
                    <Badge className="w-fit mb-2">Most Popular</Badge>
                  )}
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="pt-2">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-zinc-500">{plan.period}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className="block">
                    <Button
                      className="w-full"
                      variant={plan.highlighted ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-zinc-900 dark:bg-zinc-50">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white dark:text-zinc-900">
            Ready to build your professional profile?
          </h2>
          <p className="mt-4 text-zinc-400 dark:text-zinc-600">
            Join thousands of professionals who trust ResumeProfile for their online presence.
          </p>
          <Link href="/signup">
            <Button size="lg" className="mt-8 bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800">
              Get Started for Free
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
