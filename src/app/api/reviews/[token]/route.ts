import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";
import { pseudonymizeResume } from "@/lib/reviews/pseudonymize";
import { parseHighlights } from "@/lib/utils";
import type {
  Profile,
  ResumeSection,
  Experience,
  Education,
  Skill,
  Certification,
  Project,
  CustomSection,
  PseudonymizeOptions,
} from "@/types/database";

interface RouteContext {
  params: Promise<{ token: string }>;
}

function verifyPassword(token: string, password: string, hash: string): boolean {
  const computed = createHash("sha256").update(token + password).digest("hex");
  return computed === hash;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const supabase = createAdminClient();

    // Look up the review link
    const { data: link } = await supabase
      .from("review_links")
      .select("*")
      .eq("token", token)
      .single();

    if (!link) {
      return NextResponse.json({ error: "Review link not found" }, { status: 404 });
    }

    if (!link.is_active) {
      return NextResponse.json({ error: "This review link has been deactivated" }, { status: 410 });
    }

    if (new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: "This review link has expired" }, { status: 410 });
    }

    // Check password if required
    if (link.password_hash) {
      const password = request.headers.get("x-review-password");
      if (!password) {
        return NextResponse.json({ requiresPassword: true }, { status: 401 });
      }
      if (!verifyPassword(token, password, link.password_hash)) {
        return NextResponse.json({ error: "Incorrect password", requiresPassword: true }, { status: 401 });
      }
    }

    // If this link has a variant_id, use the frozen resolved_resume instead of live data
    let resumeData: {
      profile: Profile;
      sections: ResumeSection[];
      experiences: Experience[];
      educations: Education[];
      skills: Skill[];
      certifications: Certification[];
      projects: Project[];
      customSections: CustomSection[];
    };
    let isVariant = false;
    let variantName: string | null = null;

    if (link.variant_id) {
      const { data: variant } = await supabase
        .from("profile_variants")
        .select("name, resolved_resume")
        .eq("id", link.variant_id)
        .single();

      if (variant?.resolved_resume) {
        const resolved = variant.resolved_resume as Record<string, unknown>;
        resumeData = {
          profile: resolved.profile as Profile,
          sections: resolved.sections as ResumeSection[],
          experiences: resolved.experiences as Experience[],
          educations: resolved.educations as Education[],
          skills: resolved.skills as Skill[],
          certifications: resolved.certifications as Certification[],
          projects: resolved.projects as Project[],
          customSections: resolved.customSections as CustomSection[],
        };
        isVariant = true;
        variantName = variant.name;
      } else {
        // Variant missing or no resolved_resume — fall through to live data
        resumeData = await fetchLiveResumeData(supabase, link.profile_id);
      }
    } else {
      resumeData = await fetchLiveResumeData(supabase, link.profile_id);
    }

    if (!resumeData.profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Apply pseudonymization
    const pseudonymized = pseudonymizeResume(
      resumeData,
      link.pseudonymize_options as PseudonymizeOptions,
      token
    );

    // Fetch existing comments for this link
    const { data: comments } = await supabase
      .from("review_comments")
      .select("id, section_id, section_type, reviewer_name, comment_text, created_at")
      .eq("review_link_id", link.id)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      ...pseudonymized,
      comments: comments || [],
      sections_meta: resumeData.sections.map((s: ResumeSection) => ({
        id: s.id,
        section_type: s.section_type,
        title: s.title,
      })),
      is_variant: isVariant,
      variant_name: variantName,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function fetchLiveResumeData(
  supabase: ReturnType<typeof createAdminClient>,
  profileId: string
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  const { data: sections } = await supabase
    .from("resume_sections")
    .select("*")
    .eq("profile_id", profileId)
    .eq("is_visible", true)
    .order("display_order");

  const sectionIds = (sections || []).map((s: ResumeSection) => s.id);

  let experiences: Experience[] = [];
  let educations: Education[] = [];
  let skills: Skill[] = [];
  let certifications: Certification[] = [];
  let projects: Project[] = [];
  let customSections: CustomSection[] = [];

  if (sectionIds.length > 0) {
    const [expRes, eduRes, skillRes, certRes, projRes, customRes] = await Promise.all([
      supabase.from("experiences").select("*").in("section_id", sectionIds).order("display_order"),
      supabase.from("educations").select("*").in("section_id", sectionIds).order("display_order"),
      supabase.from("skills").select("*").in("section_id", sectionIds).order("display_order"),
      supabase.from("certifications").select("*").in("section_id", sectionIds).order("display_order"),
      supabase.from("projects").select("*").in("section_id", sectionIds).order("display_order"),
      supabase.from("custom_sections").select("*").in("section_id", sectionIds).order("display_order"),
    ]);

    experiences = (expRes.data || []).map((e: Record<string, unknown>) => ({ ...e, highlights: parseHighlights(e.highlights) })) as Experience[];
    educations = (eduRes.data || []) as Education[];
    skills = (skillRes.data || []) as Skill[];
    certifications = (certRes.data || []) as Certification[];
    projects = (projRes.data || []) as Project[];
    customSections = (customRes.data || []) as CustomSection[];
  }

  return {
    profile: profile as Profile,
    sections: (sections || []) as ResumeSection[],
    experiences,
    educations,
    skills,
    certifications,
    projects,
    customSections,
  };
}
