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
  ArrowRight,
  Users,
  Eye,
  Star,
  ClipboardCheck,
  MessageSquare,
  UserCheck,
  Heart,
  HelpCircle,
} from "lucide-react";
import { FadeIn, StaggerChildren, CountUp } from "@/components/landing/animations";
import { HeroMockup } from "@/components/landing/hero-mockup";
import {
  generateWebSiteJsonLd,
  generateOrganizationJsonLd,
  generateSoftwareApplicationJsonLd,
  generateFAQJsonLd,
} from "@/lib/seo/json-ld";

const features = [
  {
    icon: Globe,
    title: "Custom Subdomain",
    description: "Get your own professional URL like yourname.rezm.ai. Share it anywhere.",
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
    description: "Receive emails at yourname@rezm.ai. Forward to your inbox or read in-app.",
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
  {
    icon: ClipboardCheck,
    title: "Peer Review",
    description: "Share a pseudonymized version of your resume and collect targeted feedback from peers and mentors.",
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
      "Peer Review: anonymous feedback links",
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

const stats = [
  { value: 12500, suffix: "+", label: "Profiles Created", icon: Users },
  { value: 2400000, suffix: "+", label: "Profile Views", icon: Eye },
  { value: 98, suffix: "%", label: "Satisfaction Rate", icon: Star },
];

const faqs = [
  {
    question: "What is rezm.ai?",
    answer:
      "rezm.ai is a professional resume profile platform that gives you a beautiful, SEO-optimized online resume at your own subdomain (yourname.rezm.ai). It includes a secure platform email, dedicated phone number, AI-powered resume review, peer feedback, and visitor analytics.",
  },
  {
    question: "Is rezm.ai free to use?",
    answer:
      "Yes, rezm.ai offers a free plan that includes a public profile with your own subdomain, up to 3 resume sections, 1 AI review per month, basic visitor count, and a contact form. Paid plans start at $12/month for more features.",
  },
  {
    question: "How does the AI resume review work?",
    answer:
      "Our AI analyzes your resume content for clarity, impact, ATS compatibility, and completeness. It provides a score and actionable recommendations to strengthen each section of your profile, helping you stand out to recruiters and hiring managers.",
  },
  {
    question: "How does rezm.ai protect my privacy?",
    answer:
      "rezm.ai keeps your personal email and phone number hidden. Visitors contact you through the platform's secure email (yourname@rezm.ai) and optional dedicated phone number. Privacy-respecting analytics track visitors without cookies or third-party trackers.",
  },
  {
    question: "What is the Peer Review feature?",
    answer:
      "Peer Review lets you share a pseudonymized version of your resume with colleagues, mentors, or career coaches. Reviewers see your content but not your real identity. You control what to hide (name, email, company names) and can set link expiration and passwords.",
  },
  {
    question: "Can I use rezm.ai with my own custom domain?",
    answer:
      "Yes, Premium plan users can connect a custom domain to their rezm.ai profile. Your profile will be accessible at both your custom domain and your rezm.ai subdomain.",
  },
  {
    question: "Does rezm.ai help with SEO and being found on Google?",
    answer:
      "Absolutely. Every rezm.ai profile is automatically optimized with meta tags, structured data (JSON-LD), Open Graph images, and included in our sitemap. Pro and Premium users get additional SEO controls to customize their title, description, and keywords.",
  },
];

export default function LandingPage() {
  const webSiteJsonLd = generateWebSiteJsonLd();
  const organizationJsonLd = generateOrganizationJsonLd();
  const softwareAppJsonLd = generateSoftwareApplicationJsonLd();
  const faqJsonLd = generateFAQJsonLd(faqs);

  return (
    <div className="overflow-x-hidden">
      {/* Structured Data for Search Engines & AI */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-[0.07] blur-3xl"
            style={{ background: "radial-gradient(circle, var(--brand), transparent 70%)" }}
          />
        </div>

        <div className="mx-auto max-w-6xl px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: text */}
            <div className="text-center lg:text-left">
              <FadeIn delay={0} direction="none">
                <Badge variant="secondary" className="mb-6">
                  Your Professional Identity, Secured
                </Badge>
              </FadeIn>

              <FadeIn delay={100}>
                <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                  One link for your{" "}
                  <span className="text-brand">
                    entire resume
                  </span>
                </h1>
              </FadeIn>

              <FadeIn delay={200}>
                <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto lg:mx-0">
                  Create a beautiful, SEO-optimized resume profile with your own subdomain.
                  Get a platform email and phone number that protect your personal details.
                </p>
              </FadeIn>

              <FadeIn delay={300}>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4">
                  <Link href="/signup">
                    <Button size="lg" className="px-8 w-full sm:w-auto">
                      Create Your Profile
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                  <a href="#features">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                      See Features
                    </Button>
                  </a>
                </div>
              </FadeIn>

              <FadeIn delay={400}>
                <p className="mt-4 text-sm text-zinc-500">
                  Free to start. No credit card required.
                </p>
              </FadeIn>
            </div>

            {/* Right: animated mockup */}
            <FadeIn delay={200} direction="right" duration={800}>
              <div className="hidden lg:block">
                <HeroMockup />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="py-12 border-y border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-3 gap-8">
            {stats.map((stat) => (
              <FadeIn key={stat.label} direction="up">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <stat.icon className="h-5 w-5 text-brand" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-foreground">
                    <CountUp end={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-xs md:text-sm text-zinc-500 mt-1">{stat.label}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold tracking-tight">
                Up and running in 3 steps
              </h2>
              <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                From sign-up to a live profile in under 5 minutes.
              </p>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create your profile",
                description: "Sign up, pick your subdomain, and add your headline. Your page is live instantly.",
              },
              {
                step: "02",
                title: "Add your experience",
                description: "Build sections for experience, education, skills, projects, and certifications.",
              },
              {
                step: "03",
                title: "Share & grow",
                description: "Share your link, track visitors, and let AI help you improve your resume score.",
              },
            ].map((item, i) => (
              <FadeIn key={item.step} delay={i * 150}>
                <div className="relative text-center md:text-left">
                  <div
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-brand-foreground mb-4"
                    style={{ backgroundColor: "var(--brand)" }}
                  >
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.description}</p>
                  {i < 2 && (
                    <div className="hidden md:block absolute top-5 left-[calc(100%_-_12px)] w-[calc(100%_-_48px)]">
                      <div className="border-t-2 border-dashed border-zinc-200 dark:border-zinc-700" />
                    </div>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight">
                Everything you need for your professional presence
              </h2>
              <p className="mt-4 text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
                From AI-powered resume review to secure communication channels,
                we have every tool to present yourself professionally.
              </p>
            </div>
          </FadeIn>
          <StaggerChildren
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            staggerMs={80}
          >
            {features.map((feature) => (
              <Card key={feature.title} className="border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow group">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-2 bg-brand-muted group-hover:scale-110 transition-transform">
                    <feature.icon className="h-5 w-5 text-brand" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* Peer Review Feature Spotlight */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn>
            <div className="text-center mb-14">
              <Badge variant="secondary" className="mb-4">Premium Feature</Badge>
              <h2 className="text-3xl font-bold tracking-tight">
                Get real feedback, keep your privacy
              </h2>
              <p className="mt-4 text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
                Share a pseudonymized version of your resume with peers, mentors, or career coaches.
                They see the content &mdash; not your identity.
              </p>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: UserCheck,
                title: "Pseudonymized sharing",
                description: "Choose what to hide: name, email, phone, location, or even company names. Each gets replaced with a realistic placeholder.",
              },
              {
                icon: MessageSquare,
                title: "Section-level comments",
                description: "Reviewers leave targeted feedback on specific sections like Experience or Skills, plus general impressions.",
              },
              {
                icon: Lock,
                title: "Controlled access",
                description: "Set link expiration (24h, 7d, 30d) and add an optional password. Deactivate any link at any time.",
              },
            ].map((item, i) => (
              <FadeIn key={item.title} delay={i * 120}>
                <div className="text-center space-y-3">
                  <div
                    className="mx-auto h-12 w-12 rounded-xl flex items-center justify-center bg-brand-muted"
                  >
                    <item.icon className="h-6 w-6 text-brand" />
                  </div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {item.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={400}>
            <div className="mt-12 text-center">
              <Link href="/signup">
                <Button variant="outline" size="lg">
                  Try Peer Review
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight">
                Simple, transparent pricing
              </h2>
              <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                Start for free, upgrade when you need more.
              </p>
            </div>
          </FadeIn>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 120}>
                <Card
                  className={
                    plan.highlighted
                      ? "border-brand shadow-lg md:scale-105"
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
                          <Check className="h-4 w-4 text-brand mt-0.5 flex-shrink-0" />
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
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Community Program */}
      <section id="community" className="py-20 bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <div className="text-center space-y-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-muted">
                <Heart className="h-7 w-7 text-brand" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">
                Currently unemployed? We&apos;ve got you.
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
                We believe everyone deserves the best tools to land their next role.
                If you&apos;re currently between jobs, we&apos;ll upgrade your account to
                <span className="font-semibold text-foreground"> Premium for free</span> while you search.
              </p>
              <Card className="text-left max-w-lg mx-auto border-zinc-200 dark:border-zinc-800">
                <CardContent className="pt-6 space-y-4">
                  <h3 className="font-semibold text-lg">How to apply</h3>
                  <ol className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">1</span>
                      <span>Sign up for a free rezm.ai account and complete your profile.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">2</span>
                      <span>Send us an email at <a href="mailto:community@rezm.ai" className="font-medium text-brand hover:underline">community@rezm.ai</a> with your account email and a brief note about your situation.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">3</span>
                      <span>We&apos;ll review your request and upgrade your account to Premium within 24 hours.</span>
                    </li>
                  </ol>
                  <p className="text-xs text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    No proof required &mdash; we trust you. The upgrade stays active while you&apos;re looking for work.
                  </p>
                </CardContent>
              </Card>
              <Link href="/signup">
                <Button size="lg" className="mt-2">
                  Sign Up &amp; Apply
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold tracking-tight">
                Frequently Asked Questions
              </h2>
              <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                Everything you need to know about rezm.ai.
              </p>
            </div>
          </FadeIn>
          <StaggerChildren className="space-y-4" staggerMs={80}>
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 text-left font-medium text-zinc-900 dark:text-zinc-100 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-3">
                    <HelpCircle className="h-4 w-4 text-brand shrink-0" />
                    {faq.question}
                  </span>
                  <span className="text-zinc-400 transition-transform group-open:rotate-45 text-xl leading-none select-none">+</span>
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
      <section className="py-20" style={{ background: "linear-gradient(135deg, var(--hero-from), var(--hero-to))" }}>
        <div className="mx-auto max-w-4xl px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Ready to build your professional profile?
            </h2>
            <p className="mt-4 text-white/70">
              Join thousands of professionals who trust rezm.ai for their online presence.
            </p>
            <Link href="/signup">
              <Button size="lg" className="mt-8 bg-white text-brand hover:bg-zinc-100">
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
