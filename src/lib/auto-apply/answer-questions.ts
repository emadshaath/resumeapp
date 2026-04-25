import {
  AUTO_APPLY_ANSWER_SYSTEM_PROMPT,
  buildAutoApplyAnswerPrompt,
} from "@/lib/claude/prompts";
import type { ResumeData } from "@/lib/pdf/types";
import type { AutoApplyAnswer } from "@/types/database";

export async function draftAnswers(
  resumeData: ResumeData,
  jobTitle: string,
  companyName: string,
  jobDescription: string,
  questions: string[]
): Promise<AutoApplyAnswer[]> {
  if (questions.length === 0) return [];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const resumeSummary = buildResumeSummary(resumeData);
  const userPrompt = buildAutoApplyAnswerPrompt(
    resumeSummary,
    jobTitle,
    companyName,
    jobDescription.slice(0, 6000),
    questions
  );

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: AUTO_APPLY_ANSWER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Claude answer drafting failed: HTTP ${res.status}`);
  }

  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { answers?: AutoApplyAnswer[] };
    return Array.isArray(parsed.answers) ? parsed.answers : [];
  } catch {
    return [];
  }
}

function buildResumeSummary(resume: ResumeData): string {
  const parts: string[] = [];
  const profile = resume.profile;
  if (profile) {
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
    if (name) parts.push(`Name: ${name}`);
    if (profile.headline) parts.push(`Headline: ${profile.headline}`);
    if (profile.location) parts.push(`Location: ${profile.location}`);
  }

  const experiences = resume.experiences ?? [];
  if (experiences.length > 0) {
    parts.push("Experience:");
    for (const exp of experiences.slice(0, 5)) {
      const line = [exp.position, "at", exp.company_name].filter(Boolean).join(" ");
      const dates = [exp.start_date, exp.end_date || "present"].filter(Boolean).join(" - ");
      parts.push(`- ${line} (${dates})`);
      if (exp.description) parts.push(`  ${String(exp.description).slice(0, 400)}`);
    }
  }

  const educations = resume.educations ?? [];
  if (educations.length > 0) {
    parts.push("Education:");
    for (const ed of educations.slice(0, 3)) {
      parts.push(
        `- ${[ed.degree, ed.field_of_study, "at", ed.institution].filter(Boolean).join(" ")}`
      );
    }
  }

  const skills = resume.skills ?? [];
  if (skills.length > 0) {
    parts.push(`Skills: ${skills.map((s) => s.name).filter(Boolean).join(", ")}`);
  }

  return parts.join("\n");
}
