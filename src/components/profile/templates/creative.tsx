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
 * Creative template — bold display headlines, asymmetric layout, oversized type.
 * Uses an extreme name treatment and offset section labels for editorial feel.
 */
export function CreativeTemplate({
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Hero — oversized name, asymmetric */}
      <header className="relative overflow-hidden border-b-4" style={{ borderColor: accent }}>
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: `linear-gradient(135deg, ${themeColors.heroFrom}10, ${themeColors.heroTo}10)`,
          }}
        />
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <p
            className="text-xs uppercase tracking-[0.4em] mb-4 font-bold"
            style={{ color: accent }}
          >
            Portfolio · Resume
          </p>
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter leading-[0.9]">
            {profile.first_name}
            <br />
            <span style={{ color: accent }}>{profile.last_name}.</span>
          </h1>
          {profile.headline && (
            <p className="mt-6 text-xl md:text-2xl font-medium text-zinc-700 dark:text-zinc-300 max-w-2xl">
              {profile.headline}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm uppercase tracking-wider font-medium text-zinc-600 dark:text-zinc-400">
            {profile.location && <span>{profile.location}</span>}
            {profile.email && <span>{profile.email}</span>}
            {profile.website_url && (
              <a
                href={ensureAbsoluteUrl(profile.website_url)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: accent }}
              >
                {profile.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            )}
          </div>
          {pdfSettings?.show_on_profile && (
            <div className="mt-6">
              <PdfDownloadButton slug={profile.slug} />
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16 space-y-20">
        {sections.map((section, idx) => {
          const sectionExperiences = sortExperiences(experiences, section.id);
          const sectionEducations = sortEducations(educations, section.id);
          const sectionSkills = skills.filter((s) => s.section_id === section.id);
          const sectionCerts = certifications.filter((c) => c.section_id === section.id);
          const sectionProjects = projects.filter((p) => p.section_id === section.id);
          const sectionCustom = customSections.filter((c) => c.section_id === section.id);

          return (
            <section key={section.id} id={section.section_type} className="grid md:grid-cols-[180px_1fr] gap-6 md:gap-12">
              {/* Asymmetric label column */}
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-[0.25em]"
                  style={{ color: accent }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-1 text-3xl font-black tracking-tight leading-tight">
                  {section.title}
                </h2>
              </div>

              {/* Content */}
              <div>
                {(section.section_type === "summary" || section.section_type === "custom") && (
                  <div className="space-y-3">
                    {sectionCustom.map((item) => (
                      <p
                        key={item.id}
                        className="text-lg leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap"
                      >
                        {item.content}
                      </p>
                    ))}
                  </div>
                )}

                {section.section_type === "experience" && (
                  <div className="space-y-10">
                    {sectionExperiences.map((exp) => (
                      <div
                        key={exp.id}
                        className="border-l-4 pl-6 pb-2"
                        style={{ borderColor: accent }}
                      >
                        <p className="text-xs uppercase tracking-widest font-bold text-zinc-500">
                          {formatDate(exp.start_date)} &ndash;{" "}
                          {exp.is_current ? "Present" : formatDate(exp.end_date)}
                        </p>
                        <h3 className="mt-1 text-2xl font-black tracking-tight">{exp.position}</h3>
                        <p className="text-base font-semibold" style={{ color: accent }}>
                          {exp.company_name}
                          {exp.location && (
                            <span className="text-zinc-500 font-normal"> / {exp.location}</span>
                          )}
                        </p>
                        {exp.description && (
                          <p className="mt-3 text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            <MarkdownText>{exp.description}</MarkdownText>
                          </p>
                        )}
                        {exp.highlights && exp.highlights.length > 0 && (
                          <ul className="mt-3 space-y-1.5 text-base text-zinc-700 dark:text-zinc-300">
                            {exp.highlights.map((h, i) => (
                              <li key={i} className="flex items-start gap-3">
                                <span style={{ color: accent }} className="font-black mt-0.5">
                                  ✱
                                </span>
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
                  <div className="space-y-6">
                    {sectionEducations.map((edu) => (
                      <div key={edu.id}>
                        <p className="text-xs uppercase tracking-widest font-bold text-zinc-500">
                          {formatDate(edu.start_date)} &ndash;{" "}
                          {edu.is_current ? "Present" : formatDate(edu.end_date)}
                        </p>
                        <h3 className="mt-1 text-xl font-black tracking-tight">{edu.institution}</h3>
                        <p style={{ color: accent }} className="font-semibold">
                          {[edu.degree, edu.field_of_study].filter(Boolean).join(" in ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {section.section_type === "skills" && (
                  <div className="flex flex-wrap gap-2">
                    {sectionSkills.map((skill) => (
                      <span
                        key={skill.id}
                        className="px-4 py-2 text-sm font-bold uppercase tracking-wider"
                        style={{
                          background: accent,
                          color: "#fff",
                        }}
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>
                )}

                {section.section_type === "certifications" && (
                  <div className="space-y-4">
                    {sectionCerts.map((cert) => (
                      <div key={cert.id} className="flex items-baseline justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold">{cert.name}</h3>
                          {cert.issuing_org && (
                            <p className="text-sm text-zinc-500">{cert.issuing_org}</p>
                          )}
                        </div>
                        {cert.issue_date && (
                          <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                            {formatDate(cert.issue_date)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {section.section_type === "projects" && (
                  <div className="space-y-6">
                    {sectionProjects.map((project) => (
                      <div key={project.id} className="group">
                        <h3 className="text-2xl font-black tracking-tight flex items-center gap-2">
                          {project.name}
                          {project.url && (
                            <a
                              href={ensureAbsoluteUrl(project.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: accent }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </h3>
                        {project.description && (
                          <p className="mt-2 text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            {project.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
