import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  params: Promise<{ id: string }>;
}

/**
 * Owner-only preview: fetches the pseudonymized resume + comments
 * for a specific review link. Bypasses password/expiry checks since
 * the owner is authenticated.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get the link — owner only
    const { data: link } = await admin
      .from("review_links")
      .select("*")
      .eq("id", id)
      .eq("profile_id", user.id)
      .single();

    if (!link) {
      return NextResponse.json({ error: "Review link not found" }, { status: 404 });
    }

    // Fetch resume data — from variant if linked, otherwise live
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
      const { data: variant } = await admin
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
        resumeData = await fetchLiveData(admin, user.id);
      }
    } else {
      resumeData = await fetchLiveData(admin, user.id);
    }

    if (!resumeData.profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Apply pseudonymization
    const pseudonymized = pseudonymizeResume(
      resumeData,
      link.pseudonymize_options as PseudonymizeOptions,
      link.token
    );

    // Fetch comments for this link
    const { data: comments } = await admin
      .from("review_comments")
      .select("id, section_id, section_type, reviewer_name, comment_text, created_at")
      .eq("review_link_id", link.id)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      link: {
        id: link.id,
        token: link.token,
        is_active: link.is_active,
        expires_at: link.expires_at,
        has_password: !!link.password_hash,
        pseudonymize_options: link.pseudonymize_options,
        variant_id: link.variant_id || null,
        created_at: link.created_at,
      },
      resume: pseudonymized,
      comments: comments || [],
      is_variant: isVariant,
      variant_name: variantName,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function fetchLiveData(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string
) {
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  const { data: sections } = await admin
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
      admin.from("experiences").select("*").in("section_id", sectionIds).order("display_order"),
      admin.from("educations").select("*").in("section_id", sectionIds).order("display_order"),
      admin.from("skills").select("*").in("section_id", sectionIds).order("display_order"),
      admin.from("certifications").select("*").in("section_id", sectionIds).order("display_order"),
      admin.from("projects").select("*").in("section_id", sectionIds).order("display_order"),
      admin.from("custom_sections").select("*").in("section_id", sectionIds).order("display_order"),
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
