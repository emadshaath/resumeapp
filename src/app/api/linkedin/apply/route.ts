import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SectionType } from "@/types/database";

interface ApplyPayload {
  profile?: {
    headline?: string | null;
    location?: string | null;
  };
  summary?: string | null;
  experiences?: {
    company_name: string;
    position: string;
    location?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    is_current?: boolean;
    description?: string | null;
    highlights?: string[];
  }[];
  educations?: {
    institution: string;
    degree?: string | null;
    field_of_study?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    description?: string | null;
  }[];
  skills?: {
    name: string;
    category?: string | null;
  }[];
  certifications?: {
    name: string;
    issuing_org?: string | null;
    issue_date?: string | null;
  }[];
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data: ApplyPayload = await req.json();

  try {
    // 1. Update profile fields if provided
    if (data.profile) {
      const updates: Record<string, unknown> = {};
      if (data.profile.headline !== undefined) updates.headline = data.profile.headline;
      if (data.profile.location !== undefined) updates.location = data.profile.location;

      if (Object.keys(updates).length > 0) {
        await supabase.from("profiles").update(updates).eq("id", user.id);
      }
    }

    // Get existing sections
    const { data: existingSections } = await supabase
      .from("resume_sections")
      .select("id, section_type")
      .eq("profile_id", user.id);

    const existingByType = new Map<string, string>();
    for (const s of existingSections || []) {
      existingByType.set(s.section_type, s.id);
    }

    let sectionOrder = existingSections?.length || 0;

    async function getOrCreateSection(type: SectionType, title: string): Promise<string | null> {
      const existingId = existingByType.get(type);
      if (existingId) return existingId;

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

    const applied: string[] = [];

    // 2. Add new experiences (append, don't replace)
    if (data.experiences && data.experiences.length > 0) {
      const sectionId = await getOrCreateSection("experience", "Work Experience");
      if (sectionId) {
        // Get current max display_order
        const { data: existing } = await supabase
          .from("experiences")
          .select("display_order")
          .eq("section_id", sectionId)
          .order("display_order", { ascending: false })
          .limit(1);

        const startOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

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
          display_order: startOrder + i,
        }));
        await supabase.from("experiences").insert(rows);
        applied.push("experiences");
      }
    }

    // 3. Add new educations (append)
    if (data.educations && data.educations.length > 0) {
      const sectionId = await getOrCreateSection("education", "Education");
      if (sectionId) {
        const { data: existing } = await supabase
          .from("educations")
          .select("display_order")
          .eq("section_id", sectionId)
          .order("display_order", { ascending: false })
          .limit(1);

        const startOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

        const rows = data.educations.map((edu, i) => ({
          section_id: sectionId,
          profile_id: user.id,
          institution: edu.institution,
          degree: edu.degree || null,
          field_of_study: edu.field_of_study || null,
          start_date: edu.start_date || null,
          end_date: edu.end_date || null,
          is_current: false,
          description: edu.description || null,
          display_order: startOrder + i,
        }));
        await supabase.from("educations").insert(rows);
        applied.push("educations");
      }
    }

    // 4. Add new skills (append)
    if (data.skills && data.skills.length > 0) {
      const sectionId = await getOrCreateSection("skills", "Skills");
      if (sectionId) {
        const { data: existing } = await supabase
          .from("skills")
          .select("display_order")
          .eq("section_id", sectionId)
          .order("display_order", { ascending: false })
          .limit(1);

        const startOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

        const rows = data.skills.map((skill, i) => ({
          section_id: sectionId,
          profile_id: user.id,
          name: skill.name,
          category: skill.category || null,
          proficiency: null,
          display_order: startOrder + i,
        }));
        await supabase.from("skills").insert(rows);
        applied.push("skills");
      }
    }

    // 5. Add new certifications (append)
    if (data.certifications && data.certifications.length > 0) {
      const sectionId = await getOrCreateSection("certifications", "Certifications");
      if (sectionId) {
        const { data: existing } = await supabase
          .from("certifications")
          .select("display_order")
          .eq("section_id", sectionId)
          .order("display_order", { ascending: false })
          .limit(1);

        const startOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

        const rows = data.certifications.map((cert, i) => ({
          section_id: sectionId,
          profile_id: user.id,
          name: cert.name,
          issuing_org: cert.issuing_org || null,
          issue_date: cert.issue_date || null,
          display_order: startOrder + i,
        }));
        await supabase.from("certifications").insert(rows);
        applied.push("certifications");
      }
    }

    // 6. Update summary if provided
    if (data.summary) {
      const sectionId = await getOrCreateSection("summary", "Professional Summary");
      if (sectionId) {
        // Check if summary content exists
        const { data: existingContent } = await supabase
          .from("custom_sections")
          .select("id")
          .eq("section_id", sectionId)
          .limit(1);

        if (existingContent && existingContent.length > 0) {
          await supabase
            .from("custom_sections")
            .update({ content: data.summary })
            .eq("id", existingContent[0].id);
        } else {
          await supabase.from("custom_sections").insert({
            section_id: sectionId,
            profile_id: user.id,
            content: data.summary,
            display_order: 0,
          });
        }
        applied.push("summary");
      }
    }

    return NextResponse.json({ success: true, applied });
  } catch {
    return NextResponse.json(
      { error: "Failed to apply LinkedIn updates" },
      { status: 500 }
    );
  }
}
