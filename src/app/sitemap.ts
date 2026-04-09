import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllPosts } from "@/lib/blog/posts";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rezm.ai";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Regenerate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: APP_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${APP_URL}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${APP_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${APP_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${APP_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${APP_URL}/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Add blog posts to sitemap
  const posts = getAllPosts();
  for (const post of posts) {
    entries.push({
      url: `${APP_URL}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  try {
    const supabase = createAdminClient();
    const { data: profiles } = await supabase
      .from("profiles")
      .select("slug, updated_at")
      .eq("is_published", true)
      .order("updated_at", { ascending: false });

    if (profiles) {
      for (const profile of profiles) {
        entries.push({
          url: `${APP_URL}/p/${profile.slug}`,
          lastModified: new Date(profile.updated_at),
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // If Supabase is not configured, return static entries only
  }

  return entries;
}
