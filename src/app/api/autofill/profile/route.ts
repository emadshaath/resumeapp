import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/autofill/profile?variant=<id> — Returns profile fields for form filling
// If variant is specified, returns tailored fields from that variant
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const variantId = req.nextUrl.searchParams.get("variant");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // If a variant is specified, use the tailored headline from variant data
  let tailoredHeadline: string | null = null;
  let tailoredSummary: string | null = null;
  let tailoredSkills: string | null = null;

  if (variantId) {
    const { data: variant } = await supabase
      .from("profile_variants")
      .select("variant_data")
      .eq("id", variantId)
      .eq("profile_id", user.id)
      .single();

    if (variant?.variant_data) {
      const vd = variant.variant_data as Record<string, unknown>;
      tailoredHeadline = (vd.headline as string) || null;
      tailoredSummary = (vd.summary as string) || null;
      // For skills, we need the actual skill names in the variant's order
    }
  }

  // Get latest experience for current title/company
  const { data: experiences } = await supabase
    .from("experiences")
    .select("*")
    .eq("profile_id", user.id)
    .order("start_date", { ascending: false })
    .limit(5);

  const currentJob = experiences?.find((e) => e.is_current) || experiences?.[0];

  // Get education
  const { data: educations } = await supabase
    .from("educations")
    .select("*")
    .eq("profile_id", user.id)
    .order("end_date", { ascending: false })
    .limit(3);

  const topEducation = educations?.[0];

  // Get skills
  const { data: skills } = await supabase
    .from("skills")
    .select("id, name")
    .eq("profile_id", user.id)
    .order("display_order", { ascending: true });

  // Calculate years of experience
  let yearsExperience = 0;
  if (experiences && experiences.length > 0) {
    const earliest = experiences[experiences.length - 1];
    const start = new Date(earliest.start_date);
    yearsExperience = Math.round((Date.now() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }

  const educationSummary = topEducation
    ? [topEducation.degree, topEducation.field_of_study, topEducation.institution]
        .filter(Boolean)
        .join(", ")
    : null;

  // Build skills summary — use variant order if available
  let skillsSummary = skills?.map((s) => s.name).join(", ") || null;
  if (tailoredSkills) skillsSummary = tailoredSkills;

  const fields = {
    first_name: profile.first_name,
    last_name: profile.last_name,
    full_name: `${profile.first_name} ${profile.last_name}`,
    email: profile.email,
    phone: profile.phone_personal || null,
    website_url: profile.website_url || null,
    location: profile.location || null,
    headline: tailoredHeadline || profile.headline || null,
    summary: tailoredSummary || null,
    current_title: currentJob?.position || null,
    current_company: currentJob?.company_name || null,
    years_experience: yearsExperience > 0 ? String(yearsExperience) : null,
    education_summary: educationSummary,
    skills_summary: skillsSummary,
    profile_url: `${process.env.NEXT_PUBLIC_APP_URL}/p/${profile.slug}`,
  };

  const pdfUrl = variantId
    ? `/api/autofill/resume.pdf?variant=${variantId}`
    : `/api/autofill/resume.pdf`;

  return NextResponse.json({
    fields,
    variant_id: variantId || null,
    resume_pdf_url: pdfUrl,
  });
}
