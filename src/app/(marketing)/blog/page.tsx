import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { FadeIn, StaggerChildren } from "@/components/landing/animations";
import { getAllPosts } from "@/lib/blog/posts";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rezm.ai";

export const metadata: Metadata = {
  title: "Blog - Career Tips, Resume SEO & Professional Growth",
  description:
    "Expert advice on resume building, career growth, AI-powered resume review, job search privacy, and getting found by recruiters online. From the rezm.ai team.",
  keywords: [
    "resume tips",
    "career advice",
    "resume SEO",
    "job search tips",
    "AI resume review",
    "professional profile",
    "online resume",
    "rezm.ai blog",
  ],
  openGraph: {
    title: "rezm.ai Blog - Career Tips, Resume SEO & Professional Growth",
    description:
      "Expert advice on resume building, career growth, AI-powered resume review, and getting found online.",
    url: `${APP_URL}/blog`,
    type: "website",
  },
  alternates: {
    canonical: `${APP_URL}/blog`,
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "rezm.ai Blog",
    description:
      "Expert advice on resume building, career growth, AI-powered resume review, and professional visibility.",
    url: `${APP_URL}/blog`,
    publisher: {
      "@type": "Organization",
      name: "rezm.ai",
      url: APP_URL,
      logo: `${APP_URL}/icon.svg`,
    },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      url: `${APP_URL}/blog/${post.slug}`,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: {
        "@type": "Organization",
        name: "rezm.ai",
      },
    })),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />

      {/* Hero */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <FadeIn>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-muted mb-6">
              <BookOpen className="h-7 w-7 text-brand" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              The rezm.ai Blog
            </h1>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Career advice, resume optimization tips, and insights on getting
              found by recruiters and AI-powered search.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="pb-20">
        <div className="mx-auto max-w-4xl px-6">
          <StaggerChildren className="grid gap-6" staggerMs={100}>
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="block group">
                <Card className="border-zinc-200 dark:border-zinc-800 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="secondary">{post.category}</Badge>
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock className="h-3 w-3" />
                        {post.readingTime}
                      </span>
                    </div>
                    <CardTitle className="text-xl group-hover:text-brand transition-colors">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-4">
                      {post.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <time
                        dateTime={post.publishedAt}
                        className="text-xs text-zinc-500"
                      >
                        {new Date(post.publishedAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </time>
                      <span className="text-sm text-brand font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                        Read more <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </StaggerChildren>
        </div>
      </section>
    </div>
  );
}
