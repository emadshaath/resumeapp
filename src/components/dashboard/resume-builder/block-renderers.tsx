"use client";

import type { ResumeBlock, ResumeSection, BlockStyle } from "@/types/database";
import type { ResumeData, PdfColorPalette } from "@/lib/pdf/types";
import { formatDateRange, groupSkillsByCategory } from "@/lib/pdf/utils";
import type { StyleState } from "./style-state";

export interface BlockRenderContext {
  data: ResumeData;
  style: StyleState;
  palette: PdfColorPalette;
  inSidebar: boolean;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function findSection(ctx: BlockRenderContext, id: string | null): ResumeSection | undefined {
  if (!id) return undefined;
  return ctx.data.sections.find((s) => s.id === id);
}

function resolveTitle(block: ResumeBlock, section: ResumeSection | undefined, fallback: string): string {
  const override = block.style?.title_override;
  if (typeof override === "string" && override.trim().length > 0) return override;
  if (section?.title) return section.title;
  return fallback;
}

/** Inline style helpers that mirror the PDF's font / spacing scale math. */
function fontStyle(ctx: BlockRenderContext, base: number) {
  return {
    fontSize: `${base * ctx.style.fontConfig.fontScale}px`,
    fontFamily: ctx.style.fontConfig.fontFamily,
  };
}

function spacing(ctx: BlockRenderContext, base: number) {
  return base * ctx.style.fontConfig.spacingScale;
}

/** Visual section heading — uppercased, bordered, palette colored. */
function SectionHeading({ ctx, text }: { ctx: BlockRenderContext; text: string }) {
  return (
    <div
      style={{
        ...fontStyle(ctx, ctx.inSidebar ? 10 : 12),
        fontWeight: 700,
        color: ctx.inSidebar ? ctx.palette.sidebarHeading : ctx.palette.heading,
        textTransform: "uppercase",
        letterSpacing: "1px",
        borderBottom: ctx.inSidebar
          ? `1px solid ${ctx.palette.primaryLight}`
          : `1px solid ${ctx.palette.border}`,
        paddingBottom: spacing(ctx, 3),
        marginBottom: spacing(ctx, 6),
      }}
    >
      {text}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Per-type renderers
// ----------------------------------------------------------------------------

function HeaderBlock({ ctx }: { ctx: BlockRenderContext }) {
  const { profile } = ctx.data;
  return (
    <div
      style={{
        marginBottom: spacing(ctx, 16),
        borderBottom: `2px solid ${ctx.palette.primary}`,
        paddingBottom: spacing(ctx, 10),
      }}
    >
      <div
        style={{
          ...fontStyle(ctx, 24),
          fontWeight: 700,
          color: ctx.palette.heading,
          marginBottom: spacing(ctx, 4),
        }}
      >
        {profile.first_name} {profile.last_name}
      </div>
      {profile.headline && (
        <div style={{ ...fontStyle(ctx, 12), color: ctx.palette.textLight, marginBottom: spacing(ctx, 6) }}>
          {profile.headline}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: spacing(ctx, 12) }}>
        <span style={{ ...fontStyle(ctx, 9), color: ctx.palette.textLight }}>{profile.email}</span>
        {profile.phone_personal && <span style={{ ...fontStyle(ctx, 9), color: ctx.palette.textLight }}>{profile.phone_personal}</span>}
        {profile.location && <span style={{ ...fontStyle(ctx, 9), color: ctx.palette.textLight }}>{profile.location}</span>}
        {profile.website_url && <span style={{ ...fontStyle(ctx, 9), color: ctx.palette.textLight }}>{profile.website_url}</span>}
      </div>
    </div>
  );
}

function SummaryBlock({ ctx, block }: { ctx: BlockRenderContext; block: ResumeBlock }) {
  const section = findSection(ctx, block.source_section_id);
  const items = section ? ctx.data.customSections.filter((c) => c.section_id === section.id) : [];
  return (
    <div style={{ marginBottom: spacing(ctx, 12) }}>
      <SectionHeading ctx={ctx} text={resolveTitle(block, section, "Summary")} />
      {items.map((item) => (
        <p
          key={item.id}
          style={{
            ...fontStyle(ctx, 9.5),
            color: ctx.palette.text,
            lineHeight: ctx.style.fontConfig.lineHeight,
            marginBottom: spacing(ctx, 2),
          }}
        >
          {item.content}
        </p>
      ))}
    </div>
  );
}

function ExperienceBlock({ ctx, block }: { ctx: BlockRenderContext; block: ResumeBlock }) {
  const section = findSection(ctx, block.source_section_id);
  const showDates = block.style?.show_dates !== false;
  const entries = section ? ctx.data.experiences.filter((e) => e.section_id === section.id) : [];
  return (
    <div style={{ marginBottom: spacing(ctx, 12) }}>
      <SectionHeading ctx={ctx} text={resolveTitle(block, section, "Experience")} />
      {entries.map((exp) => (
        <div key={exp.id} style={{ marginBottom: spacing(ctx, 8) }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: spacing(ctx, 1) }}>
            <div>
              <div style={{ ...fontStyle(ctx, 11), fontWeight: 700, color: ctx.palette.heading }}>{exp.position}</div>
              <div style={{ ...fontStyle(ctx, 10), color: ctx.palette.textLight }}>
                {exp.company_name}{exp.location ? ` · ${exp.location}` : ""}
              </div>
            </div>
            {showDates && (
              <div style={{ ...fontStyle(ctx, 9), color: ctx.palette.textLight }}>
                {formatDateRange(exp.start_date, exp.end_date, exp.is_current)}
              </div>
            )}
          </div>
          {exp.description && (
            <p style={{ ...fontStyle(ctx, 9.5), color: ctx.palette.text, lineHeight: ctx.style.fontConfig.lineHeight, marginTop: spacing(ctx, 2) }}>
              {exp.description}
            </p>
          )}
          {exp.highlights?.map((h, i) => (
            <div
              key={i}
              style={{
                ...fontStyle(ctx, 9.5),
                color: ctx.palette.text,
                marginLeft: spacing(ctx, 10),
                marginTop: spacing(ctx, 1),
                lineHeight: ctx.style.fontConfig.lineHeight,
              }}
            >
              • {h}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function EducationBlock({ ctx, block }: { ctx: BlockRenderContext; block: ResumeBlock }) {
  const section = findSection(ctx, block.source_section_id);
  const showDates = block.style?.show_dates !== false;
  const entries = section ? ctx.data.educations.filter((e) => e.section_id === section.id) : [];
  return (
    <div style={{ marginBottom: spacing(ctx, 12) }}>
      <SectionHeading ctx={ctx} text={resolveTitle(block, section, "Education")} />
      {entries.map((edu) => (
        <div key={edu.id} style={{ marginBottom: spacing(ctx, 8) }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ ...fontStyle(ctx, 11), fontWeight: 700, color: ctx.palette.heading }}>{edu.institution}</div>
              <div style={{ ...fontStyle(ctx, 10), color: ctx.palette.textLight }}>
                {[edu.degree, edu.field_of_study].filter(Boolean).join(" in ")}
                {edu.gpa ? ` · GPA: ${edu.gpa}` : ""}
              </div>
            </div>
            {showDates && (
              <div style={{ ...fontStyle(ctx, 9), color: ctx.palette.textLight }}>
                {formatDateRange(edu.start_date, edu.end_date, edu.is_current)}
              </div>
            )}
          </div>
          {edu.description && (
            <p style={{ ...fontStyle(ctx, 9.5), color: ctx.palette.text, marginTop: spacing(ctx, 2), lineHeight: ctx.style.fontConfig.lineHeight }}>
              {edu.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function SkillsBlock({ ctx, block }: { ctx: BlockRenderContext; block: ResumeBlock }) {
  const section = findSection(ctx, block.source_section_id);
  const skills = section ? ctx.data.skills.filter((sk) => sk.section_id === section.id) : [];
  const grouped = groupSkillsByCategory(skills);
  return (
    <div style={{ marginBottom: spacing(ctx, 12) }}>
      <SectionHeading ctx={ctx} text={resolveTitle(block, section, "Skills")} />
      {Array.from(grouped.entries()).map(([cat, catSkills]) => {
        if (ctx.inSidebar) {
          return (
            <div key={cat}>
              {grouped.size > 1 && (
                <div style={{ ...fontStyle(ctx, 9), fontWeight: 700, color: ctx.palette.sidebarHeading, marginTop: spacing(ctx, 3), marginBottom: spacing(ctx, 1) }}>
                  {cat}
                </div>
              )}
              {catSkills.map((sk) => (
                <div key={sk.id} style={{ ...fontStyle(ctx, 9), color: ctx.palette.sidebarText, marginBottom: spacing(ctx, 2) }}>
                  • {sk.name}
                </div>
              ))}
            </div>
          );
        }
        return (
          <div key={cat}>
            {grouped.size > 1 && (
              <div style={{ ...fontStyle(ctx, 9), fontWeight: 700, color: ctx.palette.heading, marginTop: spacing(ctx, 3), marginBottom: spacing(ctx, 1) }}>
                {cat}
              </div>
            )}
            <div style={{ ...fontStyle(ctx, 9.5), color: ctx.palette.text, lineHeight: ctx.style.fontConfig.lineHeight }}>
              {catSkills.map((sk) => sk.name).join("  ·  ")}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CertificationsBlock({ ctx, block }: { ctx: BlockRenderContext; block: ResumeBlock }) {
  const section = findSection(ctx, block.source_section_id);
  const certs = section ? ctx.data.certifications.filter((c) => c.section_id === section.id) : [];
  return (
    <div style={{ marginBottom: spacing(ctx, 12) }}>
      <SectionHeading ctx={ctx} text={resolveTitle(block, section, "Certifications")} />
      {certs.map((cert) => (
        <div key={cert.id} style={{ marginBottom: spacing(ctx, 8) }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ ...fontStyle(ctx, 11), fontWeight: 700, color: ctx.palette.heading }}>{cert.name}</div>
            {cert.issue_date && (
              <div style={{ ...fontStyle(ctx, 9), color: ctx.palette.textLight }}>
                {formatDateRange(cert.issue_date, cert.expiry_date, false)}
              </div>
            )}
          </div>
          {cert.issuing_org && (
            <div style={{ ...fontStyle(ctx, 10), color: ctx.palette.textLight }}>{cert.issuing_org}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function ProjectsBlock({ ctx, block }: { ctx: BlockRenderContext; block: ResumeBlock }) {
  const section = findSection(ctx, block.source_section_id);
  const projects = section ? ctx.data.projects.filter((p) => p.section_id === section.id) : [];
  return (
    <div style={{ marginBottom: spacing(ctx, 12) }}>
      <SectionHeading ctx={ctx} text={resolveTitle(block, section, "Projects")} />
      {projects.map((proj) => (
        <div key={proj.id} style={{ marginBottom: spacing(ctx, 8) }}>
          <div style={{ ...fontStyle(ctx, 11), fontWeight: 700, color: ctx.palette.heading }}>
            {proj.name}{proj.url ? ` — ${proj.url}` : ""}
          </div>
          {proj.description && (
            <p style={{ ...fontStyle(ctx, 9.5), color: ctx.palette.text, marginTop: spacing(ctx, 2), lineHeight: ctx.style.fontConfig.lineHeight }}>
              {proj.description}
            </p>
          )}
          {proj.technologies?.length > 0 && (
            <div style={{ ...fontStyle(ctx, 8.5), color: ctx.palette.accent, marginTop: spacing(ctx, 2) }}>
              {proj.technologies.join("  ·  ")}
            </div>
          )}
          {proj.highlights?.map((h, i) => (
            <div key={i} style={{ ...fontStyle(ctx, 9.5), color: ctx.palette.text, marginLeft: spacing(ctx, 10), marginTop: spacing(ctx, 1), lineHeight: ctx.style.fontConfig.lineHeight }}>
              • {h}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function CustomTextBlock({ ctx, block }: { ctx: BlockRenderContext; block: ResumeBlock }) {
  const section = findSection(ctx, block.source_section_id);
  const items = section ? ctx.data.customSections.filter((c) => c.section_id === section.id) : [];
  const inlineText = (block.style as BlockStyle)?.text;
  return (
    <div style={{ marginBottom: spacing(ctx, 12) }}>
      {section && <SectionHeading ctx={ctx} text={resolveTitle(block, section, "Section")} />}
      {items.map((item) => (
        <p
          key={item.id}
          style={{ ...fontStyle(ctx, 9.5), color: ctx.palette.text, lineHeight: ctx.style.fontConfig.lineHeight, marginBottom: spacing(ctx, 2) }}
        >
          {item.content}
        </p>
      ))}
      {inlineText && (
        <p style={{ ...fontStyle(ctx, 9.5), color: ctx.palette.text, lineHeight: ctx.style.fontConfig.lineHeight }}>
          {inlineText}
        </p>
      )}
    </div>
  );
}

function DividerBlock({ ctx }: { ctx: BlockRenderContext }) {
  return (
    <div
      style={{
        borderBottom: `1px solid ${ctx.inSidebar ? ctx.palette.primaryLight : ctx.palette.border}`,
        marginTop: spacing(ctx, 6),
        marginBottom: spacing(ctx, 6),
      }}
    />
  );
}

function SpacerBlock({ block }: { block: ResumeBlock }) {
  const h = typeof block.style?.height === "number" ? block.style.height : 12;
  return <div style={{ height: h }} />;
}

// ----------------------------------------------------------------------------
// Dispatch
// ----------------------------------------------------------------------------

export function renderBlockHtml(block: ResumeBlock, ctx: BlockRenderContext): React.ReactNode {
  switch (block.type) {
    case "header":
      return <HeaderBlock ctx={ctx} />;
    case "summary":
      return <SummaryBlock ctx={ctx} block={block} />;
    case "experience":
      return <ExperienceBlock ctx={ctx} block={block} />;
    case "education":
      return <EducationBlock ctx={ctx} block={block} />;
    case "skills":
      return <SkillsBlock ctx={ctx} block={block} />;
    case "certifications":
      return <CertificationsBlock ctx={ctx} block={block} />;
    case "projects":
      return <ProjectsBlock ctx={ctx} block={block} />;
    case "custom":
      return <CustomTextBlock ctx={ctx} block={block} />;
    case "divider":
      return <DividerBlock ctx={ctx} />;
    case "spacer":
      return <SpacerBlock block={block} />;
    default:
      return null;
  }
}
