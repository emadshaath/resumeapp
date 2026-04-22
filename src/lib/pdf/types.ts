import type { Profile, Experience, Education, Skill, Certification, Project, CustomSection, ResumeSection } from "@/types/database";

export type PdfLayout = "classic" | "modern" | "minimal" | "executive";
export type PdfColorTheme = "navy" | "teal" | "charcoal";

export type PdfFontFamily =
  | "Helvetica"
  | "Times-Roman"
  | "Courier"
  | "Inter"
  | "Merriweather"
  | "Source Sans Pro";

export interface PdfFontConfig {
  fontFamily: PdfFontFamily;
  fontScale: number;    // 0.80 – 1.25  (multiplies every fontSize)
  lineHeight: number;   // 1.15 – 1.85
  spacingScale: number; // 0.80 – 1.30  (multiplies page padding + section margins)
}

export const DEFAULT_FONT_CONFIG: PdfFontConfig = {
  fontFamily: "Helvetica",
  fontScale: 1.0,
  lineHeight: 1.45,
  spacingScale: 1.0,
};

export const FONT_OPTIONS: Record<PdfFontFamily, {
  label: string;
  flavor: "sans" | "serif" | "mono";
  description: string;
  webFamily: string; // CSS font-family used for UI/preview labels
}> = {
  "Helvetica": {
    label: "Helvetica",
    flavor: "sans",
    description: "Clean, versatile sans-serif",
    webFamily: "Helvetica, Arial, ui-sans-serif, system-ui, sans-serif",
  },
  "Times-Roman": {
    label: "Times Roman",
    flavor: "serif",
    description: "Classic editorial serif",
    webFamily: "'Times New Roman', Times, ui-serif, Georgia, serif",
  },
  "Courier": {
    label: "Courier",
    flavor: "mono",
    description: "Technical monospace",
    webFamily: "'Courier New', Courier, ui-monospace, monospace",
  },
  "Inter": {
    label: "Inter",
    flavor: "sans",
    description: "Modern geometric sans",
    webFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  "Merriweather": {
    label: "Merriweather",
    flavor: "serif",
    description: "Elegant, readable serif",
    webFamily: "Merriweather, Georgia, ui-serif, serif",
  },
  "Source Sans Pro": {
    label: "Source Sans Pro",
    flavor: "sans",
    description: "Friendly humanist sans",
    webFamily: "'Source Sans Pro', ui-sans-serif, system-ui, sans-serif",
  },
};

export const FONT_PRESETS: Record<string, { label: string; description: string; config: Omit<PdfFontConfig, "fontFamily"> }> = {
  compact: {
    label: "Compact",
    description: "Fits more on one page",
    config: { fontScale: 0.90, lineHeight: 1.3, spacingScale: 0.85 },
  },
  comfortable: {
    label: "Comfortable",
    description: "Balanced default",
    config: { fontScale: 1.0, lineHeight: 1.45, spacingScale: 1.0 },
  },
  spacious: {
    label: "Spacious",
    description: "Airy and easy to read",
    config: { fontScale: 1.08, lineHeight: 1.65, spacingScale: 1.20 },
  },
};

export interface PdfColorPalette {
  primary: string;
  primaryLight: string;
  accent: string;
  heading: string;
  text: string;
  textLight: string;
  border: string;
  background: string;
  sidebarBg: string;
  sidebarText: string;
  sidebarHeading: string;
}

export const COLOR_THEMES: Record<PdfColorTheme, { label: string; palette: PdfColorPalette }> = {
  navy: {
    label: "Navy Professional",
    palette: {
      primary: "#1e3a5f",
      primaryLight: "#2d5986",
      accent: "#3b82f6",
      heading: "#1e3a5f",
      text: "#334155",
      textLight: "#64748b",
      border: "#cbd5e1",
      background: "#ffffff",
      sidebarBg: "#1e3a5f",
      sidebarText: "#cbd5e1",
      sidebarHeading: "#ffffff",
    },
  },
  teal: {
    label: "Teal Fresh",
    palette: {
      primary: "#0f766e",
      primaryLight: "#14b8a6",
      accent: "#2dd4bf",
      heading: "#0f766e",
      text: "#334155",
      textLight: "#64748b",
      border: "#99f6e4",
      background: "#ffffff",
      sidebarBg: "#0f766e",
      sidebarText: "#ccfbf1",
      sidebarHeading: "#ffffff",
    },
  },
  charcoal: {
    label: "Charcoal Elegant",
    palette: {
      primary: "#27272a",
      primaryLight: "#3f3f46",
      accent: "#a1a1aa",
      heading: "#18181b",
      text: "#3f3f46",
      textLight: "#71717a",
      border: "#d4d4d8",
      background: "#ffffff",
      sidebarBg: "#27272a",
      sidebarText: "#d4d4d8",
      sidebarHeading: "#fafafa",
    },
  },
};

export const LAYOUT_OPTIONS: Record<PdfLayout, { label: string; description: string }> = {
  classic: {
    label: "Classic",
    description: "Traditional single-column layout with clean section dividers",
  },
  modern: {
    label: "Modern",
    description: "Two-column design with a colored sidebar for skills and contact",
  },
  minimal: {
    label: "Minimal",
    description: "Spacious, typography-focused layout with subtle accents",
  },
  executive: {
    label: "Executive",
    description: "Bold header with structured sections and accent bars",
  },
};

export interface ResumeData {
  profile: Profile;
  sections: ResumeSection[];
  experiences: Experience[];
  educations: Education[];
  skills: Skill[];
  certifications: Certification[];
  projects: Project[];
  customSections: CustomSection[];
}

export type { PdfSettings } from "@/types/database";
