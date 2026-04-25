import React from "react";
import { Text, View } from "@react-pdf/renderer";
import type { ResumeBlock, ResumeSection, BlockStyle } from "@/types/database";
import type { ResumeData } from "../../types";
import { formatDateRange, groupSkillsByCategory } from "../../utils";
import type { CustomStyles } from "./styles";

interface Ctx {
  s: CustomStyles;
  data: ResumeData;
  /** Whether the block is rendering inside the sidebar column. */
  inSidebar: boolean;
}

/** Resolve the section title the user sees: override first, then source section title. */
function resolveTitle(block: ResumeBlock, section: ResumeSection | undefined, fallback: string): string {
  const override = block.style?.title_override;
  if (typeof override === "string" && override.trim().length > 0) return override;
  if (section?.title) return section.title;
  return fallback;
}

function SectionHeading({ ctx, text }: { ctx: Ctx; text: string }) {
  return (
    <Text style={ctx.inSidebar ? ctx.s.sidebarSectionTitle : ctx.s.sectionTitle}>
      {text}
    </Text>
  );
}

function findSection(ctx: Ctx, id: string | null): ResumeSection | undefined {
  if (!id) return undefined;
  return ctx.data.sections.find((s) => s.id === id);
}

// ----------------------------------------------------------------------------
// Individual block renderers
// ----------------------------------------------------------------------------

function HeaderBlock({ ctx }: { ctx: Ctx }) {
  const { profile } = ctx.data;
  // When the header lives inside a coloured sidebar (Modern-style page
  // template), name + contact stack vertically and use the sidebar palette.
  if (ctx.inSidebar) {
    return (
      <View style={ctx.s.sidebarHeaderWrap}>
        <Text style={ctx.s.sidebarName}>
          {profile.first_name} {profile.last_name}
        </Text>
        {profile.headline && <Text style={ctx.s.sidebarHeadline}>{profile.headline}</Text>}
        {profile.show_email !== false && <Text style={ctx.s.sidebarContactItem}>{profile.email}</Text>}
        {profile.phone_personal && profile.show_phone !== false && <Text style={ctx.s.sidebarContactItem}>{profile.phone_personal}</Text>}
        {profile.location && profile.show_location !== false && <Text style={ctx.s.sidebarContactItem}>{profile.location}</Text>}
        {profile.website_url && profile.show_website !== false && <Text style={ctx.s.sidebarContactItem}>{profile.website_url}</Text>}
      </View>
    );
  }

  return (
    <View style={ctx.s.headerWrap}>
      <Text style={ctx.s.name}>
        {profile.first_name} {profile.last_name}
      </Text>
      {profile.headline && <Text style={ctx.s.headline}>{profile.headline}</Text>}
      <View style={ctx.s.contactRow}>
        {profile.show_email !== false && <Text style={ctx.s.contactItem}>{profile.email}</Text>}
        {profile.phone_personal && profile.show_phone !== false && <Text style={ctx.s.contactItem}>{profile.phone_personal}</Text>}
        {profile.location && profile.show_location !== false && <Text style={ctx.s.contactItem}>{profile.location}</Text>}
        {profile.website_url && profile.show_website !== false && <Text style={ctx.s.contactItem}>{profile.website_url}</Text>}
      </View>
    </View>
  );
}

function SummaryBlock({ ctx, block }: { ctx: Ctx; block: ResumeBlock }) {
  const section = findSection(ctx, block.source_section_id);
  const items = section
    ? ctx.data.customSections.filter((c) => c.section_id === section.id)
    : [];
  return (
    <View style={ctx.s.section}>
      <SectionHeading ctx={ctx} text={resolveTitle(block, section, "Summary")} />
      {items.map((item) => (
        <Text key={item.id} style={ctx.s.bodyText}>{item.content}</Text>
      ))}
    </View>
  );
}

function ExperienceBlock({ ctx, block }: { ctx: Ctx; block: ResumeBlock }) {
  const section = findSection(ctx, block.source_section_id);
  const showDates = block.style?.show_dates !== false;
  const entries = section
    ? ctx.data.experiences.filter((e) => e.section_id === section.id)
    : [];
  return (
    <View style={ctx.s.section}>
      <SectionHeading ctx={ctx} text={resolveTitle(block, section, "Experience")} />
      {entries.map((exp) => (
        <View key={exp.id} style={ctx.s.entry} wrap={false}>
          <View style={ctx.s.entryHeader}>
            <View>
              <Text style={ctx.s.entryTitle}>{exp.position}</Text>
              <Text style={ctx.s.entrySubtitle}>
                {exp.company_name}{exp.location ? ` · ${exp.location}` : ""}
              </Text>
            </View>
            {showDates && (
              <Text style={ctx.s.entryDate}>
                {formatDateRange(exp.start_date, exp.end_date, exp.is_current)}
              </Text>
            )}
          </View>
          {exp.description && <Text style={ctx.s.entryDescription}>{exp.description}</Text>}
          {exp.highlights?.map((h, i) => (
            <Text key={i} style={ctx.s.highlight}>• {h}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function EducationBlock({ ctx, block }: { ctx: Ctx; block: ResumeBlock }) {
  const section = findSection(ctx, block.source_section_id);
  const showDates = block.style?.show_dates !== false;
  const entries = section
    ? ctx.data.educations.filter((e) => e.section_id === section.id)
    : [];
  return (
    <View style={ctx.s.section}>
      <SectionHeading ctx={ctx} text={resolveTitle(block, section, "Education")} />
      {entries.map((edu) => (
        <View key={edu.id} style={ctx.s.entry} wrap={false}>
          <View style={ctx.s.entryHeader}>
            <View>
              <Text style={ctx.s.entryTitle}>{edu.institution}</Text>
              <Text style={ctx.s.entrySubtitle}>
                {[edu.degree, edu.field_of_study].filter(Boolean).join(" in ")}
                {edu.gpa ? ` · GPA: ${edu.gpa}` : ""}
              </Text>
            </View>
            {showDates && (
              <Text style={ctx.s.entryDate}>
                {formatDateRange(edu.start_date, edu.end_date, edu.is_current)}
              </Text>
            )}
          </View>
          {edu.description && <Text style={ctx.s.entryDescription}>{edu.description}</Text>}
        </View>
      ))}
    </View>
  );
}

function SkillsBlock({ ctx, block }: { ctx: Ctx; block: ResumeBlock }) {
  const section = findSection(ctx, block.source_section_id);
  const skills = section
    ? ctx.data.skills.filter((sk) => sk.section_id === section.id)
    : [];
  const grouped = groupSkillsByCategory(skills);
  return (
    <View style={ctx.s.section}>
      <SectionHeading ctx={ctx} text={resolveTitle(block, section, "Skills")} />
      {Array.from(grouped.entries()).map(([cat, catSkills]) => {
        if (ctx.inSidebar) {
          return (
            <View key={cat}>
              {grouped.size > 1 && <Text style={ctx.s.sidebarSkillCategory}>{cat}</Text>}
              {catSkills.map((sk) => (
                <Text key={sk.id} style={ctx.s.sidebarSkillItem}>• {sk.name}</Text>
              ))}
            </View>
          );
        }
        return (
          <View key={cat}>
            {grouped.size > 1 && <Text style={ctx.s.skillCategory}>{cat}</Text>}
            <Text style={ctx.s.skillList}>{catSkills.map((sk) => sk.name).join("  ·  ")}</Text>
          </View>
        );
      })}
    </View>
  );
}

function CertificationsBlock({ ctx, block }: { ctx: Ctx; block: ResumeBlock }) {
  const section = findSection(ctx, block.source_section_id);
  const certs = section
    ? ctx.data.certifications.filter((c) => c.section_id === section.id)
    : [];
  return (
    <View style={ctx.s.section}>
      <SectionHeading ctx={ctx} text={resolveTitle(block, section, "Certifications")} />
      {certs.map((cert) => (
        <View key={cert.id} style={ctx.s.entry} wrap={false}>
          <View style={ctx.s.entryHeader}>
            <Text style={ctx.s.entryTitle}>{cert.name}</Text>
            {cert.issue_date && (
              <Text style={ctx.s.entryDate}>
                {formatDateRange(cert.issue_date, cert.expiry_date, false)}
              </Text>
            )}
          </View>
          {cert.issuing_org && <Text style={ctx.s.entrySubtitle}>{cert.issuing_org}</Text>}
        </View>
      ))}
    </View>
  );
}

function ProjectsBlock({ ctx, block }: { ctx: Ctx; block: ResumeBlock }) {
  const section = findSection(ctx, block.source_section_id);
  const projects = section
    ? ctx.data.projects.filter((p) => p.section_id === section.id)
    : [];
  return (
    <View style={ctx.s.section}>
      <SectionHeading ctx={ctx} text={resolveTitle(block, section, "Projects")} />
      {projects.map((proj) => (
        <View key={proj.id} style={ctx.s.entry} wrap={false}>
          <Text style={ctx.s.entryTitle}>
            {proj.name}{proj.url ? ` — ${proj.url}` : ""}
          </Text>
          {proj.description && <Text style={ctx.s.entryDescription}>{proj.description}</Text>}
          {proj.technologies?.length > 0 && (
            <Text style={ctx.s.techList}>{proj.technologies.join("  ·  ")}</Text>
          )}
          {proj.highlights?.map((h, i) => (
            <Text key={i} style={ctx.s.highlight}>• {h}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function CustomTextBlock({ ctx, block }: { ctx: Ctx; block: ResumeBlock }) {
  const section = findSection(ctx, block.source_section_id);
  const items = section
    ? ctx.data.customSections.filter((c) => c.section_id === section.id)
    : [];
  const inlineText = (block.style as BlockStyle)?.text;
  const hasAnyContent = items.length > 0 || (inlineText && inlineText.trim().length > 0);
  if (!hasAnyContent && !section) return null;
  return (
    <View style={ctx.s.section}>
      {section && (
        <SectionHeading ctx={ctx} text={resolveTitle(block, section, "Section")} />
      )}
      {items.map((item) => (
        <Text key={item.id} style={ctx.s.bodyText}>{item.content}</Text>
      ))}
      {inlineText && <Text style={ctx.s.bodyText}>{inlineText}</Text>}
    </View>
  );
}

function DividerBlock({ ctx }: { ctx: Ctx }) {
  return <View style={ctx.inSidebar ? ctx.s.sidebarDivider : ctx.s.divider} />;
}

function SpacerBlock({ block }: { block: ResumeBlock }) {
  const h = typeof block.style?.height === "number" ? block.style.height : 12;
  return <View style={{ height: h }} />;
}

// ----------------------------------------------------------------------------
// Dispatch
// ----------------------------------------------------------------------------

export function renderBlock(block: ResumeBlock, ctx: Ctx): React.ReactNode {
  switch (block.type) {
    case "header":
      return <HeaderBlock key={block.id} ctx={ctx} />;
    case "summary":
      return <SummaryBlock key={block.id} ctx={ctx} block={block} />;
    case "experience":
      return <ExperienceBlock key={block.id} ctx={ctx} block={block} />;
    case "education":
      return <EducationBlock key={block.id} ctx={ctx} block={block} />;
    case "skills":
      return <SkillsBlock key={block.id} ctx={ctx} block={block} />;
    case "certifications":
      return <CertificationsBlock key={block.id} ctx={ctx} block={block} />;
    case "projects":
      return <ProjectsBlock key={block.id} ctx={ctx} block={block} />;
    case "custom":
      return <CustomTextBlock key={block.id} ctx={ctx} block={block} />;
    case "divider":
      return <DividerBlock key={block.id} ctx={ctx} />;
    case "spacer":
      return <SpacerBlock key={block.id} block={block} />;
    default:
      return null;
  }
}
