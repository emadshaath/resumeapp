import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";
import type {
  Profile,
  ResumeSection,
  Experience,
  Education,
  Skill,
  Certification,
  Project,
  CustomSection,
  SeoSettings,
} from "@/types/database";
import { MessageSquare } from "lucide-react";
import { generatePersonJsonLd, generateBreadcrumbJsonLd, generateProfilePageJsonLd } from "@/lib/seo/json-ld";
import { generateProfileMetadata } from "@/lib/seo/meta";
import { THEME_CSS_VARS, DEFAULT_THEME } from "@/lib/themes";
import { parseHighlights } from "@/lib/utils";
import { ContactForm } from "@/components/profile/contact-form";
import { VisitorTracker } from "@/components/profile/visitor-tracker";
import { TemplateRenderer } from "@/components/profile/templates";
import type { PdfSettings } from "@/lib/pdf/types";

// ISR: revalidate every 5 minutes
export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getProfile(slug: string) {
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!profile) return null;

  const [sectionsResult, seoResult, pdfResult] = await Promise.all([
    supabase
      .from("resume_sections")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("is_visible", true)
      .order("display_order"),
    supabase
      .from("seo_settings")
      .select("*")
      .eq("profile_id", profile.id)
      .single(),
    supabase
      .from("pdf_settings")
      .select("*")
      .eq("profile_id", profile.id)
      .single(),
  ]);

  const sections = sectionsResult.data || [];
  const sectionIds = sections.map((s) => s.id);

  // Only query content tables if we have sections
  if (sectionIds.length === 0) {
    return {
      profile: profile as Profile,
      sections: [] as ResumeSection[],
      experiences: [] as Experience[],
      educations: [] as Education[],
      skills: [] as Skill[],
      certifications: [] as Certification[],
      projects: [] as Project[],
      customSections: [] as CustomSection[],
      seoSettings: (seoResult.data || null) as SeoSettings | null,
      pdfSettings: (pdfResult.data || null) as PdfSettings | null,
    };
  }

  const [experiences, educations, skills, certifications, projects, customSections] =
    await Promise.all([
      supabase.from("experiences").select("*").in("section_id", sectionIds).order("display_order"),
      supabase.from("educations").select("*").in("section_id", sectionIds).order("display_order"),
      supabase.from("skills").select("*").in("section_id", sectionIds).order("display_order"),
      supabase.from("certifications").select("*").in("section_id", sectionIds).order("display_order"),
      supabase.from("projects").select("*").in("section_id", sectionIds).order("display_order"),
      supabase.from("custom_sections").select("*").in("section_id", sectionIds).order("display_order"),
    ]);

  return {
    profile: profile as Profile,
    sections: sections as ResumeSection[],
    experiences: (experiences.data || []).map((e: Record<string, unknown>) => ({ ...e, highlights: parseHighlights(e.highlights) })) as Experience[],
    educations: (educations.data || []) as Education[],
    skills: (skills.data || []) as Skill[],
    certifications: (certifications.data || []) as Certification[],
    projects: (projects.data || []) as Project[],
    customSections: (customSections.data || []) as CustomSection[],
    seoSettings: (seoResult.data || null) as SeoSettings | null,
    pdfSettings: (pdfResult.data || null) as PdfSettings | null,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProfile(slug);
  if (!data) return { title: "Profile Not Found" };

  return generateProfileMetadata(data.profile, data.seoSettings || undefined);
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getProfile(slug);
  if (!data) {
    notFound();
  }

  const { profile, sections, experiences, educations, skills, certifications, projects, customSections, pdfSettings } = data!;
  const themeColors = THEME_CSS_VARS[profile.profile_theme] || THEME_CSS_VARS[DEFAULT_THEME];

  // Generate JSON-LD structured data
  const personJsonLd = generatePersonJsonLd(profile, experiences, educations, skills, certifications);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(profile);
  const profilePageJsonLd = generateProfilePageJsonLd(profile, experiences, educations, skills, certifications);

  return (
    <>
      {/* Visitor Tracking */}
      <VisitorTracker profileId={profile.id} />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profilePageJsonLd) }}
      />

      {/* Template-driven layout */}
      <TemplateRenderer
        profile={profile}
        sections={sections}
        experiences={experiences}
        educations={educations}
        skills={skills}
        certifications={certifications}
        projects={projects}
        customSections={customSections}
        pdfSettings={pdfSettings}
        themeColors={themeColors}
      />

      {/* Contact form + footer — rendered consistently across all templates */}
      <div className="bg-white dark:bg-zinc-950">
        <div className="mx-auto max-w-3xl px-6 pb-14 print:hidden">
          <section id="contact" className="scroll-mt-8">
            <h2 className="text-lg font-bold tracking-tight uppercase text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <MessageSquare className="h-5 w-5 text-zinc-500" />
              Get in Touch
            </h2>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
              <ContactForm profileId={profile.id} profileName={profile.first_name} />
            </div>
          </section>

          <footer className="text-center py-10 mt-8">
            <p className="text-sm text-zinc-400">
              Powered by{" "}
              <a
                href={process.env.NEXT_PUBLIC_APP_URL || "/"}
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                rezm.ai
              </a>
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}
