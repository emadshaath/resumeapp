import type { Profile } from "@/types/database";
import type { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://resumeprofile.com";

export function generateProfileMetadata(
  profile: Profile,
  seoOverrides?: {
    meta_title?: string | null;
    meta_description?: string | null;
    og_image_url?: string | null;
    custom_keywords?: string[] | null;
  }
): Metadata {
  const fullName = `${profile.first_name} ${profile.last_name}`;
  const title = seoOverrides?.meta_title || `${fullName}${profile.headline ? ` - ${profile.headline}` : ""}`;
  const description =
    seoOverrides?.meta_description ||
    profile.headline ||
    `${fullName}'s professional profile on ResumeProfile`;
  const profileUrl = `${APP_URL}/p/${profile.slug}`;
  const ogImage = seoOverrides?.og_image_url || `${APP_URL}/api/og/${profile.slug}`;

  return {
    title,
    description,
    keywords: seoOverrides?.custom_keywords || [
      fullName,
      "resume",
      "profile",
      ...(profile.headline ? [profile.headline] : []),
      ...(profile.location ? [profile.location] : []),
    ],
    authors: [{ name: fullName, url: profileUrl }],
    openGraph: {
      title,
      description,
      url: profileUrl,
      siteName: "ResumeProfile",
      type: "profile",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${fullName}'s profile`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: profileUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
