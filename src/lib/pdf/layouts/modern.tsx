import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { PdfColorPalette, ResumeData } from "../types";
import { formatDateRange, groupSkillsByCategory } from "../utils";

function createStyles(c: PdfColorPalette) {
  return StyleSheet.create({
    page: { flexDirection: "row", fontFamily: "Helvetica", fontSize: 10, backgroundColor: c.background },
    sidebar: { width: 180, backgroundColor: c.sidebarBg, padding: 24, paddingTop: 36, color: c.sidebarText },
    main: { flex: 1, padding: 32, paddingTop: 36, color: c.text },
    sidebarName: { fontSize: 16, fontWeight: "bold", color: c.sidebarHeading, marginBottom: 4 },
    sidebarHeadline: { fontSize: 9, color: c.sidebarText, marginBottom: 16, lineHeight: 1.4 },
    sidebarSection: { marginBottom: 14 },
    sidebarSectionTitle: { fontSize: 9, fontWeight: "bold", color: c.sidebarHeading, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: c.primaryLight, paddingBottom: 3 },
    sidebarItem: { fontSize: 8.5, color: c.sidebarText, marginBottom: 3, lineHeight: 1.4 },
    sidebarSkillName: { fontSize: 8.5, color: c.sidebarHeading, marginBottom: 2 },
    sidebarSkillCategory: { fontSize: 8, fontWeight: "bold", color: c.sidebarHeading, marginTop: 4, marginBottom: 2 },
    sectionTitle: { fontSize: 12, fontWeight: "bold", color: c.heading, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, borderBottomWidth: 1.5, borderBottomColor: c.primary, paddingBottom: 4 },
    section: { marginBottom: 14 },
    entryHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
    entryTitle: { fontSize: 11, fontWeight: "bold", color: c.heading },
    entrySubtitle: { fontSize: 9.5, color: c.textLight },
    entryDate: { fontSize: 8.5, color: c.textLight },
    entryDescription: { fontSize: 9.5, color: c.text, marginTop: 3, lineHeight: 1.5 },
    highlight: { fontSize: 9.5, color: c.text, marginLeft: 10, marginTop: 2, lineHeight: 1.4 },
    entrySpacing: { marginBottom: 10 },
    projectGrid: { marginBottom: 8 },
    techList: { fontSize: 8.5, color: c.accent, marginTop: 2 },
  });
}

export function ModernLayout({ data, palette }: { data: ResumeData; palette: PdfColorPalette }) {
  const s = createStyles(palette);
  const { profile, sections, experiences, educations, skills, certifications, projects, customSections } = data;

  // Determine sidebar content: contact info, skills, certifications
  const allSkills = skills;
  const allCerts = certifications;
  const mainSections = sections.filter(
    (sec) => sec.section_type !== "skills" && sec.section_type !== "certifications"
  );
  const skillSections = sections.filter((sec) => sec.section_type === "skills");
  const certSections = sections.filter((sec) => sec.section_type === "certifications");

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Sidebar */}
        <View style={s.sidebar}>
          <Text style={s.sidebarName}>{profile.first_name}{"\n"}{profile.last_name}</Text>
          {profile.headline && <Text style={s.sidebarHeadline}>{profile.headline}</Text>}

          {/* Contact */}
          <View style={s.sidebarSection}>
            <Text style={s.sidebarSectionTitle}>Contact</Text>
            <Text style={s.sidebarItem}>{profile.email}</Text>
            {profile.phone_personal && <Text style={s.sidebarItem}>{profile.phone_personal}</Text>}
            {profile.location && <Text style={s.sidebarItem}>{profile.location}</Text>}
            {profile.website_url && <Text style={s.sidebarItem}>{profile.website_url}</Text>}
          </View>

          {/* Skills in sidebar */}
          {skillSections.map((section) => {
            const sectionSkills = allSkills.filter((sk) => sk.section_id === section.id);
            if (sectionSkills.length === 0) return null;
            const grouped = groupSkillsByCategory(sectionSkills);
            return (
              <View key={section.id} style={s.sidebarSection}>
                <Text style={s.sidebarSectionTitle}>{section.title}</Text>
                {Array.from(grouped.entries()).map(([cat, catSkills]) => (
                  <View key={cat}>
                    {grouped.size > 1 && <Text style={s.sidebarSkillCategory}>{cat}</Text>}
                    {catSkills.map((sk) => (
                      <Text key={sk.id} style={s.sidebarSkillName}>• {sk.name}</Text>
                    ))}
                  </View>
                ))}
              </View>
            );
          })}

          {/* Certifications in sidebar */}
          {certSections.map((section) => {
            const sectionCerts = allCerts.filter((c) => c.section_id === section.id);
            if (sectionCerts.length === 0) return null;
            return (
              <View key={section.id} style={s.sidebarSection}>
                <Text style={s.sidebarSectionTitle}>{section.title}</Text>
                {sectionCerts.map((cert) => (
                  <View key={cert.id} style={{ marginBottom: 4 }}>
                    <Text style={s.sidebarSkillName}>{cert.name}</Text>
                    {cert.issuing_org && <Text style={s.sidebarItem}>{cert.issuing_org}</Text>}
                  </View>
                ))}
              </View>
            );
          })}
        </View>

        {/* Main content */}
        <View style={s.main}>
          {mainSections.map((section) => {
            const sectionExp = experiences.filter((e) => e.section_id === section.id);
            const sectionEdu = educations.filter((e) => e.section_id === section.id);
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

                {section.section_type === "projects" &&
                  sectionProjects.map((proj) => (
                    <View key={proj.id} style={s.projectGrid}>
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
