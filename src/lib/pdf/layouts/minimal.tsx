import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { PdfColorPalette, PdfFontConfig, ResumeData } from "../types";
import { formatDateRange, groupSkillsByCategory } from "../utils";

function createStyles(c: PdfColorPalette, f: PdfFontConfig) {
  const s = f.fontScale;
  const sp = f.spacingScale;
  const lh = f.lineHeight;
  return StyleSheet.create({
    page: { padding: 50 * sp, fontFamily: f.fontFamily, fontSize: 10 * s, color: c.text, backgroundColor: c.background, lineHeight: lh },
    header: { marginBottom: 28 * sp, textAlign: "center" },
    name: { fontSize: 22 * s, fontWeight: "bold", color: c.heading, letterSpacing: 2, marginBottom: 6 * sp },
    headline: { fontSize: 11 * s, color: c.textLight, marginBottom: 10 * sp },
    contactRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 16 * sp },
    contactItem: { fontSize: 9 * s, color: c.textLight },
    divider: { borderBottomWidth: 0.5, borderBottomColor: c.border, marginVertical: 4 * sp },
    section: { marginBottom: 18 * sp },
    sectionTitle: { fontSize: 10 * s, fontWeight: "bold", color: c.primary, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 * sp },
    entryRow: { flexDirection: "row", marginBottom: 8 * sp },
    entryDateCol: { width: 90, paddingRight: 12 * sp },
    entryContentCol: { flex: 1 },
    entryDate: { fontSize: 8.5 * s, color: c.textLight, textAlign: "right" },
    entryTitle: { fontSize: 10.5 * s, fontWeight: "bold", color: c.heading },
    entrySubtitle: { fontSize: 9.5 * s, color: c.textLight, marginTop: 1 },
    entryDescription: { fontSize: 9.5 * s, color: c.text, marginTop: 3 * sp, lineHeight: lh },
    highlight: { fontSize: 9.5 * s, color: c.text, marginLeft: 8 * sp, marginTop: 2 * sp, lineHeight: lh },
    skillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 * sp, marginBottom: 4 * sp },
    skillTag: { fontSize: 8.5 * s, color: c.primary, paddingVertical: 2 * sp, paddingHorizontal: 8 * sp, borderWidth: 0.5, borderColor: c.border, borderRadius: 3 },
    skillCategory: { fontSize: 8.5 * s, fontWeight: "bold", color: c.heading, marginBottom: 4 * sp, marginTop: 6 * sp },
    techList: { fontSize: 8.5 * s, color: c.textLight, marginTop: 2 * sp, fontStyle: "italic" },
  });
}

export function MinimalLayout({ data, palette, font }: { data: ResumeData; palette: PdfColorPalette; font: PdfFontConfig }) {
  const s = createStyles(palette, font);
  const { profile, sections, experiences, educations, skills, certifications, projects, customSections } = data;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header - centered */}
        <View style={s.header}>
          <Text style={s.name}>{profile.first_name} {profile.last_name}</Text>
          {profile.headline && <Text style={s.headline}>{profile.headline}</Text>}
          <View style={s.divider} />
          <View style={s.contactRow}>
            {profile.show_email !== false && <Text style={s.contactItem}>{profile.email}</Text>}
            {profile.phone_personal && profile.show_phone !== false && <Text style={s.contactItem}>{profile.phone_personal}</Text>}
            {profile.location && profile.show_location !== false && <Text style={s.contactItem}>{profile.location}</Text>}
            {profile.website_url && profile.show_website !== false && <Text style={s.contactItem}>{profile.website_url}</Text>}
          </View>
        </View>

        {/* Sections */}
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
                  <View key={exp.id} style={s.entryRow}>
                    <View style={s.entryDateCol}>
                      <Text style={s.entryDate}>{formatDateRange(exp.start_date, exp.end_date, exp.is_current)}</Text>
                    </View>
                    <View style={s.entryContentCol}>
                      <Text style={s.entryTitle}>{exp.position}</Text>
                      <Text style={s.entrySubtitle}>
                        {exp.company_name}{exp.location ? ` · ${exp.location}` : ""}
                      </Text>
                      {exp.description && <Text style={s.entryDescription}>{exp.description}</Text>}
                      {exp.highlights?.map((h, i) => (
                        <Text key={i} style={s.highlight}>• {h}</Text>
                      ))}
                    </View>
                  </View>
                ))}

              {section.section_type === "education" &&
                sectionEdu.map((edu) => (
                  <View key={edu.id} style={s.entryRow}>
                    <View style={s.entryDateCol}>
                      <Text style={s.entryDate}>{formatDateRange(edu.start_date, edu.end_date, edu.is_current)}</Text>
                    </View>
                    <View style={s.entryContentCol}>
                      <Text style={s.entryTitle}>{edu.institution}</Text>
                      <Text style={s.entrySubtitle}>
                        {[edu.degree, edu.field_of_study].filter(Boolean).join(" in ")}
                        {edu.gpa ? ` · GPA: ${edu.gpa}` : ""}
                      </Text>
                      {edu.description && <Text style={s.entryDescription}>{edu.description}</Text>}
                    </View>
                  </View>
                ))}

              {section.section_type === "skills" && (() => {
                const grouped = groupSkillsByCategory(sectionSkills);
                return Array.from(grouped.entries()).map(([cat, catSkills]) => (
                  <View key={cat}>
                    {grouped.size > 1 && <Text style={s.skillCategory}>{cat}</Text>}
                    <View style={s.skillRow}>
                      {catSkills.map((sk) => (
                        <Text key={sk.id} style={s.skillTag}>{sk.name}</Text>
                      ))}
                    </View>
                  </View>
                ));
              })()}

              {section.section_type === "certifications" &&
                sectionCerts.map((cert) => (
                  <View key={cert.id} style={s.entryRow}>
                    <View style={s.entryDateCol}>
                      {cert.issue_date && <Text style={s.entryDate}>{formatDateRange(cert.issue_date, cert.expiry_date, false)}</Text>}
                    </View>
                    <View style={s.entryContentCol}>
                      <Text style={s.entryTitle}>{cert.name}</Text>
                      {cert.issuing_org && <Text style={s.entrySubtitle}>{cert.issuing_org}</Text>}
                    </View>
                  </View>
                ))}

              {section.section_type === "projects" &&
                sectionProjects.map((proj) => (
                  <View key={proj.id} style={{ marginBottom: 8 }}>
                    <Text style={s.entryTitle}>{proj.name}</Text>
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
