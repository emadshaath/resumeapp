import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rezm.ai";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/p/"],
        disallow: ["/dashboard/", "/api/", "/callback", "/review/", "/extension/"],
      },
      // Explicitly allow AI crawlers that respect robots.txt
      {
        userAgent: "GPTBot",
        allow: ["/", "/p/"],
        disallow: ["/dashboard/", "/api/", "/callback", "/review/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/p/"],
        disallow: ["/dashboard/", "/api/", "/callback", "/review/"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/p/"],
        disallow: ["/dashboard/", "/api/", "/callback", "/review/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/p/"],
        disallow: ["/dashboard/", "/api/", "/callback", "/review/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/p/"],
        disallow: ["/dashboard/", "/api/", "/callback", "/review/"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
