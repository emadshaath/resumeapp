import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";
import type { Profile, ResumeSection, Experience, Education, Skill, Certification, Project, CustomSection } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Globe, Mail, Briefcase, GraduationCap, Wrench, Award, FolderOpen, ExternalLink } from "lucide-react";

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

  const { data: sections } = await supabase
    .from("resume_sections")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("is_visible", true)
    .order("display_order");

  const sectionIds = (sections || []).map((s) => s.id);

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
    sections: (sections || []) as ResumeSection[],
    experiences: (experiences.data || []) as Experience[],
    educations: (educations.data || []) as Education[],
    skills: (skills.data || []) as Skill[],
    certifications: (certifications.data || []) as Certification[],
    projects: (projects.data || []) as Project[],
    customSections: (customSections.data || []) as CustomSection[],
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProfile(slug);
  if (!data) return { title: "Profile Not Found" };

  const { profile } = data;
  const fullName = `${profile.first_name} ${profile.last_name}`;

  return {
    title: `${fullName}${profile.headline ? ` - ${profile.headline}` : ""}`,
    description: profile.headline || `${fullName}'s professional profile`,
    openGraph: {
      title: fullName,
      description: profile.headline || `${fullName}'s professional profile`,
      type: "profile",
    },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getProfile(slug);
  if (!data) notFound();

  const { profile, sections, experiences, educations, skills, certifications, projects, customSections } = data;
  const fullName = `${profile.first_name} ${profile.last_name}`;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-zinc-900 dark:bg-zinc-950 text-white">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="flex items-start gap-6">
            {profile.avatar_url && (
              <img
                src={profile.avatar_url}
                alt={fullName}
                className="h-24 w-24 rounded-full object-cover border-2 border-zinc-700"
              />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{fullName}</h1>
              {profile.headline && (
                <p className="mt-2 text-lg text-zinc-300">{profile.headline}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-400">
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </span>
                )}
                {profile.website_url && (
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-12 space-y-12">
        {sections.map((section) => {
          const sectionExperiences = experiences.filter((e) => e.section_id === section.id);
          const sectionEducations = educations.filter((e) => e.section_id === section.id);
          const sectionSkills = skills.filter((s) => s.section_id === section.id);
          const sectionCerts = certifications.filter((c) => c.section_id === section.id);
          const sectionProjects = projects.filter((p) => p.section_id === section.id);
          const sectionCustom = customSections.filter((c) => c.section_id === section.id);

          return (
            <section key={section.id}>
              <h2 className="text-xl font-bold tracking-tight mb-6 flex items-center gap-2">
                {getSectionIcon(section.section_type)}
                {section.title}
              </h2>

              {/* Summary / Custom */}
              {(section.section_type === "summary" || section.section_type === "custom") && (
                <div className="space-y-4">
                  {sectionCustom.map((item) => (
                    <p key={item.id} className="text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                      {item.content}
                    </p>
                  ))}
                </div>
              )}

              {/* Experience */}
              {section.section_type === "experience" && (
                <div className="space-y-8">
                  {sectionExperiences.map((exp) => (
                    <div key={exp.id} className="relative pl-6 border-l-2 border-zinc-200 dark:border-zinc-700">
                      <div className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{exp.position}</h3>
                          <p className="text-zinc-600 dark:text-zinc-400">
                            {exp.company_name}
                            {exp.location && <span className="text-zinc-400"> &middot; {exp.location}</span>}
                          </p>
                        </div>
                        <span className="text-sm text-zinc-500 whitespace-nowrap ml-4">
                          {formatDate(exp.start_date)} &ndash; {exp.is_current ? "Present" : formatDate(exp.end_date)}
                        </span>
                      </div>
                      {exp.description && (
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
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
                      <div className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{edu.institution}</h3>
                          <p className="text-zinc-600 dark:text-zinc-400">
                            {[edu.degree, edu.field_of_study].filter(Boolean).join(" in ")}
                            {edu.gpa && <span className="text-zinc-400"> &middot; GPA: {edu.gpa}</span>}
                          </p>
                        </div>
                        {(edu.start_date || edu.end_date) && (
                          <span className="text-sm text-zinc-500 whitespace-nowrap ml-4">
                            {formatDate(edu.start_date)} &ndash; {edu.is_current ? "Present" : formatDate(edu.end_date)}
                          </span>
                        )}
                      </div>
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
                      const cat = skill.category || "Other";
                      if (!categories.has(cat)) categories.set(cat, []);
                      categories.get(cat)!.push(skill);
                    });
                    return Array.from(categories.entries()).map(([category, categorySkills]) => (
                      <div key={category}>
                        {categories.size > 1 && (
                          <h4 className="text-sm font-medium text-zinc-500 mb-2">{category}</h4>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {categorySkills.map((skill) => (
                            <Badge key={skill.id} variant="secondary">
                              {skill.name}
                              {skill.proficiency && (
                                <span className="ml-1 text-zinc-400 font-normal">
                                  &middot; {skill.proficiency}
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
                    <div key={cert.id} className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          {cert.name}
                          {cert.credential_url && (
                            <a
                              href={cert.credential_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-zinc-400 hover:text-zinc-600"
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
                        <span className="text-sm text-zinc-500">{formatDate(cert.issue_date)}</span>
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
                      className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4"
                    >
                      <h3 className="font-semibold flex items-center gap-2">
                        {project.name}
                        {project.url && (
                          <a
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-zinc-600"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </h3>
                      {project.description && (
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                          {project.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Separator className="mt-8" />
            </section>
          );
        })}

        {/* Footer */}
        <footer className="text-center py-8">
          <p className="text-sm text-zinc-400">
            Powered by{" "}
            <a href="/" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white">
              ResumeProfile
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}

function getSectionIcon(type: string) {
  switch (type) {
    case "experience": return <Briefcase className="h-5 w-5 text-zinc-500" />;
    case "education": return <GraduationCap className="h-5 w-5 text-zinc-500" />;
    case "skills": return <Wrench className="h-5 w-5 text-zinc-500" />;
    case "certifications": return <Award className="h-5 w-5 text-zinc-500" />;
    case "projects": return <FolderOpen className="h-5 w-5 text-zinc-500" />;
    default: return null;
  }
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
