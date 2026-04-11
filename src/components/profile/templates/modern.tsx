import { Mail, MapPin, Globe, ExternalLink } from "lucide-react";
import { ensureAbsoluteUrl } from "@/lib/utils";
import { MarkdownText } from "@/components/ui/markdown-text";
import { PdfDownloadButton } from "@/components/profile/pdf-download-button";
import {
  type TemplateProps,
  formatDate,
  sortExperiences,
  sortEducations,
} from "./types";

/**
 * Modern template — two-column sidebar layout.
 * Left sidebar: avatar, contact, skills, certifications.
 * Right column: summary, experience, education, projects.
 */
export function ModernTemplate({
  profile,
  sections,
  experiences,
  educations,
  skills,
  certifications,
  projects,
  customSections,
  pdfSettings,
  themeColors,
}: TemplateProps) {
  const fullName = `${profile.first_name} ${profile.last_name}`;

  // Aggregate sidebar content across all matching sections
  const allSkills = sections
    .filter((s) => s.section_type === "skills")
    .flatMap((s) => skills.filter((sk) => sk.section_id === s.id));
  const allCerts = sections
    .filter((s) => s.section_type === "certifications")
    .flatMap((s) => certifications.filter((c) => c.section_id === s.id));

  // Main column sections (everything except skills + certifications)
  const mainSections = sections.filter(
    (s) => s.section_type !== "skills" && s.section_type !== "certifications"
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 md:py-12">
        <div className="grid md:grid-cols-[280px_1fr] gap-6 md:gap-8">
          {/* SIDEBAR */}
          <aside
            className="rounded-2xl text-white p-6 md:p-7 h-fit md:sticky md:top-8 shadow-lg print:bg-white print:text-black"
            style={{ background: `linear-gradient(180deg, ${themeColors.heroFrom}, ${themeColors.heroTo})` }}
          >
            {/* Avatar */}
            <div className="flex flex-col items-center text-center">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={fullName}
                  className="h-32 w-32 rounded-full object-cover border-4 border-white/20 shadow-xl"
                />
              ) : (
                <div
                  className="h-32 w-32 rounded-full flex items-center justify-center text-4xl font-bold text-white border-4 border-white/20 shadow-xl"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  {profile.first_name[0]}
                  {profile.last_name[0]}
                </div>
              )}
              <h1 className="mt-4 text-2xl font-bold tracking-tight">{fullName}</h1>
              {profile.headline && (
                <p className="mt-1 text-sm text-white/80 leading-snug">{profile.headline}</p>
              )}
            </div>

            {/* Contact */}
            <div className="mt-6 space-y-2.5 text-sm text-white/90">
              {profile.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.email && (
                <div className="flex items-start gap-2 break-all">
                  <Mail className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{profile.email}</span>
                </div>
              )}
              {profile.website_url && (
                <a
                  href={ensureAbsoluteUrl(profile.website_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 hover:text-white transition-colors break-all"
                >
                  <Globe className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{profile.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                </a>
              )}
              {profile.linkedin_url && (
                <a
                  href={ensureAbsoluteUrl(profile.linkedin_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 hover:text-white transition-colors break-all"
                >
                  <span className="font-bold text-xs mt-0.5 shrink-0 w-4 text-center">in</span>
                  <span>LinkedIn</span>
                </a>
              )}
            </div>

            {/* Skills */}
            {allSkills.length > 0 && (
              <div className="mt-7 pt-6 border-t border-white/15">
                <h2 className="text-xs font-bold tracking-widest uppercase text-white/70 mb-3">
                  Skills
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {allSkills.map((skill) => (
                    <span
                      key={skill.id}
                      className="text-xs px-2.5 py-1 rounded-full bg-white/15 text-white"
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {allCerts.length > 0 && (
              <div className="mt-7 pt-6 border-t border-white/15">
                <h2 className="text-xs font-bold tracking-widest uppercase text-white/70 mb-3">
                  Certifications
                </h2>
                <ul className="space-y-2 text-sm text-white/90">
                  {allCerts.map((cert) => (
                    <li key={cert.id}>
                      <p className="font-medium">{cert.name}</p>
                      {cert.issuing_org && <p className="text-xs text-white/70">{cert.issuing_org}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {pdfSettings?.show_on_profile && (
              <div className="mt-7 pt-6 border-t border-white/15">
                <PdfDownloadButton slug={profile.slug} />
              </div>
            )}
          </aside>

          {/* MAIN COLUMN */}
          <main className="space-y-8">
            {mainSections.map((section) => {
              const sectionExperiences = sortExperiences(experiences, section.id);
              const sectionEducations = sortEducations(educations, section.id);
              const sectionProjects = projects.filter((p) => p.section_id === section.id);
              const sectionCustom = customSections.filter((c) => c.section_id === section.id);

              return (
                <section key={section.id} id={section.section_type}>
                  <h2
                    className="text-xs font-bold tracking-widest uppercase mb-4 pb-2 border-b-2"
                    style={{ color: themeColors.brand, borderColor: themeColors.brand }}
                  >
                    {section.title}
                  </h2>

                  {(section.section_type === "summary" || section.section_type === "custom") && (
                    <div className="space-y-3">
                      {sectionCustom.map((item) => (
                        <p
                          key={item.id}
                          className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap"
                        >
                          {item.content}
                        </p>
                      ))}
                    </div>
                  )}

                  {section.section_type === "experience" && (
                    <div className="space-y-6">
                      {sectionExperiences.map((exp) => (
                        <div key={exp.id} className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm border border-zinc-200 dark:border-zinc-800">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-1">
                            <div>
                              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                                {exp.position}
                              </h3>
                              <p className="font-medium" style={{ color: themeColors.brand }}>
                                {exp.company_name}
                                {exp.location && (
                                  <span className="text-zinc-500 font-normal">
                                    {" "}
                                    &middot; {exp.location}
                                  </span>
                                )}
                              </p>
                            </div>
                            <span className="text-xs font-medium text-zinc-500 whitespace-nowrap mt-1">
                              {formatDate(exp.start_date)} &ndash;{" "}
                              {exp.is_current ? "Present" : formatDate(exp.end_date)}
                            </span>
                          </div>
                          {exp.description && (
                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                              <MarkdownText>{exp.description}</MarkdownText>
                            </p>
                          )}
                          {exp.highlights && exp.highlights.length > 0 && (
                            <ul className="mt-3 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                              {exp.highlights.map((h, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span style={{ color: themeColors.brand }} className="mt-0.5 select-none">▸</span>
                                  <span>
                                    <MarkdownText>{h}</MarkdownText>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {section.section_type === "education" && (
                    <div className="space-y-4">
                      {sectionEducations.map((edu) => (
                        <div key={edu.id} className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm border border-zinc-200 dark:border-zinc-800">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                            <div>
                              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                                {edu.institution}
                              </h3>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {[edu.degree, edu.field_of_study].filter(Boolean).join(" in ")}
                                {edu.gpa && <span className="text-zinc-400"> &middot; GPA: {edu.gpa}</span>}
                              </p>
                            </div>
                            {(edu.start_date || edu.end_date) && (
                              <span className="text-xs font-medium text-zinc-500 whitespace-nowrap">
                                {formatDate(edu.start_date)} &ndash;{" "}
                                {edu.is_current ? "Present" : formatDate(edu.end_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.section_type === "projects" && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {sectionProjects.map((project) => (
                        <div
                          key={project.id}
                          className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm border border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow"
                        >
                          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            {project.name}
                            {project.url && (
                              <a
                                href={ensureAbsoluteUrl(project.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: themeColors.brand }}
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
          </main>
        </div>
      </div>
    </div>
  );
}
