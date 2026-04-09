import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { FadeIn } from "@/components/landing/animations";
import { getPostBySlug, getAllPosts } from "@/lib/blog/posts";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rezm.ai";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.description,
    keywords: post.tags,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${APP_URL}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      tags: post.tags,
      siteName: "rezm.ai",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
    alternates: {
      canonical: `${APP_URL}/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url: `${APP_URL}/blog/${post.slug}`,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Organization",
      name: "rezm.ai",
      url: APP_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "rezm.ai",
      url: APP_URL,
      logo: {
        "@type": "ImageObject",
        url: `${APP_URL}/icon.svg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${APP_URL}/blog/${post.slug}`,
    },
    keywords: post.tags.join(", "),
    articleSection: post.category,
    wordCount: post.content.split(/\s+/).length,
    isPartOf: {
      "@type": "Blog",
      name: "rezm.ai Blog",
      url: `${APP_URL}/blog`,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: APP_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${APP_URL}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${APP_URL}/blog/${post.slug}`,
      },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <article className="py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-6">
          {/* Back link */}
          <FadeIn delay={0} direction="none">
            <Link href="/blog">
              <Button variant="ghost" size="sm" className="mb-8 -ml-2 text-zinc-500">
                <ArrowLeft className="h-4 w-4 mr-1" />
                All posts
              </Button>
            </Link>
          </FadeIn>

          {/* Header */}
          <FadeIn>
            <header className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="secondary">{post.category}</Badge>
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Clock className="h-3 w-3" />
                  {post.readingTime}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {post.title}
              </h1>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                {post.description}
              </p>
              <div className="mt-6 flex items-center gap-4 text-sm text-zinc-500">
                <span>By {post.author}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <time dateTime={post.publishedAt}>
                    {new Date(post.publishedAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                </span>
              </div>
            </header>
          </FadeIn>

          {/* Content */}
          <FadeIn delay={200}>
            <div className="prose prose-zinc dark:prose-invert max-w-none prose-headings:tracking-tight prose-h2:text-2xl prose-h3:text-lg prose-p:leading-relaxed prose-li:leading-relaxed prose-a:text-brand prose-a:no-underline hover:prose-a:underline prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100">
              {post.content.split("\n\n").map((block, i) => {
                if (block.startsWith("## ")) {
                  return (
                    <h2 key={i} id={block.replace("## ", "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}>
                      {block.replace("## ", "")}
                    </h2>
                  );
                }
                if (block.startsWith("### ")) {
                  return <h3 key={i}>{block.replace("### ", "")}</h3>;
                }
                if (block.startsWith("- ")) {
                  const items = block.split("\n").filter((line) => line.startsWith("- "));
                  return (
                    <ul key={i}>
                      {items.map((item, j) => {
                        const text = item.replace(/^- /, "");
                        const parts = text.split(/(\*\*[^*]+\*\*)/);
                        return (
                          <li key={j}>
                            {parts.map((part, k) =>
                              part.startsWith("**") && part.endsWith("**") ? (
                                <strong key={k}>{part.slice(2, -2)}</strong>
                              ) : (
                                <span key={k}>{part}</span>
                              )
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  );
                }
                if (block.match(/^\d+\.\s/)) {
                  const items = block.split("\n").filter((line) => line.match(/^\d+\.\s/));
                  return (
                    <ol key={i}>
                      {items.map((item, j) => {
                        const text = item.replace(/^\d+\.\s/, "");
                        const parts = text.split(/(\*\*[^*]+\*\*)/);
                        return (
                          <li key={j}>
                            {parts.map((part, k) =>
                              part.startsWith("**") && part.endsWith("**") ? (
                                <strong key={k}>{part.slice(2, -2)}</strong>
                              ) : (
                                <span key={k}>{part}</span>
                              )
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  );
                }
                // Handle inline bold and links
                const parts = block.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/);
                return (
                  <p key={i}>
                    {parts.map((part, k) => {
                      if (part.startsWith("**") && part.endsWith("**")) {
                        return <strong key={k}>{part.slice(2, -2)}</strong>;
                      }
                      const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
                      if (linkMatch) {
                        return (
                          <a key={k} href={linkMatch[2]}>
                            {linkMatch[1]}
                          </a>
                        );
                      }
                      return <span key={k}>{part}</span>;
                    })}
                  </p>
                );
              })}
            </div>
          </FadeIn>

          {/* Tags */}
          <FadeIn delay={300}>
            <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* CTA */}
          <FadeIn delay={400}>
            <div className="mt-12 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 text-center">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                Ready to build your professional profile?
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
                Create a free rezm.ai profile and get found by recruiters and AI search.
              </p>
              <Link href="/signup">
                <Button size="lg">Get Started for Free</Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </article>
    </div>
  );
}
