import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { PdfColorPalette, ResumeData } from "../types";
import { formatDateRange, groupSkillsByCategory } from "../utils";

function createStyles(c: PdfColorPalette) {
  return StyleSheet.create({
    page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: c.text, backgroundColor: c.background },
    header: { marginBottom: 20, borderBottomWidth: 2, borderBottomColor: c.primary, paddingBottom: 12 },
    name: { fontSize: 24, fontWeight: "bold", color: c.heading, marginBottom: 4 },
    headline: { fontSize: 12, color: c.textLight, marginBottom: 6 },
    contactRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    contactItem: { fontSize: 9, color: c.textLight },
    section: { marginBottom: 14 },
    sectionTitle: { fontSize: 12, fontWeight: "bold", color: c.heading, textTransform: "uppercase", letterSpacing: 1, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 4, marginBottom: 8 },
    entryHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
    entryTitle: { fontSize: 11, fontWeight: "bold", color: c.heading },
    entrySubtitle: { fontSize: 10, color: c.textLight },
    entryDate: { fontSize: 9, color: c.textLight },
    entryDescription: { fontSize: 9.5, color: c.text, marginTop: 3, lineHeight: 1.5 },
    highlight: { fontSize: 9.5, color: c.text, marginLeft: 10, marginTop: 2, lineHeight: 1.4 },
    skillCategory: { fontSize: 9, fontWeight: "bold", color: c.heading, marginBottom: 2, marginTop: 4 },
    skillList: { fontSize: 9.5, color: c.text, lineHeight: 1.5 },
    projectGrid: { marginBottom: 8 },
    techList: { fontSize: 8.5, color: c.accent, marginTop: 2 },
    entrySpacing: { marginBottom: 10 },
  });
}

export function ClassicLayout({ data, palette }: { data: ResumeData; palette: PdfColorPalette }) {
  const s = createStyles(palette);
  const { profile, sections, experiences, educations, skills, certifications, projects, customSections } = data;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.name}>{profile.first_name} {profile.last_name}</Text>
          {profile.headline && <Text style={s.headline}>{profile.headline}</Text>}
          <View style={s.contactRow}>
            <Text style={s.contactItem}>{profile.email}</Text>
            {profile.phone_personal && <Text style={s.contactItem}>{profile.phone_personal}</Text>}
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
            <View key={section.id} style={s.section} wrap={false}>
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
