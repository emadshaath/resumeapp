import type { ResumeData } from "@/lib/pdf/types";
import type { VariantData } from "@/types/database";

interface ParsedJobData {
  job_title: string;
  company_name: string;
  location?: string | null;
  remote_type?: string | null;
  required_skills?: string[];
  preferred_skills?: string[];
  required_experience_years?: number | null;
  required_education?: string | null;
  key_responsibilities?: string[];
  description_summary?: string | null;
  job_description?: string | null;
}

/**
 * Generates a tailored variant of the user's resume for a specific job.
 * The AI is instructed to ONLY use existing profile data — never fabricate.
 */
export async function generateTailoredVariant(
  resumeData: ResumeData,
  parsedJob: ParsedJobData
): Promise<{ variant_data: VariantData; match_score: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const profileSummary = buildProfileSummary(resumeData);

  const prompt = `You are a professional resume optimization AI. You help tailor resumes to specific job postings.

CRITICAL RULES:
- You may ONLY use data that exists in the user's profile below.
- NEVER invent, fabricate, or embellish any information.
- You can: reorder items, rewrite descriptions for clarity/emphasis, hide irrelevant items, adjust the headline.
- You cannot: add skills the user doesn't have, invent experience, fabricate education, or add certifications.

USER'S FULL PROFILE:
${profileSummary}

JOB POSTING:
Title: ${parsedJob.job_title}
Company: ${parsedJob.company_name}
${parsedJob.location ? `Location: ${parsedJob.location}` : ""}
${parsedJob.remote_type ? `Type: ${parsedJob.remote_type}` : ""}
${parsedJob.required_skills?.length ? `Required Skills: ${parsedJob.required_skills.join(", ")}` : ""}
${parsedJob.preferred_skills?.length ? `Preferred Skills: ${parsedJob.preferred_skills.join(", ")}` : ""}
${parsedJob.required_experience_years ? `Experience Required: ${parsedJob.required_experience_years} years` : ""}
${parsedJob.required_education ? `Education Required: ${parsedJob.required_education}` : ""}
${parsedJob.key_responsibilities?.length ? `Key Responsibilities:\n${parsedJob.key_responsibilities.map((r) => `- ${r}`).join("\n")}` : ""}
${parsedJob.description_summary ? `Summary: ${parsedJob.description_summary}` : ""}
${parsedJob.job_description ? `\nFull Job Description:\n${parsedJob.job_description.slice(0, 8000)}` : ""}

TASK: Generate an optimized resume variant for this specific job. Return ONLY valid JSON with this exact structure:

{
  "headline": "A tailored professional headline (using only real data from the profile)",
  "summary": "A 2-3 sentence professional summary tailored to this role (using only real experience/skills)",
  "skill_order": ["skill_id_1", "skill_id_2", "..."],
  "hidden_skills": ["skill_id_to_hide_1", "..."],
  "experience_rewrites": [
    {
      "id": "experience_id",
      "description": "rewritten description emphasizing relevant aspects (optional)",
      "highlights": ["rewritten bullet point 1", "..."],
      "emphasis": "high" | "normal" | "low"
    }
  ],
  "section_order": ["section_id_1", "section_id_2", "..."],
  "hidden_sections": ["section_id_to_hide"],
  "ai_reasoning": "Brief explanation of the optimization strategy",
  "top_priorities": ["priority 1", "priority 2", "priority 3"],
  "match_score": 0-100
}

For skill_order: Put the most relevant skills first. Include ALL skill IDs from the profile.
For hidden_skills: Skills completely irrelevant to this role.
For experience_rewrites: Only rewrite experiences where the description can be improved for this role. Use "high" emphasis for the most relevant roles, "low" for least relevant.
For section_order: Put the most relevant sections first.
For hidden_sections: Sections that add no value for this application.
For match_score: Honest assessment of how well this profile matches (0-100).`;

  const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!aiResponse.ok) {
    const err = await aiResponse.text();
    throw new Error(`AI tailoring failed: ${err}`);
  }

  const aiData = await aiResponse.json();
  const aiText = aiData.content?.[0]?.text || "";

  const jsonMatch = aiText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON");

  const parsed = JSON.parse(jsonMatch[0]);
  const matchScore = Math.min(100, Math.max(0, parsed.match_score || 50));

  const variantData: VariantData = {
    headline: parsed.headline || resumeData.profile.headline || "",
    summary: parsed.summary || "",
    skill_order: parsed.skill_order || resumeData.skills.map((s) => s.id),
    hidden_skills: parsed.hidden_skills || [],
    experience_rewrites: (parsed.experience_rewrites || []).map((er: Record<string, unknown>) => ({
      id: er.id as string,
      description: er.description as string | undefined,
      highlights: er.highlights as string[] | undefined,
      emphasis: (er.emphasis as string) || "normal",
    })),
    section_order: parsed.section_order || resumeData.sections.map((s) => s.id),
    hidden_sections: parsed.hidden_sections || [],
    ai_reasoning: parsed.ai_reasoning || "",
    top_priorities: parsed.top_priorities || [],
  };

  return { variant_data: variantData, match_score: matchScore };
}

/**
 * Applies variant data to resume data, returning a modified copy.
 * Used for generating tailored PDFs and autofill responses.
 */
export function applyVariantToResume(
  resumeData: ResumeData,
  variantData: VariantData
): ResumeData {
  const modified = { ...resumeData };

  // Apply tailored headline
  modified.profile = {
    ...modified.profile,
    headline: variantData.headline || modified.profile.headline,
  };

  // Filter hidden sections
  modified.sections = modified.sections
    .filter((s) => !variantData.hidden_sections.includes(s.id))
    .sort((a, b) => {
      const aIdx = variantData.section_order.indexOf(a.id);
      const bIdx = variantData.section_order.indexOf(b.id);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

  // Filter and reorder skills
  const visibleSkillIds = variantData.skill_order.filter(
    (id) => !variantData.hidden_skills.includes(id)
  );
  modified.skills = visibleSkillIds
    .map((id) => modified.skills.find((s) => s.id === id))
    .filter(Boolean) as typeof modified.skills;

  // Apply experience rewrites
  modified.experiences = modified.experiences.map((exp) => {
    const rewrite = variantData.experience_rewrites.find((r) => r.id === exp.id);
    if (!rewrite) return exp;
    return {
      ...exp,
      description: rewrite.description || exp.description,
      highlights: rewrite.highlights || exp.highlights,
    };
  });

  return modified;
}

function buildProfileSummary(data: ResumeData): string {
  const lines: string[] = [];

  lines.push(`Name: ${data.profile.first_name} ${data.profile.last_name}`);
  if (data.profile.headline) lines.push(`Headline: ${data.profile.headline}`);
  if (data.profile.location) lines.push(`Location: ${data.profile.location}`);
  lines.push("");

  if (data.sections.length > 0) {
    lines.push(`Sections (in order):`);
    for (const s of data.sections) {
      lines.push(`  - [ID: ${s.id}] ${s.title} (type: ${s.section_type})`);
    }
    lines.push("");
  }

  if (data.experiences.length > 0) {
    lines.push("Experiences:");
    for (const e of data.experiences) {
      lines.push(`  [ID: ${e.id}] ${e.position} at ${e.company_name} (${e.start_date} – ${e.is_current ? "Present" : e.end_date || "N/A"})`);
      if (e.description) lines.push(`    Description: ${e.description}`);
      if (e.highlights?.length) {
        for (const h of e.highlights) lines.push(`    • ${h}`);
      }
    }
    lines.push("");
  }

  if (data.educations.length > 0) {
    lines.push("Education:");
    for (const ed of data.educations) {
      lines.push(`  [ID: ${ed.id}] ${ed.degree || ""} ${ed.field_of_study || ""} at ${ed.institution}`);
    }
    lines.push("");
  }

  if (data.skills.length > 0) {
    lines.push("Skills:");
    for (const s of data.skills) {
      lines.push(`  [ID: ${s.id}] ${s.name}${s.proficiency ? ` (${s.proficiency})` : ""}${s.category ? ` [${s.category}]` : ""}`);
    }
    lines.push("");
  }

  if (data.certifications.length > 0) {
    lines.push("Certifications:");
    for (const c of data.certifications) {
      lines.push(`  [ID: ${c.id}] ${c.name}${c.issuing_org ? ` — ${c.issuing_org}` : ""}`);
    }
    lines.push("");
  }

  if (data.projects.length > 0) {
    lines.push("Projects:");
    for (const p of data.projects) {
      lines.push(`  [ID: ${p.id}] ${p.name}${p.description ? `: ${p.description}` : ""}`);
      if (p.technologies?.length) lines.push(`    Tech: ${p.technologies.join(", ")}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
