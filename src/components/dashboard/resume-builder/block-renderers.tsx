"use client";

import type {
  ResumeBlock,
  ResumeSection,
  BlockStyle,
  Profile,
  Experience,
  Education,
  Skill,
  Certification,
  Project,
  CustomSection,
} from "@/types/database";
import type { ResumeData, PdfColorPalette } from "@/lib/pdf/types";
import { formatDateRange, groupSkillsByCategory } from "@/lib/pdf/utils";
import type { StyleState } from "./style-state";
import { EditableText, type EditableTag } from "./editable-text";

/** Table names the canvas inline editor can touch. */
export type EditableTable =
  | "profiles"
  | "resume_sections"
  | "experiences"
  | "educations"
  | "skills"
  | "certifications"
  | "projects"
  | "custom_sections";

/**
 * Called by the canvas when an inline field loses focus or settles after
 * debounce. The parent (ResumeBuilder) maps this to a supabase.update() and
 * triggers a refresh of ResumeData.
 */
export type SaveFieldFn = (spec: {
  table: EditableTable;
  id: string;
  field: string;
  value: string;
}) => void | Promise<void>;

export interface BlockRenderContext {
  data: ResumeData;
  style: StyleState;
  palette: PdfColorPalette;
  inSidebar: boolean;
  saveField: SaveFieldFn;
  /** Whether inline editing is enabled (false when e.g. previewing or for unauth'd views). */
  editable: boolean;
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

function fontStyle(ctx: BlockRenderContext, base: number) {
  return {
    fontSize: `${base * ctx.style.fontConfig.fontScale}px`,
    fontFamily: ctx.style.fontConfig.fontFamily,
  };
}

function spacing(ctx: BlockRenderContext, base: number) {
  return base * ctx.style.fontConfig.spacingScale;
}

/** Thin wrapper that chooses EditableText or a static span based on `editable`. */
function Editable({
  ctx,
  value,
  onSave,
  multiline,
  placeholder,
  as = "span",
  className,
  style,
}: {
  ctx: BlockRenderContext;
  value: string;
  onSave: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  as?: EditableTag;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!ctx.editable) {
    switch (as) {
      case "div": return <div className={className} style={style}>{value}</div>;
      case "p": return <p className={className} style={style}>{value}</p>;
      case "h1": return <h1 className={className} style={style}>{value}</h1>;
      case "h2": return <h2 className={className} style={style}>{value}</h2>;
      case "h3": return <h3 className={className} style={style}>{value}</h3>;
      default: return <span className={className} style={style}>{value}</span>;
    }
  }
  return (
    <EditableText
      value={value}
      onSave={onSave}
      multiline={multiline}
      placeholder={placeholder}
      as={as}
      className={className}
      style={style}
    />
  );
}

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
// Per-type renderers — now with inline editing on the most commonly edited
// fields. Multiline descriptions fall back to contentEditable with multiline
// mode enabled; bullets / list fields still require the left-rail forms.
// ----------------------------------------------------------------------------

function HeaderBlock({ ctx }: { ctx: BlockRenderContext }) {
  const { profile } = ctx.data;
  const save = (field: keyof Profile) => (v: string) =>
    ctx.saveField({ table: "profiles", id: profile.id, field: String(field), value: v });

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
        <Editable
          ctx={ctx}
          value={profile.first_name || ""}
          onSave={save("first_name")}
          placeholder="First name"
        />
        {" "}
        <Editable
          ctx={ctx}
          value={profile.last_name || ""}
          onSave={save("last_name")}
          placeholder="Last name"
        />
      </div>
      <Editable
        ctx={ctx}
        value={profile.headline || ""}
        onSave={save("headline")}
        placeholder="Professional headline"
        as="div"
        style={{ ...fontStyle(ctx, 12), color: ctx.palette.textLight, marginBottom: spacing(ctx, 6) }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: spacing(ctx, 12) }}>
        <Editable
          ctx={ctx}
          value={profile.email || ""}
          onSave={save("email")}
          placeholder="email@example.com"
          style={{ ...fontStyle(ctx, 9), color: ctx.palette.textLight }}
        />
        <Editable
          ctx={ctx}
          value={profile.phone_personal || ""}
          onSave={save("phone_personal")}
          placeholder="Phone"
          style={{ ...fontStyle(ctx, 9), color: ctx.palette.textLight }}
        />
        <Editable
          ctx={ctx}
          value={profile.location || ""}
          onSave={save("location")}
          placeholder="Location"
          style={{ ...fontStyle(ctx, 9), color: ctx.palette.textLight }}
        />
        <Editable
          ctx={ctx}
          value={profile.website_url || ""}
          onSave={save("website_url")}
          placeholder="Website"
          style={{ ...fontStyle(ctx, 9), color: ctx.palette.textLight }}
        />
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
        <Editable
          key={item.id}
          ctx={ctx}
          value={item.content || ""}
          onSave={(v) => ctx.saveField({ table: "custom_sections", id: item.id, field: "content", value: v })}
          multiline
          placeholder="Add a short summary…"
          as="p"
          style={{
            ...fontStyle(ctx, 9.5),
            color: ctx.palette.text,
            lineHeight: ctx.style.fontConfig.lineHeight,
            marginBottom: spacing(ctx, 2),
            whiteSpace: "pre-wrap",
          }}
        />
      ))}
    </div>
  );
}

function ExperienceBlock({ ctx, block }: { ctx: BlockRenderContext; block: ResumeBlock }) {
  const section = findSection(ctx, block.source_section_id);
  const showDates = block.style?.show_dates !== false;
  const entries = section ? ctx.data.experiences.filter((e) => e.section_id === section.id) : [];
  const save = (exp: Experience, field: keyof Experience) => (v: string) =>
    ctx.saveField({ table: "experiences", id: exp.id, field: String(field), value: v });

  return (
    <div style={{ marginBottom: spacing(ctx, 12) }}>
      <SectionHeading ctx={ctx} text={resolveTitle(block, section, "Experience")} />
      {entries.map((exp) => (
        <div key={exp.id} style={{ marginBottom: spacing(ctx, 8) }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: spacing(ctx, 1) }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Editable
                ctx={ctx}
                value={exp.position || ""}
                onSave={save(exp, "position")}
                placeholder="Position"
                style={{ ...fontStyle(ctx, 11), fontWeight: 700, color: ctx.palette.heading, display: "block" }}
              />
              <div style={{ ...fontStyle(ctx, 10), color: ctx.palette.textLight }}>
                <Editable
                  ctx={ctx}
                  value={exp.company_name || ""}
                  onSave={save(exp, "company_name")}
                  placeholder="Company"
                />
                {exp.location || ctx.editable ? " · " : ""}
                <Editable
                  ctx={ctx}
                  value={exp.location || ""}
                  onSave={save(exp, "location")}
                  placeholder="Location"
                />
              </div>
            </div>
            {showDates && (
              <div style={{ ...fontStyle(ctx, 9), color: ctx.palette.textLight, whiteSpace: "nowrap", marginLeft: spacing(ctx, 8) }}>
                {formatDateRange(exp.start_date, exp.end_date, exp.is_current)}
              </div>
            )}
          </div>
          {(exp.description || ctx.editable) && (
            <Editable
              ctx={ctx}
              value={exp.description || ""}
              onSave={save(exp, "description")}
              multiline
              placeholder="Short summary…"
              as="p"
              style={{
                ...fontStyle(ctx, 9.5),
                color: ctx.palette.text,
                lineHeight: ctx.style.fontConfig.lineHeight,
                marginTop: spacing(ctx, 2),
                whiteSpace: "pre-wrap",
              }}
            />
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
  const save = (edu: Education, field: keyof Education) => (v: string) =>
    ctx.saveField({ table: "educations", id: edu.id, field: String(field), value: v });

  return (
    <div style={{ marginBottom: spacing(ctx, 12) }}>
      <SectionHeading ctx={ctx} text={resolveTitle(block, section, "Education")} />
      {entries.map((edu) => (
        <div key={edu.id} style={{ marginBottom: spacing(ctx, 8) }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Editable
                ctx={ctx}
                value={edu.institution || ""}
                onSave={save(edu, "institution")}
                placeholder="Institution"
                style={{ ...fontStyle(ctx, 11), fontWeight: 700, color: ctx.palette.heading, display: "block" }}
              />
              <div style={{ ...fontStyle(ctx, 10), color: ctx.palette.textLight }}>
                <Editable
                  ctx={ctx}
                  value={edu.degree || ""}
                  onSave={save(edu, "degree")}
                  placeholder="Degree"
                />
                {(edu.degree && edu.field_of_study) || ctx.editable ? " in " : ""}
                <Editable
                  ctx={ctx}
                  value={edu.field_of_study || ""}
                  onSave={save(edu, "field_of_study")}
                  placeholder="Field of study"
                />
                {edu.gpa ? ` · GPA: ${edu.gpa}` : ""}
              </div>
            </div>
            {showDates && (
              <div style={{ ...fontStyle(ctx, 9), color: ctx.palette.textLight, whiteSpace: "nowrap", marginLeft: spacing(ctx, 8) }}>
                {formatDateRange(edu.start_date, edu.end_date, edu.is_current)}
              </div>
            )}
          </div>
          {(edu.description || ctx.editable) && (
            <Editable
              ctx={ctx}
              value={edu.description || ""}
              onSave={save(edu, "description")}
              multiline
              placeholder="Notes, honors, coursework…"
              as="p"
              style={{
                ...fontStyle(ctx, 9.5),
                color: ctx.palette.text,
                marginTop: spacing(ctx, 2),
                lineHeight: ctx.style.fontConfig.lineHeight,
                whiteSpace: "pre-wrap",
              }}
            />
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
  const saveSkill = (sk: Skill) => (v: string) =>
    ctx.saveField({ table: "skills", id: sk.id, field: "name", value: v });

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
                  {"• "}
                  <Editable ctx={ctx} value={sk.name || ""} onSave={saveSkill(sk)} placeholder="Skill" />
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
              {catSkills.map((sk, i) => (
                <span key={sk.id}>
                  {i > 0 && "  ·  "}
                  <Editable ctx={ctx} value={sk.name || ""} onSave={saveSkill(sk)} placeholder="Skill" />
                </span>
              ))}
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
  const save = (cert: Certification, field: keyof Certification) => (v: string) =>
    ctx.saveField({ table: "certifications", id: cert.id, field: String(field), value: v });

  return (
    <div style={{ marginBottom: spacing(ctx, 12) }}>
      <SectionHeading ctx={ctx} text={resolveTitle(block, section, "Certifications")} />
      {certs.map((cert) => (
        <div key={cert.id} style={{ marginBottom: spacing(ctx, 8) }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Editable
              ctx={ctx}
              value={cert.name || ""}
              onSave={save(cert, "name")}
              placeholder="Certification"
              style={{ ...fontStyle(ctx, 11), fontWeight: 700, color: ctx.palette.heading }}
            />
            {cert.issue_date && (
              <div style={{ ...fontStyle(ctx, 9), color: ctx.palette.textLight, whiteSpace: "nowrap", marginLeft: spacing(ctx, 8) }}>
                {formatDateRange(cert.issue_date, cert.expiry_date, false)}
              </div>
            )}
          </div>
          <Editable
            ctx={ctx}
            value={cert.issuing_org || ""}
            onSave={save(cert, "issuing_org")}
            placeholder="Issuer"
            as="div"
            style={{ ...fontStyle(ctx, 10), color: ctx.palette.textLight }}
          />
        </div>
      ))}
    </div>
  );
}

function ProjectsBlock({ ctx, block }: { ctx: BlockRenderContext; block: ResumeBlock }) {
  const section = findSection(ctx, block.source_section_id);
  const projects = section ? ctx.data.projects.filter((p) => p.section_id === section.id) : [];
  const save = (proj: Project, field: keyof Project) => (v: string) =>
    ctx.saveField({ table: "projects", id: proj.id, field: String(field), value: v });

  return (
    <div style={{ marginBottom: spacing(ctx, 12) }}>
      <SectionHeading ctx={ctx} text={resolveTitle(block, section, "Projects")} />
      {projects.map((proj) => (
        <div key={proj.id} style={{ marginBottom: spacing(ctx, 8) }}>
          <div style={{ ...fontStyle(ctx, 11), fontWeight: 700, color: ctx.palette.heading }}>
            <Editable
              ctx={ctx}
              value={proj.name || ""}
              onSave={save(proj, "name")}
              placeholder="Project name"
            />
            {proj.url && ` — ${proj.url}`}
          </div>
          {(proj.description || ctx.editable) && (
            <Editable
              ctx={ctx}
              value={proj.description || ""}
              onSave={save(proj, "description")}
              multiline
              placeholder="What did you build?"
              as="p"
              style={{
                ...fontStyle(ctx, 9.5),
                color: ctx.palette.text,
                marginTop: spacing(ctx, 2),
                lineHeight: ctx.style.fontConfig.lineHeight,
                whiteSpace: "pre-wrap",
              }}
            />
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
        <Editable
          key={item.id}
          ctx={ctx}
          value={item.content || ""}
          onSave={(v) => ctx.saveField({ table: "custom_sections", id: item.id, field: "content", value: v })}
          multiline
          placeholder="Write something…"
          as="p"
          style={{
            ...fontStyle(ctx, 9.5),
            color: ctx.palette.text,
            lineHeight: ctx.style.fontConfig.lineHeight,
            marginBottom: spacing(ctx, 2),
            whiteSpace: "pre-wrap",
          }}
        />
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

// Re-export these types for callers that want to reference them without
// pulling in the renderer internals.
export type {
  Profile,
  Experience,
  Education,
  Skill,
  Certification,
  Project,
  CustomSection,
};
