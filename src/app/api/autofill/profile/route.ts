import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/autofill/profile — Returns all profile fields formatted for form filling
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check for bearer token from extension
  const authHeader = req.headers.get("authorization");
  if (authHeader && !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

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
    .select("name")
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

  const fields = {
    first_name: profile.first_name,
    last_name: profile.last_name,
    full_name: `${profile.first_name} ${profile.last_name}`,
    email: profile.email,
    phone: profile.phone_personal || null,
    website_url: profile.website_url || null,
    location: profile.location || null,
    headline: profile.headline || null,
    current_title: currentJob?.position || null,
    current_company: currentJob?.company_name || null,
    years_experience: yearsExperience > 0 ? String(yearsExperience) : null,
    education_summary: educationSummary,
    skills_summary: skills?.map((s) => s.name).join(", ") || null,
    profile_url: `${process.env.NEXT_PUBLIC_APP_URL}/p/${profile.slug}`,
  };

  return NextResponse.json({
    fields,
    resume_pdf_url: `/api/autofill/resume.pdf`,
  });
}
