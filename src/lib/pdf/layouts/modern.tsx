import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { PdfColorPalette, PdfFontConfig, ResumeData } from "../types";
import { formatDateRange, groupSkillsByCategory } from "../utils";

function createStyles(c: PdfColorPalette, f: PdfFontConfig) {
  const s = f.fontScale;
  const sp = f.spacingScale;
  const lh = f.lineHeight;
  return StyleSheet.create({
    page: { flexDirection: "row", fontFamily: f.fontFamily, fontSize: 10 * s, backgroundColor: c.background, lineHeight: lh },
    sidebar: { width: 180, backgroundColor: c.sidebarBg, padding: 24 * sp, paddingTop: 36 * sp, color: c.sidebarText },
    main: { flex: 1, padding: 32 * sp, paddingTop: 36 * sp, color: c.text },
    sidebarName: { fontSize: 16 * s, fontWeight: "bold", color: c.sidebarHeading, marginBottom: 4 * sp },
    sidebarHeadline: { fontSize: 9 * s, color: c.sidebarText, marginBottom: 16 * sp, lineHeight: lh },
    sidebarSection: { marginBottom: 14 * sp },
    sidebarSectionTitle: { fontSize: 9 * s, fontWeight: "bold", color: c.sidebarHeading, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 * sp, borderBottomWidth: 1, borderBottomColor: c.primaryLight, paddingBottom: 3 * sp },
    sidebarItem: { fontSize: 8.5 * s, color: c.sidebarText, marginBottom: 3 * sp, lineHeight: lh },
    sidebarSkillName: { fontSize: 8.5 * s, color: c.sidebarHeading, marginBottom: 2 * sp },
    sidebarSkillCategory: { fontSize: 8 * s, fontWeight: "bold", color: c.sidebarHeading, marginTop: 4 * sp, marginBottom: 2 * sp },
    sectionTitle: { fontSize: 12 * s, fontWeight: "bold", color: c.heading, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 * sp, borderBottomWidth: 1.5, borderBottomColor: c.primary, paddingBottom: 4 * sp },
    section: { marginBottom: 14 * sp },
    entryHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 * sp },
    entryTitle: { fontSize: 11 * s, fontWeight: "bold", color: c.heading },
    entrySubtitle: { fontSize: 9.5 * s, color: c.textLight },
    entryDate: { fontSize: 8.5 * s, color: c.textLight },
    entryDescription: { fontSize: 9.5 * s, color: c.text, marginTop: 3 * sp, lineHeight: lh },
    highlight: { fontSize: 9.5 * s, color: c.text, marginLeft: 10 * sp, marginTop: 2 * sp, lineHeight: lh },
    entrySpacing: { marginBottom: 10 * sp },
    projectGrid: { marginBottom: 8 * sp },
    techList: { fontSize: 8.5 * s, color: c.accent, marginTop: 2 * sp },
  });
}

export function ModernLayout({ data, palette, font }: { data: ResumeData; palette: PdfColorPalette; font: PdfFontConfig }) {
  const s = createStyles(palette, font);
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
