import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";
import type { Profile, ResumeSection, Experience, Education, Skill, Certification, Project, CustomSection, SeoSettings } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Globe, Briefcase, GraduationCap, Wrench, Award, FolderOpen, ExternalLink, MessageSquare } from "lucide-react";
import { generatePersonJsonLd, generateBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { generateProfileMetadata } from "@/lib/seo/meta";
import { THEME_CSS_VARS, DEFAULT_THEME } from "@/lib/themes";
import { ContactForm } from "@/components/profile/contact-form";
import { VisitorTracker } from "@/components/profile/visitor-tracker";
import { PdfDownloadButton } from "@/components/profile/pdf-download-button";
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
    experiences: (experiences.data || []) as Experience[],
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
  if (!data) notFound();

  const { profile, sections, experiences, educations, skills, certifications, projects, customSections, seoSettings, pdfSettings } = data;
  const fullName = `${profile.first_name} ${profile.last_name}`;
  const themeColors = THEME_CSS_VARS[profile.profile_theme] || THEME_CSS_VARS[DEFAULT_THEME];

  // Generate JSON-LD structured data
  const personJsonLd = generatePersonJsonLd(profile, experiences, educations, skills, certifications);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(profile);

  return (
    <div
      className="min-h-screen bg-white dark:bg-zinc-950"
      style={{
        "--hero-from": themeColors.heroFrom,
        "--hero-to": themeColors.heroTo,
      } as React.CSSProperties}
    >
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

      {/* Header */}
      <header className="text-white print:bg-white print:text-black" style={{ background: "linear-gradient(135deg, var(--hero-from), var(--hero-to))" }}>
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={fullName}
                className="h-28 w-28 rounded-full object-cover border-3 border-zinc-600 shadow-lg"
              />
            ) : (
              <div
                className="h-28 w-28 rounded-full flex items-center justify-center text-3xl font-bold text-white/90 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${themeColors.heroFrom}, ${themeColors.heroTo})`, border: "2px solid rgba(255,255,255,0.2)" }}
              >
                {profile.first_name[0]}{profile.last_name[0]}
              </div>
            )}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{fullName}</h1>
              {profile.headline && (
                <p className="mt-2 text-lg text-zinc-300 print:text-zinc-600">{profile.headline}</p>
              )}
              <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-zinc-400 print:text-zinc-600">
                {profile.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </span>
                )}
                {profile.website_url && (
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-white transition-colors print:text-zinc-600"
                  >
                    <Globe className="h-4 w-4" />
                    {profile.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                )}
              </div>
              {pdfSettings?.show_on_profile && (
                <div className="mt-4">
                  <PdfDownloadButton slug={profile.slug} />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-10 md:py-14">
        <div className="space-y-10">
          {sections.map((section) => {
            const sectionExperiences = experiences
              .filter((e) => e.section_id === section.id)
              .sort((a, b) => {
                if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
                return (b.start_date || "").localeCompare(a.start_date || "");
              });
            const sectionEducations = educations
              .filter((e) => e.section_id === section.id)
              .sort((a, b) => {
                if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
                return (b.start_date || "").localeCompare(a.start_date || "");
              });
            const sectionSkills = skills.filter((s) => s.section_id === section.id);
            const sectionCerts = certifications.filter((c) => c.section_id === section.id);
            const sectionProjects = projects.filter((p) => p.section_id === section.id);
            const sectionCustom = customSections.filter((c) => c.section_id === section.id);

            return (
              <section key={section.id} className="scroll-mt-8" id={section.section_type}>
                <h2 className="text-lg font-bold tracking-tight uppercase text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  {getSectionIcon(section.section_type)}
                  {section.title}
                </h2>

                {/* Summary / Custom */}
                {(section.section_type === "summary" || section.section_type === "custom") && (
                  <div className="space-y-3">
                    {sectionCustom.map((item) => (
                      <p key={item.id} className="text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>
                    ))}
                  </div>
                )}

                {/* Experience */}
                {section.section_type === "experience" && (
                  <div className="space-y-7">
                    {sectionExperiences.map((exp) => (
                      <div key={exp.id} className="relative pl-6 border-l-2 border-zinc-200 dark:border-zinc-700">
                        <div className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                          <div>
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{exp.position}</h3>
                            <p className="text-zinc-600 dark:text-zinc-400">
                              {exp.company_name}
                              {exp.location && <span className="text-zinc-400 dark:text-zinc-500"> &middot; {exp.location}</span>}
                            </p>
                          </div>
                          <span className="text-sm text-zinc-500 whitespace-nowrap">
                            {formatDate(exp.start_date)} &ndash; {exp.is_current ? "Present" : formatDate(exp.end_date)}
                          </span>
                        </div>
                        {exp.description && (
                          <p className="mt-2.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Education */}
                {section.section_type === "education" && (
                  <div className="space-y-6">
                    {sectionEducations.map((edu) => (
                      <div key={edu.id} className="relative pl-6 border-l-2 border-zinc-200 dark:border-zinc-700">
                        <div className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                          <div>
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{edu.institution}</h3>
                            <p className="text-zinc-600 dark:text-zinc-400">
                              {[edu.degree, edu.field_of_study].filter(Boolean).join(" in ")}
                              {edu.gpa && <span className="text-zinc-400 dark:text-zinc-500"> &middot; GPA: {edu.gpa}</span>}
                            </p>
                          </div>
                          {(edu.start_date || edu.end_date) && (
                            <span className="text-sm text-zinc-500 whitespace-nowrap">
                              {formatDate(edu.start_date)} &ndash; {edu.is_current ? "Present" : formatDate(edu.end_date)}
                            </span>
                          )}
                        </div>
                        {edu.description && (
                          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                            {edu.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Skills */}
                {section.section_type === "skills" && (
                  <div className="space-y-4">
                    {(() => {
                      const categories = new Map<string, Skill[]>();
                      sectionSkills.forEach((skill) => {
                        const cat = skill.category || "General";
                        if (!categories.has(cat)) categories.set(cat, []);
                        categories.get(cat)!.push(skill);
                      });
                      return Array.from(categories.entries()).map(([category, categorySkills]) => (
                        <div key={category}>
                          {categories.size > 1 && (
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">{category}</h4>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {categorySkills.map((skill) => (
                              <Badge key={skill.id} variant="secondary" className="text-sm py-1 px-3">
                                {skill.name}
                                {skill.proficiency && (
                                  <span className="ml-1.5 text-zinc-400 font-normal text-xs">
                                    {skill.proficiency}
                                  </span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}

                {/* Certifications */}
                {section.section_type === "certifications" && (
                  <div className="space-y-4">
                    {sectionCerts.map((cert) => (
                      <div key={cert.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                        <div>
                          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            {cert.name}
                            {cert.credential_url && (
                              <a
                                href={cert.credential_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </h3>
                          {cert.issuing_org && (
                            <p className="text-sm text-zinc-500">{cert.issuing_org}</p>
                          )}
                        </div>
                        {cert.issue_date && (
                          <span className="text-sm text-zinc-500 whitespace-nowrap">{formatDate(cert.issue_date)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Projects */}
                {section.section_type === "projects" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {sectionProjects.map((project) => (
                      <div
                        key={project.id}
                        className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                      >
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          {project.name}
                          {project.url && (
                            <a
                              href={project.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </h3>
                        {project.description && (
                          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            {project.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          {/* Contact Form */}
          <section id="contact" className="scroll-mt-8 print:hidden">
            <h2 className="text-lg font-bold tracking-tight uppercase text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <MessageSquare className="h-5 w-5 text-zinc-500" />
              Get in Touch
            </h2>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
              <ContactForm profileId={profile.id} profileName={profile.first_name} />
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="text-center py-10 mt-8 print:hidden">
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
      </main>
    </div>
  );
}

function getSectionIcon(type: string) {
  const className = "h-5 w-5 text-zinc-400";
  switch (type) {
    case "experience": return <Briefcase className={className} />;
    case "education": return <GraduationCap className={className} />;
    case "skills": return <Wrench className={className} />;
    case "certifications": return <Award className={className} />;
    case "projects": return <FolderOpen className={className} />;
    default: return null;
  }
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
