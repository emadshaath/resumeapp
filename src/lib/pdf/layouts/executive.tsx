import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { PdfColorPalette, ResumeData } from "../types";
import { formatDateRange, groupSkillsByCategory } from "../utils";

function createStyles(c: PdfColorPalette) {
  return StyleSheet.create({
    page: { fontFamily: "Helvetica", fontSize: 10, color: c.text, backgroundColor: c.background },
    headerBand: { backgroundColor: c.primary, paddingHorizontal: 40, paddingVertical: 28 },
    name: { fontSize: 26, fontWeight: "bold", color: "#ffffff", marginBottom: 4, letterSpacing: 1 },
    headline: { fontSize: 12, color: c.sidebarText, marginBottom: 10 },
    contactRow: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
    contactItem: { fontSize: 9, color: c.sidebarText },
    body: { padding: 40, paddingTop: 24 },
    section: { marginBottom: 16 },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    accentBar: { width: 4, height: 16, backgroundColor: c.primary, marginRight: 8, borderRadius: 1 },
    sectionTitle: { fontSize: 13, fontWeight: "bold", color: c.heading, textTransform: "uppercase", letterSpacing: 1 },
    sectionDivider: { borderBottomWidth: 1, borderBottomColor: c.border, marginBottom: 10 },
    entryHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
    entryTitle: { fontSize: 11, fontWeight: "bold", color: c.heading },
    entrySubtitle: { fontSize: 9.5, color: c.textLight },
    entryDate: { fontSize: 9, color: c.textLight, backgroundColor: c.primaryLight + "18", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
    entryDescription: { fontSize: 9.5, color: c.text, marginTop: 3, lineHeight: 1.5 },
    highlight: { fontSize: 9.5, color: c.text, marginLeft: 10, marginTop: 2, lineHeight: 1.4 },
    entrySpacing: { marginBottom: 10 },
    skillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    skillPill: { fontSize: 8.5, color: c.background, backgroundColor: c.primary, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10 },
    skillCategory: { fontSize: 9, fontWeight: "bold", color: c.heading, marginBottom: 4, marginTop: 6 },
    projectBox: { borderLeftWidth: 3, borderLeftColor: c.primary, paddingLeft: 10, marginBottom: 10 },
    techList: { fontSize: 8.5, color: c.accent, marginTop: 2 },
    certRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  });
}

export function ExecutiveLayout({ data, palette }: { data: ResumeData; palette: PdfColorPalette }) {
  const s = createStyles(palette);
  const { profile, sections, experiences, educations, skills, certifications, projects, customSections } = data;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Bold header band */}
        <View style={s.headerBand}>
          <Text style={s.name}>{profile.first_name} {profile.last_name}</Text>
          {profile.headline && <Text style={s.headline}>{profile.headline}</Text>}
          <View style={s.contactRow}>
            <Text style={s.contactItem}>{profile.email}</Text>
            {profile.phone_personal && <Text style={s.contactItem}>{profile.phone_personal}</Text>}
            {profile.location && <Text style={s.contactItem}>{profile.location}</Text>}
            {profile.website_url && <Text style={s.contactItem}>{profile.website_url}</Text>}
          </View>
        </View>

        {/* Body */}
        <View style={s.body}>
          {sections.map((section) => {
            const sectionExp = experiences.filter((e) => e.section_id === section.id);
            const sectionEdu = educations.filter((e) => e.section_id === section.id);
            const sectionSkills = skills.filter((s) => s.section_id === section.id);
            const sectionCerts = certifications.filter((c) => c.section_id === section.id);
            const sectionProjects = projects.filter((p) => p.section_id === section.id);
            const sectionCustom = customSections.filter((c) => c.section_id === section.id);

            return (
              <View key={section.id} style={s.section} wrap={false}>
                <View style={s.sectionTitleRow}>
                  <View style={s.accentBar} />
                  <Text style={s.sectionTitle}>{section.title}</Text>
                </View>
                <View style={s.sectionDivider} />

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
                      <View style={s.skillsGrid}>
                        {catSkills.map((sk) => (
                          <Text key={sk.id} style={s.skillPill}>{sk.name}</Text>
                        ))}
                      </View>
                    </View>
                  ));
                })()}

                {section.section_type === "certifications" &&
                  sectionCerts.map((cert) => (
                    <View key={cert.id} style={s.certRow}>
                      <View>
                        <Text style={s.entryTitle}>{cert.name}</Text>
                        {cert.issuing_org && <Text style={s.entrySubtitle}>{cert.issuing_org}</Text>}
                      </View>
                      {cert.issue_date && (
                        <Text style={s.entryDate}>{formatDateRange(cert.issue_date, cert.expiry_date, false)}</Text>
                      )}
                    </View>
                  ))}

                {section.section_type === "projects" &&
                  sectionProjects.map((proj) => (
                    <View key={proj.id} style={s.projectBox}>
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
        </View>
      </Page>
    </Document>
  );
}
