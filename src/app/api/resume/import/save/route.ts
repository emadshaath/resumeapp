import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SectionType } from "@/types/database";

interface ImportedProfile {
  first_name?: string;
  last_name?: string;
  headline?: string | null;
  location?: string | null;
  website_url?: string | null;
  phone_personal?: string | null;
}

interface ImportedExperience {
  company_name: string;
  position: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  description?: string | null;
  highlights?: string[];
}

interface ImportedEducation {
  institution: string;
  degree?: string | null;
  field_of_study?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  gpa?: string | null;
  description?: string | null;
}

interface ImportedSkill {
  name: string;
  category?: string | null;
  proficiency?: string | null;
}

interface ImportedCertification {
  name: string;
  issuing_org?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  credential_url?: string | null;
}

interface ImportedProject {
  name: string;
  description?: string | null;
  url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  highlights?: string[];
  technologies?: string[];
}

interface ImportPayload {
  profile?: ImportedProfile;
  summary?: string | null;
  experiences?: ImportedExperience[];
  educations?: ImportedEducation[];
  skills?: ImportedSkill[];
  certifications?: ImportedCertification[];
  projects?: ImportedProject[];
}

// POST /api/resume/import/save — Save parsed resume data to database
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data: ImportPayload = await req.json();

  try {
    // 1. Update profile if provided
    if (data.profile) {
      const updates: Record<string, unknown> = {};
      if (data.profile.first_name) updates.first_name = data.profile.first_name;
      if (data.profile.last_name) updates.last_name = data.profile.last_name;
      if (data.profile.headline !== undefined) updates.headline = data.profile.headline;
      if (data.profile.location !== undefined) updates.location = data.profile.location;
      if (data.profile.website_url !== undefined) updates.website_url = data.profile.website_url;
      if (data.profile.phone_personal !== undefined) updates.phone_personal = data.profile.phone_personal;

      if (Object.keys(updates).length > 0) {
        await supabase.from("profiles").update(updates).eq("id", user.id);
      }
    }

    // Get existing sections to determine display_order offset
    const { data: existingSections } = await supabase
      .from("resume_sections")
      .select("id, section_type")
      .eq("profile_id", user.id);

    let sectionOrder = existingSections?.length || 0;

    // Helper to create a section and return its ID
    async function createSection(type: SectionType, title: string): Promise<string | null> {
      const { data: sec, error } = await supabase
        .from("resume_sections")
        .insert({
          profile_id: user!.id,
          section_type: type,
          title,
          display_order: sectionOrder++,
          is_visible: true,
        })
        .select("id")
        .single();

      if (error || !sec) return null;
      return sec.id;
    }

    const created: string[] = [];

    // 2. Summary
    if (data.summary) {
      const sectionId = await createSection("summary", "Professional Summary");
      if (sectionId) {
        await supabase.from("custom_sections").insert({
          section_id: sectionId,
          profile_id: user.id,
          content: data.summary,
          display_order: 0,
        });
        created.push("summary");
      }
    }

    // 3. Experiences
    if (data.experiences && data.experiences.length > 0) {
      const sectionId = await createSection("experience", "Work Experience");
      if (sectionId) {
        const rows = data.experiences.map((exp, i) => ({
          section_id: sectionId,
          profile_id: user.id,
          company_name: exp.company_name,
          position: exp.position,
          location: exp.location || null,
          start_date: exp.start_date || new Date().toISOString().split("T")[0],
          end_date: exp.end_date || null,
          is_current: exp.is_current || false,
          description: exp.description || null,
          highlights: exp.highlights || [],
          display_order: i,
        }));
        await supabase.from("experiences").insert(rows);
        created.push("experience");
      }
    }

    // 4. Education
    if (data.educations && data.educations.length > 0) {
      const sectionId = await createSection("education", "Education");
      if (sectionId) {
        const rows = data.educations.map((edu, i) => ({
          section_id: sectionId,
          profile_id: user.id,
          institution: edu.institution,
          degree: edu.degree || null,
          field_of_study: edu.field_of_study || null,
          location: edu.location || null,
          start_date: edu.start_date || null,
          end_date: edu.end_date || null,
          is_current: edu.is_current || false,
          gpa: edu.gpa || null,
          description: edu.description || null,
          display_order: i,
        }));
        await supabase.from("educations").insert(rows);
        created.push("education");
      }
    }

    // 5. Skills
    if (data.skills && data.skills.length > 0) {
      const sectionId = await createSection("skills", "Skills");
      if (sectionId) {
        const validProficiencies = ["beginner", "intermediate", "advanced", "expert"];
        const rows = data.skills.map((skill, i) => ({
          section_id: sectionId,
          profile_id: user.id,
          name: skill.name,
          category: skill.category || null,
          proficiency: skill.proficiency && validProficiencies.includes(skill.proficiency)
            ? skill.proficiency
            : null,
          display_order: i,
        }));
        await supabase.from("skills").insert(rows);
        created.push("skills");
      }
    }

    // 6. Certifications
    if (data.certifications && data.certifications.length > 0) {
      const sectionId = await createSection("certifications", "Certifications");
      if (sectionId) {
        const rows = data.certifications.map((cert, i) => ({
          section_id: sectionId,
          profile_id: user.id,
          name: cert.name,
          issuing_org: cert.issuing_org || null,
          issue_date: cert.issue_date || null,
          expiry_date: cert.expiry_date || null,
          credential_url: cert.credential_url || null,
          display_order: i,
        }));
        await supabase.from("certifications").insert(rows);
        created.push("certifications");
      }
    }

    // 7. Projects
    if (data.projects && data.projects.length > 0) {
      const sectionId = await createSection("projects", "Projects");
      if (sectionId) {
        const rows = data.projects.map((proj, i) => ({
          section_id: sectionId,
          profile_id: user.id,
          name: proj.name,
          description: proj.description || null,
          url: proj.url || null,
          start_date: proj.start_date || null,
          end_date: proj.end_date || null,
          highlights: proj.highlights || [],
          technologies: proj.technologies || [],
          display_order: i,
        }));
        await supabase.from("projects").insert(rows);
        created.push("projects");
      }
    }

    return NextResponse.json({
      success: true,
      sections_created: created,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to save imported resume data" },
      { status: 500 },
    );
  }
}
