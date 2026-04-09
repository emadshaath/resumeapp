import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Palette,
  Globe,
  Sparkles,
  BarChart3,
  Shield,
  ArrowRight,
  Mail,
  Phone,
  Search,
  Users,
  MessageSquare,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { FadeIn, StaggerChildren } from "@/components/landing/animations";
import { generateFAQJsonLd } from "@/lib/seo/json-ld";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rezm.ai";

export const metadata: Metadata = {
  title: "How It Works - Build Your Professional Profile in Minutes",
  description:
    "Learn how rezm.ai works step by step: create your profile, add experience, get AI review, share your link, and track visitors. Get a professional online presence in under 5 minutes.",
  keywords: [
    "how rezm.ai works",
    "create online resume",
    "build resume profile",
    "resume builder steps",
    "professional profile setup",
    "AI resume review",
  ],
  openGraph: {
    title: "How rezm.ai Works - Professional Profile in Minutes",
    description:
      "Step-by-step guide to building your professional online resume profile with rezm.ai.",
    url: `${APP_URL}/how-it-works`,
    type: "website",
  },
  alternates: {
    canonical: `${APP_URL}/how-it-works`,
  },
};

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Sign up and claim your subdomain",
    description:
      "Create a free account and choose your personal subdomain. Your profile goes live instantly at yourname.rezm.ai.",
    details: [
      "Pick a memorable slug (your name, initials, or brand)",
      "Your profile URL is live immediately",
      "No credit card required to start",
    ],
    illustration: (
      <div className="relative mx-auto w-48 h-32 rounded-lg border-2 border-dashed border-brand/30 bg-brand-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full bg-brand/20 flex items-center justify-center mx-auto mb-2">
            <UserPlus className="h-6 w-6 text-brand" />
          </div>
          <div className="text-xs font-mono text-brand bg-white dark:bg-zinc-900 rounded px-2 py-0.5 border border-brand/20">
            yourname.rezm.ai
          </div>
        </div>
      </div>
    ),
  },
  {
    number: "02",
    icon: Palette,
    title: "Build your profile content",
    description:
      "Add your experience, education, skills, projects, and certifications using our intuitive section editor.",
    details: [
      "Drag-and-drop section ordering",
      "Rich text with markdown support",
      "Choose from 5 professional themes",
    ],
    illustration: (
      <div className="relative mx-auto w-48 space-y-2">
        {["Experience", "Education", "Skills"].map((s, i) => (
          <div
            key={s}
            className="flex items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs"
            style={{ transform: `translateX(${i * 4}px)` }}
          >
            <div className="h-2 w-2 rounded-full bg-brand" />
            <span className="text-zinc-700 dark:text-zinc-300">{s}</span>
            <div className="ml-auto text-zinc-400">::</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Get AI-powered feedback",
    description:
      "Run an AI review to analyze your resume for clarity, impact, ATS compatibility, and completeness. Get a score and actionable suggestions.",
    details: [
      "Checks clarity, impact, and keyword coverage",
      "ATS compatibility scoring",
      "Line-by-line improvement suggestions",
    ],
    illustration: (
      <div className="relative mx-auto w-48 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-brand" />
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">AI Review</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div className="h-1.5 w-[85%] rounded-full bg-green-500" />
            </div>
            <span className="text-[10px] font-mono text-green-600">85</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div className="h-1.5 w-[72%] rounded-full bg-yellow-500" />
            </div>
            <span className="text-[10px] font-mono text-yellow-600">72</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div className="h-1.5 w-[93%] rounded-full bg-green-500" />
            </div>
            <span className="text-[10px] font-mono text-green-600">93</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: "04",
    icon: Globe,
    title: "Share your link everywhere",
    description:
      "Drop your rezm.ai link in your email signature, LinkedIn, Twitter, and anywhere else. One link to your entire professional story.",
    details: [
      "Beautiful Open Graph previews on social media",
      "SEO-optimized for Google ranking",
      "Mobile-responsive design",
    ],
    illustration: (
      <div className="relative mx-auto w-48 space-y-2">
        {[
          { label: "LinkedIn", color: "bg-blue-500" },
          { label: "Email Signature", color: "bg-zinc-700" },
          { label: "Twitter / X", color: "bg-zinc-900 dark:bg-white" },
        ].map((p) => (
          <div
            key={p.label}
            className="flex items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs"
          >
            <div className={`h-2.5 w-2.5 rounded-sm ${p.color}`} />
            <span className="text-zinc-600 dark:text-zinc-400">{p.label}</span>
            <ArrowRight className="h-3 w-3 ml-auto text-zinc-300" />
          </div>
        ))}
      </div>
    ),
  },
  {
    number: "05",
    icon: BarChart3,
    title: "Track visitors and grow",
    description:
      "See who visits your profile, where they come from, and which sections they view. Use insights to optimize your content.",
    details: [
      "Privacy-respecting analytics (no cookies)",
      "Referrer tracking and geographic data",
      "View trends over time",
    ],
    illustration: (
      <div className="relative mx-auto w-48 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3">
        <div className="flex items-end gap-1 h-16">
          {[30, 45, 35, 60, 50, 72, 65].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-brand/20"
              style={{ height: `${h}%` }}
            >
              <div
                className="w-full rounded-sm bg-brand"
                style={{ height: `${Math.min(h + 10, 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
          <span>Mon</span>
          <span>Sun</span>
        </div>
      </div>
    ),
  },
  {
    number: "06",
    icon: Shield,
    title: "Stay protected with secure channels",
    description:
      "Recruiters contact you through your platform email and optional phone number. Your personal details stay private.",
    details: [
      "Platform email: yourname@rezm.ai",
      "Dedicated phone number (Premium)",
      "Contact form with spam filtering",
    ],
    illustration: (
      <div className="relative mx-auto w-48 space-y-2">
        <div className="flex items-center gap-2 rounded-md border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 px-3 py-2 text-xs">
          <Mail className="h-3.5 w-3.5 text-green-600" />
          <span className="text-green-700 dark:text-green-400">you@rezm.ai</span>
          <CheckCircle2 className="h-3 w-3 ml-auto text-green-500" />
        </div>
        <div className="flex items-center gap-2 rounded-md border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 px-3 py-2 text-xs">
          <Phone className="h-3.5 w-3.5 text-green-600" />
          <span className="text-green-700 dark:text-green-400">+1 (555) ***-****</span>
          <CheckCircle2 className="h-3 w-3 ml-auto text-green-500" />
        </div>
      </div>
    ),
  },
];

const capabilities = [
  {
    icon: Search,
    title: "SEO Built In",
    text: "Every profile gets automatic meta tags, structured data, Open Graph images, and sitemap inclusion. You rank on Google without any technical effort.",
  },
  {
    icon: Sparkles,
    title: "AI Resume Review",
    text: "Our AI analyzes your profile for clarity, impact, ATS compatibility, and keywords. Get a score and actionable line-by-line suggestions.",
  },
  {
    icon: Users,
    title: "Peer Review",
    text: "Share a pseudonymized version of your resume with mentors for honest feedback. They see your content, not your identity.",
  },
  {
    icon: MessageSquare,
    title: "Secure Contact Form",
    text: "Visitors reach you through your profile's built-in contact form. Messages arrive at your platform email. No personal details exposed.",
  },
  {
    icon: FileText,
    title: "PDF Export",
    text: "Download your profile as a professionally formatted PDF. Choose from multiple templates. Share it with employers who need a document.",
  },
  {
    icon: BarChart3,
    title: "Visitor Analytics",
    text: "Track who views your profile, where they come from, and which sections they spend time on. Privacy-respecting, no cookies needed.",
  },
];

const howItWorksFaqs = [
  {
    question: "How long does it take to set up a rezm.ai profile?",
    answer:
      "Most users have a complete, published profile in under 5 minutes. Sign up, pick your subdomain, add your headline and experience, and your profile is live.",
  },
  {
    question: "Do I need any technical knowledge to use rezm.ai?",
    answer:
      "No. rezm.ai is designed for everyone. The section editor uses simple forms. SEO, structured data, and meta tags are all handled automatically.",
  },
  {
    question: "Can I change my subdomain after signing up?",
    answer:
      "Yes, you can change your slug from the dashboard settings at any time. The new URL takes effect immediately, and the old URL will no longer work.",
  },
  {
    question: "What happens if I cancel my paid plan?",
    answer:
      "Your profile stays live on the free plan. You keep your subdomain and published content. Paid features (extra AI reviews, email forwarding, phone number, peer review) are disabled until you re-subscribe.",
  },
];

export default function HowItWorksPage() {
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Create a Professional Resume Profile on rezm.ai",
    description:
      "Step-by-step guide to building a professional online resume profile with custom subdomain, AI review, and visitor analytics.",
    totalTime: "PT5M",
    step: steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.title,
      text: step.description,
      url: `${APP_URL}/how-it-works#step-${step.number}`,
    })),
  };

  const faqJsonLd = generateFAQJsonLd(howItWorksFaqs);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
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
              Ready in under 5 minutes
            </Badge>
          </FadeIn>
          <FadeIn>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              How <span className="text-brand">rezm.ai</span> works
            </h1>
          </FadeIn>
          <FadeIn delay={100}>
            <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              From sign-up to a live, SEO-optimized professional profile with
              secure communication channels. Here is exactly what happens.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Steps */}
      <section className="pb-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="space-y-16 md:space-y-24">
            {steps.map((step, i) => (
              <FadeIn key={step.number} delay={i * 50}>
                <div
                  id={`step-${step.number}`}
                  className={`flex flex-col ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} items-center gap-10 md:gap-16`}
                >
                  {/* Text side */}
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: "var(--brand)" }}
                      >
                        {step.number}
                      </div>
                      <step.icon className="h-5 w-5 text-brand" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-3">
                      {step.title}
                    </h2>
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                      {step.description}
                    </p>
                    <ul className="space-y-2">
                      {step.details.map((detail) => (
                        <li
                          key={detail}
                          className="flex items-start gap-2 text-sm text-zinc-500"
                        >
                          <CheckCircle2 className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Illustration side */}
                  <div className="flex-1 flex items-center justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 -z-10 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 scale-110" />
                      <div className="p-8">{step.illustration}</div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Connecting line between steps section and capabilities */}
      <div className="flex justify-center py-4">
        <div className="h-16 w-px bg-gradient-to-b from-zinc-200 to-transparent dark:from-zinc-700" />
      </div>

      {/* Capabilities grid */}
      <section className="py-20 bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold tracking-tight">
                What you get with every profile
              </h2>
              <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                Every feature is designed to help you get found, stay safe, and
                present yourself professionally.
              </p>
            </div>
          </FadeIn>
          <StaggerChildren
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            staggerMs={80}
          >
            {capabilities.map((cap) => (
              <Card
                key={cap.title}
                className="border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-3 bg-brand-muted">
                    <cap.icon className="h-5 w-5 text-brand" />
                  </div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    {cap.title}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {cap.text}
                  </p>
                </CardContent>
              </Card>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* FAQ for this page */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <h2 className="text-2xl font-bold tracking-tight text-center mb-10">
              Common questions
            </h2>
          </FadeIn>
          <StaggerChildren className="space-y-4" staggerMs={80}>
            {howItWorksFaqs.map((faq) => (
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
              Ready to try it yourself?
            </h2>
            <p className="mt-4 text-white/70">
              Create your free professional profile in under 5 minutes.
            </p>
            <Link href="/signup">
              <Button
                size="lg"
                className="mt-8 bg-white text-brand hover:bg-zinc-100"
              >
                Get Started for Free
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
