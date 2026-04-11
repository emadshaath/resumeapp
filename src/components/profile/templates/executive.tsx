import { ExternalLink } from "lucide-react";
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
 * Executive template — serif typography, formal traditional layout.
 * Centered name + contact line, single column, strong section dividers.
 */
export function ExecutiveTemplate({
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

  const contactBits: string[] = [];
  if (profile.location) contactBits.push(profile.location);
  if (profile.email) contactBits.push(profile.email);
  if (profile.website_url) {
    contactBits.push(profile.website_url.replace(/^https?:\/\//, "").replace(/\/$/, ""));
  }

  return (
    <div
      className="min-h-screen bg-stone-50 dark:bg-zinc-950"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        {/* Header — centered, formal */}
        <header className="text-center pb-8 mb-8 border-b-2 border-zinc-800 dark:border-zinc-200">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {fullName}
          </h1>
          {profile.headline && (
            <p
              className="mt-3 text-lg italic"
              style={{ color: themeColors.brand }}
            >
              {profile.headline}
            </p>
          )}
          {contactBits.length > 0 && (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              {contactBits.join(" · ")}
            </p>
          )}
          {pdfSettings?.show_on_profile && (
            <div className="mt-5">
              <PdfDownloadButton slug={profile.slug} />
            </div>
          )}
        </header>

        <main className="space-y-9">
          {sections.map((section) => {
            const sectionExperiences = sortExperiences(experiences, section.id);
            const sectionEducations = sortEducations(educations, section.id);
            const sectionSkills = skills.filter((s) => s.section_id === section.id);
            const sectionCerts = certifications.filter((c) => c.section_id === section.id);
            const sectionProjects = projects.filter((p) => p.section_id === section.id);
            const sectionCustom = customSections.filter((c) => c.section_id === section.id);

            return (
              <section key={section.id} id={section.section_type}>
                <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-900 dark:text-zinc-100 mb-4 pb-1 border-b border-zinc-300 dark:border-zinc-700">
                  {section.title}
                </h2>

                {(section.section_type === "summary" || section.section_type === "custom") && (
                  <div className="space-y-3 text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {sectionCustom.map((item) => (
                      <p key={item.id} className="text-base whitespace-pre-wrap">
                        {item.content}
                      </p>
                    ))}
                  </div>
                )}

                {section.section_type === "experience" && (
                  <div className="space-y-6">
                    {sectionExperiences.map((exp) => (
                      <div key={exp.id}>
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                          <div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                              {exp.company_name}
                              {exp.location && (
                                <span className="text-zinc-500 font-normal text-base">
                                  , {exp.location}
                                </span>
                              )}
                            </h3>
                            <p className="italic text-zinc-700 dark:text-zinc-300">{exp.position}</p>
                          </div>
                          <span className="text-sm text-zinc-500 italic whitespace-nowrap">
                            {formatDate(exp.start_date)} &ndash;{" "}
                            {exp.is_current ? "Present" : formatDate(exp.end_date)}
                          </span>
                        </div>
                        {exp.description && (
                          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            <MarkdownText>{exp.description}</MarkdownText>
                          </p>
                        )}
                        {exp.highlights && exp.highlights.length > 0 && (
                          <ul className="mt-2 ml-5 space-y-1 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed list-disc">
                            {exp.highlights.map((h, i) => (
                              <li key={i}>
                                <MarkdownText>{h}</MarkdownText>
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
                      <div key={edu.id}>
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                          <div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                              {edu.institution}
                            </h3>
                            <p className="italic text-zinc-700 dark:text-zinc-300">
                              {[edu.degree, edu.field_of_study].filter(Boolean).join(" in ")}
                              {edu.gpa && <span className="text-zinc-500"> · GPA: {edu.gpa}</span>}
                            </p>
                          </div>
                          {(edu.start_date || edu.end_date) && (
                            <span className="text-sm text-zinc-500 italic whitespace-nowrap">
                              {formatDate(edu.start_date)} &ndash;{" "}
                              {edu.is_current ? "Present" : formatDate(edu.end_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {section.section_type === "skills" && (
                  <p className="text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {sectionSkills.map((s) => s.name).join(" · ")}
                  </p>
                )}

                {section.section_type === "certifications" && (
                  <ul className="space-y-2">
                    {sectionCerts.map((cert) => (
                      <li
                        key={cert.id}
                        className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1"
                      >
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            {cert.name}
                          </span>
                          {cert.issuing_org && (
                            <span className="italic text-zinc-700 dark:text-zinc-300">
                              {" "}
                              — {cert.issuing_org}
                            </span>
                          )}
                          {cert.credential_url && (
                            <a
                              href={ensureAbsoluteUrl(cert.credential_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1 inline-block text-zinc-500 hover:text-zinc-700"
                            >
                              <ExternalLink className="h-3 w-3 inline" />
                            </a>
                          )}
                        </div>
                        {cert.issue_date && (
                          <span className="text-sm text-zinc-500 italic">{formatDate(cert.issue_date)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {section.section_type === "projects" && (
                  <div className="space-y-3">
                    {sectionProjects.map((project) => (
                      <div key={project.id}>
                        <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                          {project.name}
                          {project.url && (
                            <a
                              href={ensureAbsoluteUrl(project.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1 inline-block text-zinc-500 hover:text-zinc-700"
                            >
                              <ExternalLink className="h-3 w-3 inline" />
                            </a>
                          )}
                        </h3>
                        {project.description && (
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
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
  );
}
