import { StyleSheet } from "@react-pdf/renderer";
import type { PdfColorPalette, PdfFontConfig } from "../../types";

/**
 * Shared stylesheet for the custom block-driven layout.
 * Organised so each block renderer can pick the styles it needs without
 * redefining type-scale or color logic. All sizes / margins multiply through
 * the font scale + spacing scale just like the built-in layouts.
 */
export function createCustomStyles(c: PdfColorPalette, f: PdfFontConfig) {
  const s = f.fontScale;
  const sp = f.spacingScale;
  const lh = f.lineHeight;

  return StyleSheet.create({
    page: {
      fontFamily: f.fontFamily,
      fontSize: 10 * s,
      color: c.text,
      backgroundColor: c.background,
      lineHeight: lh,
    },
    pageBody: {
      padding: 40 * sp,
      flexDirection: "column",
    },
    // Two-column shell for sidebar-left page templates.
    columns: {
      flexDirection: "row",
      gap: 18 * sp,
    },
    sidebarCol: {
      backgroundColor: c.sidebarBg,
      color: c.sidebarText,
      padding: 18 * sp,
      borderRadius: 2,
    },
    mainCol: {
      flex: 1,
    },

    // HEADER block
    headerWrap: {
      marginBottom: 16 * sp,
      borderBottomWidth: 2,
      borderBottomColor: c.primary,
      paddingBottom: 10 * sp,
    },
    name: {
      fontSize: 24 * s,
      fontWeight: "bold",
      color: c.heading,
      marginBottom: 4 * sp,
    },
    headline: { fontSize: 12 * s, color: c.textLight, marginBottom: 6 * sp },
    contactRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 * sp },
    contactItem: { fontSize: 9 * s, color: c.textLight },

    // Section envelope shared by experience / education / skills / etc.
    section: { marginBottom: 12 * sp },
    sectionTitle: {
      fontSize: 12 * s,
      fontWeight: "bold",
      color: c.heading,
      textTransform: "uppercase",
      letterSpacing: 1,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      paddingBottom: 3 * sp,
      marginBottom: 6 * sp,
    },
    sidebarSectionTitle: {
      fontSize: 10 * s,
      fontWeight: "bold",
      color: c.sidebarHeading,
      textTransform: "uppercase",
      letterSpacing: 1.2,
      marginBottom: 5 * sp,
      borderBottomWidth: 1,
      borderBottomColor: c.primaryLight,
      paddingBottom: 3 * sp,
    },

    // Entries (experience, education, certifications)
    entry: { marginBottom: 8 * sp },
    entryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 1 * sp,
    },
    entryTitle: { fontSize: 11 * s, fontWeight: "bold", color: c.heading },
    entrySubtitle: { fontSize: 10 * s, color: c.textLight },
    entryDate: { fontSize: 9 * s, color: c.textLight },
    entryDescription: {
      fontSize: 9.5 * s,
      color: c.text,
      marginTop: 2 * sp,
      lineHeight: lh,
    },
    highlight: {
      fontSize: 9.5 * s,
      color: c.text,
      marginLeft: 10 * sp,
      marginTop: 1 * sp,
      lineHeight: lh,
    },

    // Skills
    skillList: { fontSize: 9.5 * s, color: c.text, lineHeight: lh },
    skillCategory: {
      fontSize: 9 * s,
      fontWeight: "bold",
      color: c.heading,
      marginTop: 3 * sp,
      marginBottom: 1 * sp,
    },
    sidebarSkillItem: {
      fontSize: 9 * s,
      color: c.sidebarText,
      marginBottom: 2 * sp,
    },

    // Custom text / summary body
    bodyText: {
      fontSize: 9.5 * s,
      color: c.text,
      lineHeight: lh,
      marginBottom: 2 * sp,
    },

    // Tech list on projects
    techList: {
      fontSize: 8.5 * s,
      color: c.accent,
      marginTop: 2 * sp,
    },

    // Divider + Spacer
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      marginVertical: 6 * sp,
    },
    sidebarDivider: {
      borderBottomWidth: 0.5,
      borderBottomColor: c.primaryLight,
      marginVertical: 5 * sp,
    },
  });
}

export type CustomStyles = ReturnType<typeof createCustomStyles>;
