import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResumeData } from "./types";
import type { Profile, ResumeSection, Experience, Education, Skill, Certification, Project, CustomSection } from "@/types/database";
import { parseHighlights } from "@/lib/utils";

/**
 * Fetches all resume data for a given profile ID.
 * Works with both authenticated client and admin client.
 */
export async function fetchResumeData(
  supabase: SupabaseClient,
  profileId: string
): Promise<ResumeData | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (!profile) return null;

  const { data: sections } = await supabase
    .from("resume_sections")
    .select("*")
    .eq("profile_id", profileId)
    .eq("is_visible", true)
    .order("display_order");

  const sectionList = (sections || []) as ResumeSection[];
  const sectionIds = sectionList.map((s) => s.id);

  if (sectionIds.length === 0) {
    return {
      profile: profile as Profile,
      sections: [],
      experiences: [],
      educations: [],
      skills: [],
      certifications: [],
      projects: [],
      customSections: [],
    };
  }

  const [experiences, educations, skills, certifications, projects, customSections] =
    await Promise.all([
      supabase.from("experiences").select("*").in("section_id", sectionIds).order("display_order"),
      supabase.from("educations").select("*").in("section_id", sectionIds).order("display_order"),
      supabase.from("skills").select("*").in("section_id", sectionIds).order("display_order"),
      supabase.from("certifications").select("*").in("section_id", sectionIds).order("display_order"),
      supabase.from("projects").select("*").in("section_id", sectionIds).order("display_order"),
      supabase.from("custom_sections").select("*").in("section_id", sectionIds).order("display_order"),
    ]);

  return {
    profile: profile as Profile,
    sections: sectionList,
    experiences: (experiences.data || []).map((e: Record<string, unknown>) => ({ ...e, highlights: parseHighlights(e.highlights) })) as Experience[],
    educations: (educations.data || []) as Education[],
    skills: (skills.data || []) as Skill[],
    certifications: (certifications.data || []) as Certification[],
    projects: (projects.data || []) as Project[],
    customSections: (customSections.data || []) as CustomSection[],
  };
}
