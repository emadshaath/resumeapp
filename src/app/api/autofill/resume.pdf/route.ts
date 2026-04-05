import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/autofill/resume.pdf — Returns a simple text-based resume as PDF
// TODO: Replace with proper PDF generation (puppeteer or @react-pdf/renderer) in production
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Fetch all profile data
  const [experiences, educations, skills, certifications, projects] = await Promise.all([
    supabase.from("experiences").select("*").eq("profile_id", user.id).order("start_date", { ascending: false }),
    supabase.from("educations").select("*").eq("profile_id", user.id).order("end_date", { ascending: false }),
    supabase.from("skills").select("*").eq("profile_id", user.id).order("display_order", { ascending: true }),
    supabase.from("certifications").select("*").eq("profile_id", user.id).order("display_order", { ascending: true }),
    supabase.from("projects").select("*").eq("profile_id", user.id).order("display_order", { ascending: true }),
  ]);

  // Build plain-text resume (a proper PDF generator would be added in production)
  const lines: string[] = [];
  lines.push(`${profile.first_name} ${profile.last_name}`);
  if (profile.headline) lines.push(profile.headline);
  const contactParts: string[] = [profile.email];
  if (profile.phone_personal) contactParts.push(profile.phone_personal);
  if (profile.location) contactParts.push(profile.location);
  if (profile.website_url) contactParts.push(profile.website_url);
  lines.push(contactParts.join(" | "));
  lines.push("");

  if (experiences.data && experiences.data.length > 0) {
    lines.push("EXPERIENCE");
    lines.push("─".repeat(60));
    for (const exp of experiences.data) {
      const endDate = exp.is_current ? "Present" : (exp.end_date || "");
      lines.push(`${exp.position} — ${exp.company_name}`);
      lines.push(`${exp.start_date} – ${endDate}${exp.location ? ` | ${exp.location}` : ""}`);
      if (exp.description) lines.push(exp.description);
      if (exp.highlights && exp.highlights.length > 0) {
        for (const h of exp.highlights) lines.push(`  • ${h}`);
      }
      lines.push("");
    }
  }

  if (educations.data && educations.data.length > 0) {
    lines.push("EDUCATION");
    lines.push("─".repeat(60));
    for (const edu of educations.data) {
      const parts = [edu.degree, edu.field_of_study].filter(Boolean).join(" in ");
      lines.push(`${parts} — ${edu.institution}`);
      if (edu.end_date) lines.push(`Graduated: ${edu.end_date}`);
      if (edu.gpa) lines.push(`GPA: ${edu.gpa}`);
      lines.push("");
    }
  }

  if (skills.data && skills.data.length > 0) {
    lines.push("SKILLS");
    lines.push("─".repeat(60));
    lines.push(skills.data.map((s) => s.name).join(", "));
    lines.push("");
  }

  if (certifications.data && certifications.data.length > 0) {
    lines.push("CERTIFICATIONS");
    lines.push("─".repeat(60));
    for (const cert of certifications.data) {
      lines.push(`${cert.name}${cert.issuing_org ? ` — ${cert.issuing_org}` : ""}`);
    }
    lines.push("");
  }

  if (projects.data && projects.data.length > 0) {
    lines.push("PROJECTS");
    lines.push("─".repeat(60));
    for (const proj of projects.data) {
      lines.push(`${proj.name}${proj.url ? ` (${proj.url})` : ""}`);
      if (proj.description) lines.push(proj.description);
      if (proj.technologies && proj.technologies.length > 0) {
        lines.push(`Technologies: ${proj.technologies.join(", ")}`);
      }
      lines.push("");
    }
  }

  const textContent = lines.join("\n");

  // Return as plain text for now — a proper PDF library would generate actual PDF
  return new NextResponse(textContent, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${profile.first_name}_${profile.last_name}_Resume.txt"`,
    },
  });
}
