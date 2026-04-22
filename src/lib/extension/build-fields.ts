import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function buildVariantFields(
  supabase: SupabaseClient,
  userId: string,
  profile: Record<string, unknown>,
  variantData: Record<string, unknown> | null
) {
  const { data: experiences } = await supabase
    .from("experiences")
    .select("*")
    .eq("profile_id", userId)
    .order("start_date", { ascending: false })
    .limit(5);

  const currentJob =
    experiences?.find((e: Record<string, unknown>) => e.is_current) ||
    experiences?.[0];

  const { data: educations } = await supabase
    .from("educations")
    .select("*")
    .eq("profile_id", userId)
    .order("end_date", { ascending: false })
    .limit(3);

  const topEducation = educations?.[0];

  const { data: skills } = await supabase
    .from("skills")
    .select("id, name")
    .eq("profile_id", userId)
    .order("display_order", { ascending: true });

  let yearsExperience = 0;
  if (experiences && experiences.length > 0) {
    const earliest = experiences[experiences.length - 1];
    const start = new Date(earliest.start_date as string);
    yearsExperience = Math.round(
      (Date.now() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
  }

  const educationSummary = topEducation
    ? [topEducation.degree, topEducation.field_of_study, topEducation.institution]
        .filter(Boolean)
        .join(", ")
    : null;

  const skillsSummary =
    skills?.map((s: Record<string, unknown>) => s.name).join(", ") || null;

  const locationStr = (profile.location as string) || "";
  const locationParts = locationStr.split(",").map((s: string) => s.trim());
  let city: string | null = null;
  let state: string | null = null;
  let zip_code: string | null = null;

  if (locationParts.length >= 1) city = locationParts[0] || null;
  if (locationParts.length >= 2) {
    const stateZip = locationParts[1].match(
      /^([A-Za-z\s]+?)(?:\s+(\d{5}(?:-\d{4})?))?$/
    );
    if (stateZip) {
      state = stateZip[1]?.trim() || null;
      zip_code = stateZip[2] || null;
    } else {
      state = locationParts[1] || null;
    }
  }

  return {
    first_name: profile.first_name,
    last_name: profile.last_name,
    full_name: `${profile.first_name} ${profile.last_name}`,
    email: profile.email,
    phone: (profile.phone_personal as string) || null,
    website_url: (profile.website_url as string) || null,
    location: profile.location || null,
    city,
    state,
    zip_code,
    headline:
      (variantData?.headline as string) || (profile.headline as string) || null,
    summary: (variantData?.summary as string) || null,
    current_title: (currentJob?.position as string) || null,
    current_company: (currentJob?.company_name as string) || null,
    years_experience: yearsExperience > 0 ? String(yearsExperience) : null,
    education_summary: educationSummary,
    skills_summary: skillsSummary,
    linkedin_url: (profile.linkedin_url as string) || null,
    profile_url: `${process.env.NEXT_PUBLIC_APP_URL}/p/${profile.slug}`,
    work_authorization: (profile.work_authorization as string) || null,
    sponsorship_required: (profile.sponsorship_required as string) || null,
    gender_identity: (profile.gender_identity as string) || null,
    pronouns: (profile.pronouns as string) || null,
    race_ethnicity: (profile.race_ethnicity as string) || null,
    veteran_status: (profile.veteran_status as string) || null,
    disability_status: (profile.disability_status as string) || null,
    lgbtq_identity: (profile.lgbtq_identity as string) || null,
    salary_expectation: (profile.salary_expectation as string) || null,
    notice_period: (profile.notice_period as string) || null,
    preferred_work_setting: (profile.preferred_work_setting as string) || null,
    how_heard_default: (profile.how_heard_default as string) || null,
  };
}
