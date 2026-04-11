import type {
  Profile,
  ResumeSection,
  Experience,
  Education,
  Skill,
  Certification,
  Project,
  CustomSection,
  PdfSettings,
} from "@/types/database";

/**
 * Common props every template component receives.
 * Templates compose section primitives differently but all consume the same data.
 */
export interface TemplateProps {
  profile: Profile;
  sections: ResumeSection[];
  experiences: Experience[];
  educations: Education[];
  skills: Skill[];
  certifications: Certification[];
  projects: Project[];
  customSections: CustomSection[];
  pdfSettings: PdfSettings | null;
  themeColors: {
    heroFrom: string;
    heroTo: string;
    brand: string;
  };
}

/** Helper: format an ISO date string as "Mon YYYY". Empty string for null/undefined. */
export function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Helper: filter and sort experiences for a section, current jobs first then by date desc. */
export function sortExperiences(experiences: Experience[], sectionId: string): Experience[] {
  return experiences
    .filter((e) => e.section_id === sectionId)
    .sort((a, b) => {
      if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
      return (b.start_date || "").localeCompare(a.start_date || "");
    });
}

/** Helper: filter and sort educations for a section, current first then by date desc. */
export function sortEducations(educations: Education[], sectionId: string): Education[] {
  return educations
    .filter((e) => e.section_id === sectionId)
    .sort((a, b) => {
      if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
      return (b.start_date || "").localeCompare(a.start_date || "");
    });
}

/** Helper: group skills by category. Returns Map preserving insertion order. */
export function groupSkillsByCategory(skills: Skill[]): Map<string, Skill[]> {
  const categories = new Map<string, Skill[]>();
  skills.forEach((skill) => {
    const cat = skill.category || "General";
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(skill);
  });
  return categories;
}
