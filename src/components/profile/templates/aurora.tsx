import { Mail, MapPin, Globe, ExternalLink, Linkedin } from "lucide-react";
import { ensureAbsoluteUrl } from "@/lib/utils";
import { MarkdownText } from "@/components/ui/markdown-text";
import { PdfDownloadButton } from "@/components/profile/pdf-download-button";
import { TEMPLATES } from "@/lib/templates/registry";
import {
  type TemplateProps,
  formatDate,
  sortExperiences,
  sortEducations,
} from "./types";

/**
 * Aurora template — soft violet/pink card-based design.
 *
 * Faithful port of the personal site design system at emadshaat.com.
 * Identity: card-based layout, violet→pink gradient, layered shadows,
 * Montserrat type, rounded corners, hover-lift interactions.
 *
 * Supports per-profile accent color customization via the
 * template_accent and template_accent_alt columns. Defaults to
 * the original violet/pink if unset.
 */
export function AuroraTemplate({
  profile,
  sections,
  experiences,
  educations,
  skills,
  certifications,
  projects,
  customSections,
  pdfSettings,
}: TemplateProps) {
  const fullName = `${profile.first_name} ${profile.last_name}`;

  // Resolve accent colors: profile override → template default
  const auroraDef = TEMPLATES.find((t) => t.id === "aurora")!;
  const accent = profile.template_accent || auroraDef.defaultAccent || "#7c4dff";
  const accentAlt = profile.template_accent_alt || auroraDef.defaultAccentAlt || "#ff54b0";

  // Build CSS variables for the design system
  const auroraVars = {
    ["--au-accent" as string]: accent,
    ["--au-accent-alt" as string]: accentAlt,
    ["--au-accent-shadow" as string]: hexToRgba(accent, 0.32),
    ["--au-accent-soft" as string]: hexToRgba(accent, 0.1),
    ["--au-accent-border" as string]: hexToRgba(accent, 0.22),
    ["--au-bg-mid" as string]: hexToRgba(accent, 0.04),
    ["--au-text-primary" as string]: "#1f1b3d",
    ["--au-text-muted" as string]: "#61648a",
    ["--au-card-border" as string]: "rgba(31, 27, 61, 0.08)",
    ["--au-card-shadow" as string]: "0 20px 48px rgba(24, 28, 58, 0.08)",
  } as React.CSSProperties;

  return (
    <div
      className="min-h-screen aurora-root"
      style={{
        ...auroraVars,
        fontFamily: "'Montserrat', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background:
          "linear-gradient(135deg, #ffffff 0%, var(--au-bg-mid) 70%, #ffffff 100%)",
        color: "var(--au-text-primary)",
      }}
    >
      {/* Inline scoped styles + Google Font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap"
      />
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
          .aurora-root .au-card {
            background: #ffffff;
            border: 1px solid var(--au-card-border);
            border-radius: 24px;
            box-shadow: var(--au-card-shadow);
            padding: 2.25rem;
          }
          .aurora-root .au-hero-card {
            border-radius: 28px;
            padding: 3rem 2.5rem;
          }
          .aurora-root .au-experience-card,
          .aurora-root .au-project-card {
            background: #ffffff;
            border: 1px solid var(--au-card-border);
            border-radius: 20px;
            padding: 1.8rem;
            box-shadow: 0 18px 44px rgba(24, 28, 58, 0.06);
            transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
          }
          .aurora-root .au-experience-card:hover,
          .aurora-root .au-project-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 24px 50px rgba(24, 28, 58, 0.1);
          }
          .aurora-root .au-chip {
            display: inline-flex;
            align-items: center;
            padding: 0.4rem 0.9rem;
            font-size: 0.78rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-radius: 999px;
            background: var(--au-accent-soft);
            color: var(--au-accent);
            border: 1px solid var(--au-accent-border);
          }
          .aurora-root .au-kicker {
            font-size: 0.85rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.4em;
            color: var(--au-accent);
          }
          .aurora-root .au-display {
            font-size: clamp(2.4rem, 5vw, 3.6rem);
            font-weight: 700;
            letter-spacing: -0.03em;
            line-height: 1.1;
            color: var(--au-text-primary);
          }
          .aurora-root .au-section-title {
            font-size: 1.8rem;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: var(--au-text-primary);
          }
          .aurora-root .au-muted {
            color: var(--au-text-muted);
          }
          .aurora-root .au-cta {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: linear-gradient(135deg, var(--au-accent), var(--au-accent-alt));
            color: #ffffff;
            padding: 0.85rem 1.6rem;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.85rem;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            box-shadow: 0 16px 30px var(--au-accent-shadow);
            transition: transform 220ms ease, box-shadow 220ms ease;
          }
          .aurora-root .au-cta:hover {
            transform: translateY(-3px);
            box-shadow: 0 24px 40px var(--au-accent-shadow);
          }
          .aurora-root .au-logo-badge {
            width: 64px;
            height: 64px;
            border-radius: 16px;
            background: #ffffff;
            border: 1px solid var(--au-accent-border);
            box-shadow: 0 10px 24px rgba(24, 28, 58, 0.08);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1.4rem;
            color: var(--au-accent);
            flex-shrink: 0;
          }
          .aurora-root a:hover {
            color: var(--au-accent-alt);
          }
        `,
        }}
      />

      <main className="mx-auto max-w-3xl px-5 py-12 md:py-16 space-y-7">
        {/* HERO CARD */}
        <section className="au-card au-hero-card">
          <p className="au-kicker">Hi there 👋 I&apos;m</p>
          <div className="mt-4 flex flex-col md:flex-row md:items-center gap-6">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={fullName}
                className="h-24 w-24 rounded-full object-cover"
                style={{
                  filter: `drop-shadow(0 14px 24px ${hexToRgba(accent, 0.4)})`,
                }}
              />
            ) : (
              <div
                className="h-24 w-24 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${accent}, ${accentAlt})`,
                  filter: `drop-shadow(0 14px 24px ${hexToRgba(accent, 0.4)})`,
                }}
              >
                {profile.first_name[0]}
                {profile.last_name[0]}
              </div>
            )}
            <div className="flex-1 text-center md:text-left">
              <h1 className="au-display">{fullName}</h1>
              {profile.headline && (
                <p className="mt-3 text-base md:text-lg au-muted leading-relaxed">
                  {profile.headline}
                </p>
              )}
              <div className="mt-5 flex flex-wrap justify-center md:justify-start gap-3 text-xs uppercase tracking-wider au-muted">
                {profile.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {profile.location}
                  </span>
                )}
                {profile.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {profile.email}
                  </span>
                )}
                {profile.website_url && (
                  <a
                    href={ensureAbsoluteUrl(profile.website_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5"
                    style={{ color: accent }}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {profile.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                )}
                {profile.linkedin_url && (
                  <a
                    href={ensureAbsoluteUrl(profile.linkedin_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5"
                    style={{ color: accent }}
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                    LinkedIn
                  </a>
                )}
              </div>
              {pdfSettings?.show_on_profile && (
                <div className="mt-6">
                  <PdfDownloadButton slug={profile.slug} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SECTIONS */}
        {sections.map((section) => {
          const sectionExperiences = sortExperiences(experiences, section.id);
          const sectionEducations = sortEducations(educations, section.id);
          const sectionSkills = skills.filter((s) => s.section_id === section.id);
          const sectionCerts = certifications.filter((c) => c.section_id === section.id);
          const sectionProjects = projects.filter((p) => p.section_id === section.id);
          const sectionCustom = customSections.filter((c) => c.section_id === section.id);

          return (
            <section key={section.id} className="au-card" id={section.section_type}>
              <h2 className="au-section-title mb-5">{section.title}</h2>

              {(section.section_type === "summary" || section.section_type === "custom") && (
                <div className="space-y-3">
                  {sectionCustom.map((item) => (
                    <p
                      key={item.id}
                      className="au-muted leading-relaxed whitespace-pre-wrap text-base"
                    >
                      {item.content}
                    </p>
                  ))}
                </div>
              )}

              {section.section_type === "experience" && (
                <div className="space-y-4">
                  {sectionExperiences.map((exp) => (
                    <div key={exp.id} className="au-experience-card">
                      <div className="flex items-start gap-4">
                        <div className="au-logo-badge">{exp.company_name[0]?.toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                            <div>
                              <h3 className="font-bold text-lg leading-tight">{exp.company_name}</h3>
                              <p className="font-semibold mt-0.5" style={{ color: accent }}>
                                {exp.position}
                              </p>
                            </div>
                            <span className="text-xs uppercase tracking-wider au-muted whitespace-nowrap mt-1">
                              {formatDate(exp.start_date)} &middot;{" "}
                              {exp.is_current ? "Present" : formatDate(exp.end_date)}
                            </span>
                          </div>
                          {exp.location && (
                            <p className="text-xs uppercase tracking-wider au-muted mt-1">
                              {exp.location}
                            </p>
                          )}
                          {exp.description && (
                            <p className="mt-3 text-sm au-muted leading-relaxed">
                              <MarkdownText>{exp.description}</MarkdownText>
                            </p>
                          )}
                          {exp.highlights && exp.highlights.length > 0 && (
                            <ul className="mt-3 space-y-1.5 text-sm au-muted leading-relaxed">
                              {exp.highlights.map((h, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                  <span style={{ color: accent }} className="mt-0.5 select-none">
                                    ●
                                  </span>
                                  <span>
                                    <MarkdownText>{h}</MarkdownText>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {section.section_type === "education" && (
                <div className="space-y-4">
                  {sectionEducations.map((edu) => (
                    <div key={edu.id} className="au-experience-card">
                      <div className="flex items-start gap-4">
                        <div className="au-logo-badge">{edu.institution[0]?.toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                            <div>
                              <h3 className="font-bold text-lg leading-tight">{edu.institution}</h3>
                              <p className="font-semibold mt-0.5" style={{ color: accent }}>
                                {[edu.degree, edu.field_of_study].filter(Boolean).join(" in ")}
                              </p>
                              {edu.gpa && <p className="text-xs au-muted mt-0.5">GPA: {edu.gpa}</p>}
                            </div>
                            {(edu.start_date || edu.end_date) && (
                              <span className="text-xs uppercase tracking-wider au-muted whitespace-nowrap">
                                {formatDate(edu.start_date)} &middot;{" "}
                                {edu.is_current ? "Present" : formatDate(edu.end_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {section.section_type === "skills" && (
                <div className="flex flex-wrap gap-2">
                  {sectionSkills.map((skill) => (
                    <span key={skill.id} className="au-chip">
                      {skill.name}
                    </span>
                  ))}
                </div>
              )}

              {section.section_type === "certifications" && (
                <div className="space-y-3">
                  {sectionCerts.map((cert) => (
                    <div
                      key={cert.id}
                      className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1"
                    >
                      <div>
                        <h3 className="font-bold flex items-center gap-2">
                          {cert.name}
                          {cert.credential_url && (
                            <a
                              href={ensureAbsoluteUrl(cert.credential_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: accent }}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </h3>
                        {cert.issuing_org && (
                          <p className="text-sm au-muted">{cert.issuing_org}</p>
                        )}
                      </div>
                      {cert.issue_date && (
                        <span className="text-xs uppercase tracking-wider au-muted whitespace-nowrap">
                          {formatDate(cert.issue_date)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {section.section_type === "projects" && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {sectionProjects.map((project) => (
                    <div key={project.id} className="au-project-card">
                      <h3 className="font-bold flex items-center gap-2 leading-tight">
                        {project.name}
                        {project.url && (
                          <a
                            href={ensureAbsoluteUrl(project.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: accent }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </h3>
                      {project.description && (
                        <p className="mt-2 text-sm au-muted leading-relaxed">
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

        <footer className="text-center py-8">
          <p className="text-xs au-muted">
            Crafted with curiosity, caffeine{" "}
            <a
              href={process.env.NEXT_PUBLIC_APP_URL || "/"}
              style={{ color: accent }}
            >
              · rezm.ai
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}

/** Convert hex (#rrggbb) to rgba(...) string with given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(124, 77, 255, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
