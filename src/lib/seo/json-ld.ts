import type { Profile, Experience, Education, Skill, Certification } from "@/types/database";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://resumeprofile.com";

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
