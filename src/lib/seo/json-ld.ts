import type { Profile, Experience, Education, Skill, Certification } from "@/types/database";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rezm.ai";

/**
 * WebSite schema with SearchAction — tells Google/AI engines what the site is
 * and enables sitelinks search box in SERPs.
 */
export function generateWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "rezm.ai",
    url: APP_URL,
    description:
      "Create a professional resume profile with a custom subdomain, secure communication channels, AI-powered review, and built-in visitor analytics.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${APP_URL}/p/{search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Organization schema — builds brand entity in knowledge graphs (Google, Bing, AI assistants).
 */
export function generateOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "rezm.ai",
    url: APP_URL,
    logo: `${APP_URL}/icon.svg`,
    description:
      "Professional resume profile platform with custom subdomains, secure email, AI-powered resume review, and visitor analytics.",
    foundingDate: "2024",
    sameAs: [] as string[],
    contactPoint: {
      "@type": "ContactPoint",
      email: "community@rezm.ai",
      contactType: "customer support",
    },
  };
}

/**
 * SoftwareApplication schema — helps AI engines and Google understand the product.
 */
export function generateSoftwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "rezm.ai",
    url: APP_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "AI-powered resume profile builder with custom subdomains, secure communication channels, peer review, and visitor analytics.",
    offers: [
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        name: "Free",
        description: "Public profile with subdomain, up to 3 resume sections, 1 AI review per month",
      },
      {
        "@type": "Offer",
        price: "12",
        priceCurrency: "USD",
        name: "Pro",
        description: "Unlimited resume sections, 10 AI reviews per month, platform email, full analytics",
      },
      {
        "@type": "Offer",
        price: "29",
        priceCurrency: "USD",
        name: "Premium",
        description: "Everything in Pro plus peer review, dedicated phone number, email inbox, unlimited AI reviews",
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "12500",
      bestRating: "5",
    },
  };
}

/**
 * FAQPage schema — earns rich FAQ snippets in SERPs and feeds AI answer engines.
 */
export function generateFAQJsonLd(
  faqs: { question: string; answer: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function generatePersonJsonLd(
  profile: Profile,
  experiences: Experience[],
  educations: Education[],
  skills: Skill[],
  certifications: Certification[]
) {
  const fullName = `${profile.first_name} ${profile.last_name}`;
  const profileUrl = `${APP_URL}/p/${profile.slug}`;

  const person: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: fullName,
    url: profileUrl,
    ...(profile.headline && { jobTitle: profile.headline }),
    ...(profile.location && {
      address: {
        "@type": "PostalAddress",
        addressLocality: profile.location,
      },
    }),
    ...(profile.avatar_url && { image: profile.avatar_url }),
    ...(profile.website_url && { sameAs: [profile.website_url] }),
  };

  // Add skills as knowsAbout
  if (skills.length > 0) {
    person.knowsAbout = skills.map((s) => s.name);
  }

  // Add work experience
  if (experiences.length > 0) {
    person.worksFor = experiences
      .filter((e) => e.is_current)
      .map((e) => ({
        "@type": "Organization",
        name: e.company_name,
      }));

    // If no current job, use the most recent
    if ((person.worksFor as unknown[]).length === 0 && experiences.length > 0) {
      person.worksFor = {
        "@type": "Organization",
        name: experiences[0].company_name,
      };
    }
  }

  // Add education as alumniOf
  if (educations.length > 0) {
    person.alumniOf = educations.map((e) => ({
      "@type": "EducationalOrganization",
      name: e.institution,
    }));
  }

  // Add certifications as hasCredential
  if (certifications.length > 0) {
    person.hasCredential = certifications.map((c) => ({
      "@type": "EducationalOccupationalCredential",
      name: c.name,
      ...(c.issuing_org && {
        recognizedBy: {
          "@type": "Organization",
          name: c.issuing_org,
        },
      }),
      ...(c.credential_url && { url: c.credential_url }),
    }));
  }

  return person;
}

/**
 * ProfilePage schema — wraps the Person entity in a WebPage for richer search results.
 */
export function generateProfilePageJsonLd(
  profile: Profile,
  experiences: Experience[],
  educations: Education[],
  skills: Skill[],
  certifications: Certification[]
) {
  const fullName = `${profile.first_name} ${profile.last_name}`;
  const profileUrl = `${APP_URL}/p/${profile.slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: profileUrl,
    name: `${fullName}${profile.headline ? ` - ${profile.headline}` : ""}`,
    description:
      profile.headline || `${fullName}'s professional profile on rezm.ai`,
    dateModified: profile.updated_at,
    mainEntity: generatePersonJsonLd(
      profile,
      experiences,
      educations,
      skills,
      certifications
    ),
    isPartOf: {
      "@type": "WebSite",
      name: "rezm.ai",
      url: APP_URL,
    },
  };
}

export function generateBreadcrumbJsonLd(profile: Profile) {
  const fullName = `${profile.first_name} ${profile.last_name}`;
  return {
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
        name: fullName,
        item: `${APP_URL}/p/${profile.slug}`,
      },
    ],
  };
}
