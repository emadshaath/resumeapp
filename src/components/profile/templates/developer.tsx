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
 * Developer template — monospace, terminal-inspired.
 * Section headers as code comments, dark default theme, syntax-highlight accents.
 */
export function DeveloperTemplate({
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
  const accent = themeColors.brand;

  return (
    <div
      className="min-h-screen bg-zinc-950 text-zinc-300"
      style={{
        fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, monospace",
      }}
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-8 py-10 md:py-16">
        {/* Terminal-style hero */}
        <header className="mb-10 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 border-b border-zinc-800">
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <span className="h-3 w-3 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs text-zinc-500">~ {profile.slug}.resume</span>
          </div>
          <div className="p-5 md:p-6 bg-zinc-950 text-sm leading-relaxed">
            <p className="text-zinc-500"># whoami</p>
            <p>
              <span style={{ color: accent }}>const</span>{" "}
              <span className="text-amber-300">{profile.slug.replace(/-/g, "_")}</span>{" "}
              = {"{"}
            </p>
            <div className="pl-4 space-y-0.5">
              <p>
                <span className="text-sky-300">name</span>:{" "}
                <span className="text-emerald-300">&quot;{fullName}&quot;</span>,
              </p>
              {profile.headline && (
                <p>
                  <span className="text-sky-300">title</span>:{" "}
                  <span className="text-emerald-300">&quot;{profile.headline}&quot;</span>,
                </p>
              )}
              {profile.location && (
                <p>
                  <span className="text-sky-300">location</span>:{" "}
                  <span className="text-emerald-300">&quot;{profile.location}&quot;</span>,
                </p>
              )}
              {profile.email && (
                <p>
                  <span className="text-sky-300">email</span>:{" "}
                  <span className="text-emerald-300">&quot;{profile.email}&quot;</span>,
                </p>
              )}
              {profile.website_url && (
                <p>
                  <span className="text-sky-300">site</span>:{" "}
                  <a
                    href={ensureAbsoluteUrl(profile.website_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-300 hover:underline"
                  >
                    &quot;{profile.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}&quot;
                  </a>
                  ,
                </p>
              )}
            </div>
            <p>{"};"}</p>
            {pdfSettings?.show_on_profile && (
              <div className="mt-4">
                <PdfDownloadButton slug={profile.slug} />
              </div>
            )}
          </div>
        </header>

        <main className="space-y-12">
          {sections.map((section) => {
            const sectionExperiences = sortExperiences(experiences, section.id);
            const sectionEducations = sortEducations(educations, section.id);
            const sectionSkills = skills.filter((s) => s.section_id === section.id);
            const sectionCerts = certifications.filter((c) => c.section_id === section.id);
            const sectionProjects = projects.filter((p) => p.section_id === section.id);
            const sectionCustom = customSections.filter((c) => c.section_id === section.id);

            return (
              <section key={section.id} id={section.section_type}>
                <h2 className="text-sm mb-4">
                  <span className="text-zinc-600">// </span>
                  <span style={{ color: accent }} className="font-bold uppercase tracking-wider">
                    {section.title}
                  </span>
                </h2>

                {(section.section_type === "summary" || section.section_type === "custom") && (
                  <div className="space-y-3 text-sm">
                    {sectionCustom.map((item) => (
                      <p key={item.id} className="text-zinc-400 leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>
                    ))}
                  </div>
                )}

                {section.section_type === "experience" && (
                  <div className="space-y-6">
                    {sectionExperiences.map((exp) => (
                      <div key={exp.id} className="text-sm">
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                          <div>
                            <p>
                              <span className="text-amber-300">{exp.position}</span>
                              <span className="text-zinc-600"> @ </span>
                              <span style={{ color: accent }}>{exp.company_name}</span>
                            </p>
                            {exp.location && (
                              <p className="text-zinc-600 text-xs mt-0.5">// {exp.location}</p>
                            )}
                          </div>
                          <span className="text-xs text-zinc-500">
                            [{formatDate(exp.start_date)} &rarr;{" "}
                            {exp.is_current ? "now" : formatDate(exp.end_date)}]
                          </span>
                        </div>
                        {exp.description && (
                          <p className="mt-2 text-zinc-400 leading-relaxed pl-3 border-l border-zinc-800">
                            <MarkdownText>{exp.description}</MarkdownText>
                          </p>
                        )}
                        {exp.highlights && exp.highlights.length > 0 && (
                          <ul className="mt-2 space-y-1 text-zinc-400">
                            {exp.highlights.map((h, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span style={{ color: accent }}>&gt;</span>
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
                  <div className="space-y-3 text-sm">
                    {sectionEducations.map((edu) => (
                      <div key={edu.id}>
                        <p>
                          <span className="text-amber-300">{edu.institution}</span>
                          <span className="text-zinc-600"> · </span>
                          <span className="text-zinc-400">
                            {[edu.degree, edu.field_of_study].filter(Boolean).join(" in ")}
                          </span>
                        </p>
                        {(edu.start_date || edu.end_date) && (
                          <p className="text-xs text-zinc-500 mt-0.5">
                            [{formatDate(edu.start_date)} &rarr;{" "}
                            {edu.is_current ? "now" : formatDate(edu.end_date)}]
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {section.section_type === "skills" && (
                  <div className="text-sm">
                    <p className="text-zinc-600 mb-2">const skills = [</p>
                    <p className="pl-4 text-emerald-300">
                      {sectionSkills.map((s, i) => (
                        <span key={s.id}>
                          &quot;{s.name}&quot;{i < sectionSkills.length - 1 && ", "}
                        </span>
                      ))}
                    </p>
                    <p className="text-zinc-600">];</p>
                  </div>
                )}

                {section.section_type === "certifications" && (
                  <ul className="space-y-1.5 text-sm">
                    {sectionCerts.map((cert) => (
                      <li key={cert.id} className="flex items-baseline justify-between gap-3">
                        <div>
                          <span style={{ color: accent }}>✓</span>{" "}
                          <span className="text-amber-300">{cert.name}</span>
                          {cert.issuing_org && (
                            <span className="text-zinc-500"> · {cert.issuing_org}</span>
                          )}
                          {cert.credential_url && (
                            <a
                              href={ensureAbsoluteUrl(cert.credential_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1 inline-block text-zinc-500 hover:text-zinc-300"
                            >
                              <ExternalLink className="h-3 w-3 inline" />
                            </a>
                          )}
                        </div>
                        {cert.issue_date && (
                          <span className="text-xs text-zinc-500">[{formatDate(cert.issue_date)}]</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {section.section_type === "projects" && (
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    {sectionProjects.map((project) => (
                      <div
                        key={project.id}
                        className="border border-zinc-800 rounded p-3 hover:border-zinc-700 transition-colors"
                      >
                        <p>
                          <span className="text-zinc-600">$ </span>
                          <span className="text-amber-300">{project.name}</span>
                          {project.url && (
                            <a
                              href={ensureAbsoluteUrl(project.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1 inline-block text-zinc-500 hover:text-zinc-300"
                            >
                              <ExternalLink className="h-3 w-3 inline" />
                            </a>
                          )}
                        </p>
                        {project.description && (
                          <p className="mt-1 text-zinc-400 text-xs leading-relaxed">
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
