import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { PdfColorPalette, PdfFontConfig, ResumeData } from "../types";
import { formatDateRange, groupSkillsByCategory } from "../utils";

function createStyles(c: PdfColorPalette, f: PdfFontConfig) {
  const s = f.fontScale;
  const sp = f.spacingScale;
  const lh = f.lineHeight;
  return StyleSheet.create({
    page: { padding: 40 * sp, fontFamily: f.fontFamily, fontSize: 10 * s, color: c.text, backgroundColor: c.background, lineHeight: lh },
    header: { marginBottom: 20 * sp, borderBottomWidth: 2, borderBottomColor: c.primary, paddingBottom: 12 * sp },
    name: { fontSize: 24 * s, fontWeight: "bold", color: c.heading, marginBottom: 4 * sp },
    headline: { fontSize: 12 * s, color: c.textLight, marginBottom: 6 * sp },
    contactRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 * sp },
    contactItem: { fontSize: 9 * s, color: c.textLight },
    section: { marginBottom: 14 * sp },
    sectionTitle: { fontSize: 12 * s, fontWeight: "bold", color: c.heading, textTransform: "uppercase", letterSpacing: 1, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 4 * sp, marginBottom: 8 * sp },
    entryHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 * sp },
    entryTitle: { fontSize: 11 * s, fontWeight: "bold", color: c.heading },
    entrySubtitle: { fontSize: 10 * s, color: c.textLight },
    entryDate: { fontSize: 9 * s, color: c.textLight },
    entryDescription: { fontSize: 9.5 * s, color: c.text, marginTop: 3 * sp, lineHeight: lh },
    highlight: { fontSize: 9.5 * s, color: c.text, marginLeft: 10 * sp, marginTop: 2 * sp, lineHeight: lh },
    skillCategory: { fontSize: 9 * s, fontWeight: "bold", color: c.heading, marginBottom: 2 * sp, marginTop: 4 * sp },
    skillList: { fontSize: 9.5 * s, color: c.text, lineHeight: lh },
    projectGrid: { marginBottom: 8 * sp },
    techList: { fontSize: 8.5 * s, color: c.accent, marginTop: 2 * sp },
    entrySpacing: { marginBottom: 10 * sp },
  });
}

export function ClassicLayout({ data, palette, font }: { data: ResumeData; palette: PdfColorPalette; font: PdfFontConfig }) {
  const s = createStyles(palette, font);
  const { profile, sections, experiences, educations, skills, certifications, projects, customSections } = data;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.name}>{profile.first_name} {profile.last_name}</Text>
          {profile.headline && <Text style={s.headline}>{profile.headline}</Text>}
          <View style={s.contactRow}>
            {profile.show_email !== false && <Text style={s.contactItem}>{profile.email}</Text>}
            {profile.phone_personal && profile.show_phone !== false && <Text style={s.contactItem}>{profile.phone_personal}</Text>}
            {profile.location && <Text style={s.contactItem}>{profile.location}</Text>}
            {profile.website_url && <Text style={s.contactItem}>{profile.website_url}</Text>}
          </View>
        </View>

        {/* Sections in display order */}
        {sections.map((section) => {
          const sectionExp = experiences.filter((e) => e.section_id === section.id);
          const sectionEdu = educations.filter((e) => e.section_id === section.id);
          const sectionSkills = skills.filter((s) => s.section_id === section.id);
          const sectionCerts = certifications.filter((c) => c.section_id === section.id);
          const sectionProjects = projects.filter((p) => p.section_id === section.id);
          const sectionCustom = customSections.filter((c) => c.section_id === section.id);

          return (
            <View key={section.id} style={s.section}>
              <Text style={s.sectionTitle}>{section.title}</Text>

              {(section.section_type === "summary" || section.section_type === "custom") &&
                sectionCustom.map((item) => (
                  <Text key={item.id} style={s.entryDescription}>{item.content}</Text>
                ))}

              {section.section_type === "experience" &&
                sectionExp.map((exp) => (
                  <View key={exp.id} style={s.entrySpacing}>
                    <View style={s.entryHeader}>
                      <View>
                        <Text style={s.entryTitle}>{exp.position}</Text>
                        <Text style={s.entrySubtitle}>
                          {exp.company_name}{exp.location ? ` · ${exp.location}` : ""}
                        </Text>
                      </View>
                      <Text style={s.entryDate}>{formatDateRange(exp.start_date, exp.end_date, exp.is_current)}</Text>
                    </View>
                    {exp.description && <Text style={s.entryDescription}>{exp.description}</Text>}
                    {exp.highlights?.map((h, i) => (
                      <Text key={i} style={s.highlight}>• {h}</Text>
                    ))}
                  </View>
                ))}

              {section.section_type === "education" &&
                sectionEdu.map((edu) => (
                  <View key={edu.id} style={s.entrySpacing}>
                    <View style={s.entryHeader}>
                      <View>
                        <Text style={s.entryTitle}>{edu.institution}</Text>
                        <Text style={s.entrySubtitle}>
                          {[edu.degree, edu.field_of_study].filter(Boolean).join(" in ")}
                          {edu.gpa ? ` · GPA: ${edu.gpa}` : ""}
                        </Text>
                      </View>
                      <Text style={s.entryDate}>{formatDateRange(edu.start_date, edu.end_date, edu.is_current)}</Text>
                    </View>
                    {edu.description && <Text style={s.entryDescription}>{edu.description}</Text>}
                  </View>
                ))}

              {section.section_type === "skills" && (() => {
                const grouped = groupSkillsByCategory(sectionSkills);
                return Array.from(grouped.entries()).map(([cat, catSkills]) => (
                  <View key={cat}>
                    {grouped.size > 1 && <Text style={s.skillCategory}>{cat}</Text>}
                    <Text style={s.skillList}>{catSkills.map((sk) => sk.name).join("  ·  ")}</Text>
                  </View>
                ));
              })()}

              {section.section_type === "certifications" &&
                sectionCerts.map((cert) => (
                  <View key={cert.id} style={s.entrySpacing}>
                    <View style={s.entryHeader}>
                      <Text style={s.entryTitle}>{cert.name}</Text>
                      {cert.issue_date && <Text style={s.entryDate}>{formatDateRange(cert.issue_date, cert.expiry_date, false)}</Text>}
                    </View>
                    {cert.issuing_org && <Text style={s.entrySubtitle}>{cert.issuing_org}</Text>}
                  </View>
                ))}

              {section.section_type === "projects" &&
                sectionProjects.map((proj) => (
                  <View key={proj.id} style={s.projectGrid}>
                    <Text style={s.entryTitle}>{proj.name}{proj.url ? ` — ${proj.url}` : ""}</Text>
                    {proj.description && <Text style={s.entryDescription}>{proj.description}</Text>}
                    {proj.technologies?.length > 0 && (
                      <Text style={s.techList}>{proj.technologies.join("  ·  ")}</Text>
                    )}
                    {proj.highlights?.map((h, i) => (
                      <Text key={i} style={s.highlight}>• {h}</Text>
                    ))}
                  </View>
                ))}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}
