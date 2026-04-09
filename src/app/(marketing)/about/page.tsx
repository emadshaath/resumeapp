import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Heart,
  Sparkles,
  Globe,
  ArrowRight,
  Target,
  Eye,
  Lock,
  Users,
  Lightbulb,
} from "lucide-react";
import { FadeIn, StaggerChildren } from "@/components/landing/animations";
import { generateFAQJsonLd } from "@/lib/seo/json-ld";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rezm.ai";

export const metadata: Metadata = {
  title: "About rezm.ai - Our Mission to Secure Your Professional Identity",
  description:
    "rezm.ai is a professional resume profile platform built on a simple idea: your professional identity should be yours to control. Learn about our mission, values, and the team behind the product.",
  keywords: [
    "about rezm.ai",
    "resume platform",
    "professional identity",
    "secure resume",
    "resume builder company",
    "career tools",
  ],
  openGraph: {
    title: "About rezm.ai - Your Professional Identity, Secured",
    description:
      "Learn about the mission, values, and team behind rezm.ai, the professional resume profile platform.",
    url: `${APP_URL}/about`,
    type: "website",
  },
  alternates: {
    canonical: `${APP_URL}/about`,
  },
};

const values = [
  {
    icon: Lock,
    title: "Privacy First",
    description:
      "Your personal contact details should never be exposed to strangers. We built secure communication channels so you can engage professionally without risk.",
  },
  {
    icon: Eye,
    title: "Transparency",
    description:
      "No dark patterns, no hidden fees, no data selling. Our analytics are cookie-free. Our pricing is clear. What you see is what you get.",
  },
  {
    icon: Sparkles,
    title: "AI for Good",
    description:
      "We use AI to help you present your best self, not to replace human judgment. Our AI review gives suggestions; you decide what to change.",
  },
  {
    icon: Heart,
    title: "Accessible to All",
    description:
      "Job searching is stressful enough. Our free plan is genuinely useful, and our community program gives Premium access to anyone currently between jobs.",
  },
  {
    icon: Users,
    title: "Community Driven",
    description:
      "Features like Peer Review exist because our users asked for them. We build what professionals actually need, not what looks good in a pitch deck.",
  },
  {
    icon: Lightbulb,
    title: "Continuous Improvement",
    description:
      "We ship improvements every week. Your profile gets better over time even if you do not change it, because we continuously improve our SEO, performance, and design.",
  },
];

const milestones = [
  { year: "2024", event: "rezm.ai founded with a focus on secure professional identity" },
  { year: "2024", event: "Launched public profiles with custom subdomains" },
  { year: "2025", event: "Added AI-powered resume review and platform email" },
  { year: "2025", event: "Introduced Peer Review for anonymous resume feedback" },
  { year: "2025", event: "Launched community program: free Premium for job seekers" },
  { year: "2026", event: "Added dedicated phone numbers and visitor analytics dashboard" },
];

const aboutFaqs = [
  {
    question: "What is rezm.ai?",
    answer:
      "rezm.ai is a professional resume profile platform that gives you a beautiful, SEO-optimized online resume at your own subdomain (yourname.rezm.ai). It includes secure communication channels (platform email and phone number), AI-powered resume review, anonymous peer review, visitor analytics, and PDF export. It is designed to help professionals get found online while keeping their personal information private.",
  },
  {
    question: "Who is rezm.ai for?",
    answer:
      "rezm.ai is for any professional who wants an online presence beyond LinkedIn. It is especially valuable for job seekers who want to be found by recruiters on Google and AI search, freelancers building a professional brand, career changers who need a clean way to present transferable skills, and anyone concerned about sharing personal contact information during a job search.",
  },
  {
    question: "How is rezm.ai different from LinkedIn?",
    answer:
      "LinkedIn is a social network. rezm.ai is your own professional web page. Your rezm.ai profile lives at your own subdomain, is fully SEO-optimized for Google, and gives you control over your privacy (secure email, phone number, no ads). You own your URL and your presentation. There are no algorithmic feeds, connection requests, or recruiter spam.",
  },
  {
    question: "How is rezm.ai different from other resume builders?",
    answer:
      "Most resume builders create PDFs. rezm.ai creates a live web page that is indexed by Google and AI search engines. It includes features no PDF builder offers: a secure platform email address, a dedicated phone number, AI-powered review, anonymous peer review, visitor analytics, and automatic SEO. Your profile is not a static file; it is a living professional presence.",
  },
  {
    question: "Is rezm.ai free?",
    answer:
      "Yes. The free plan includes a public profile at your own subdomain, up to 3 resume sections, 1 AI review per month, basic visitor count, and a contact form. Paid plans (Pro at $12/month, Premium at $29/month) add more sections, AI reviews, platform email, phone number, analytics, peer review, and SEO controls. If you are currently unemployed, we offer free Premium access through our community program.",
  },
  {
    question: "How does rezm.ai make money?",
    answer:
      "rezm.ai makes money through paid subscriptions (Pro and Premium plans). We do not sell user data, show ads, or monetize your content in any way. Our business model is simple: we build a product worth paying for.",
  },
];

export default function AboutPage() {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "rezm.ai",
    url: APP_URL,
    logo: `${APP_URL}/icon.svg`,
    description:
      "Professional resume profile platform with custom subdomains, secure email, AI-powered resume review, peer review, and visitor analytics.",
    foundingDate: "2024",
    contactPoint: {
      "@type": "ContactPoint",
      email: "community@rezm.ai",
      contactType: "customer support",
    },
    sameAs: [] as string[],
  };

  const faqJsonLd = generateFAQJsonLd(aboutFaqs);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: APP_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "About",
        item: `${APP_URL}/about`,
      },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Hero */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-[0.05] blur-3xl"
            style={{ background: "radial-gradient(circle, var(--brand), transparent 70%)" }}
          />
        </div>
        <div className="mx-auto max-w-4xl px-6 text-center">
          <FadeIn direction="none">
            <Badge variant="secondary" className="mb-6">
              About rezm.ai
            </Badge>
          </FadeIn>
          <FadeIn>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Your professional identity should be{" "}
              <span className="text-brand">yours</span>
            </h1>
          </FadeIn>
          <FadeIn delay={100}>
            <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              rezm.ai was built on a simple idea: professionals deserve a
              beautiful, findable online presence that they control — without
              sacrificing their privacy or paying a fortune.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-brand" />
                  <h2 className="text-2xl font-bold tracking-tight">Our Mission</h2>
                </div>
                <div className="space-y-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  <p>
                    The job market has a fundamental problem: to be found by
                    employers, you have to expose your personal information to
                    strangers. Every resume you send includes your email, phone,
                    and sometimes your address.
                  </p>
                  <p>
                    We built rezm.ai to solve this. Your profile lives at your
                    own subdomain. Recruiters contact you through your platform
                    email and phone number. You see who visits your profile. And
                    AI helps you put your best foot forward.
                  </p>
                  <p>
                    Our mission is to give every professional a secure,
                    beautiful, and findable online identity — regardless of their
                    technical skill or budget.
                  </p>
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={200}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Globe, label: "Custom Subdomains", value: "yourname.rezm.ai" },
                  { icon: Shield, label: "Privacy Channels", value: "Email + Phone" },
                  { icon: Sparkles, label: "AI Review", value: "Score + Tips" },
                  { icon: Heart, label: "Community", value: "Free for Seekers" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-center"
                  >
                    <item.icon className="h-6 w-6 text-brand mx-auto mb-2" />
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      {item.label}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold tracking-tight">Our Values</h2>
              <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                The principles that guide every decision we make.
              </p>
            </div>
          </FadeIn>
          <StaggerChildren
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            staggerMs={80}
          >
            {values.map((value) => (
              <Card
                key={value.title}
                className="border-zinc-200 dark:border-zinc-800"
              >
                <CardContent className="pt-6">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-3 bg-brand-muted">
                    <value.icon className="h-5 w-5 text-brand" />
                  </div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    {value.title}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <h2 className="text-2xl font-bold tracking-tight text-center mb-12">
              Our Journey
            </h2>
          </FadeIn>
          <div className="relative">
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800 -translate-x-1/2" />
            <div className="space-y-8">
              {milestones.map((milestone, i) => (
                <FadeIn key={i} delay={i * 80}>
                  <div
                    className={`relative flex items-start gap-4 md:gap-8 ${
                      i % 2 === 0
                        ? "md:flex-row"
                        : "md:flex-row-reverse md:text-right"
                    }`}
                  >
                    <div className="hidden md:block flex-1" />
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-brand bg-white dark:bg-zinc-950">
                      <div className="h-2.5 w-2.5 rounded-full bg-brand" />
                    </div>
                    <div className="flex-1 pb-2">
                      <span className="text-xs font-bold text-brand">
                        {milestone.year}
                      </span>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-0.5">
                        {milestone.event}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI-Optimized Q&A Section */}
      <section className="py-20 bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <h2 className="text-2xl font-bold tracking-tight text-center mb-10">
              Frequently Asked Questions
            </h2>
          </FadeIn>
          <StaggerChildren className="space-y-4" staggerMs={80}>
            {aboutFaqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 text-left font-medium text-zinc-900 dark:text-zinc-100 [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <span className="text-zinc-400 transition-transform group-open:rotate-45 text-xl leading-none select-none">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5 pt-0 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-20"
        style={{
          background:
            "linear-gradient(135deg, var(--hero-from), var(--hero-to))",
        }}
      >
        <div className="mx-auto max-w-4xl px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Join thousands of professionals on rezm.ai
            </h2>
            <p className="mt-4 text-white/70">
              Your professional identity deserves better than a PDF.
            </p>
            <Link href="/signup">
              <Button
                size="lg"
                className="mt-8 bg-white text-brand hover:bg-zinc-100"
              >
                Create Your Profile
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
