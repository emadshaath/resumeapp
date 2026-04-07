import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchResumeData } from "@/lib/pdf/fetch-resume-data";
import { hasFeature, getRequiredTier } from "@/lib/stripe/feature-gate";
import type { Tier } from "@/types/database";

interface FormQuestion {
  id: string; // unique identifier for the field (index or element id)
  question: string; // the label/question text
  type: "textarea" | "text" | "select" | "radio" | "checkbox";
  options?: string[]; // available options for select/radio
  required?: boolean;
}

/**
 * POST /api/extension/ai-answers
 *
 * Premium feature: AI generates personalized answers to job application form questions.
 * Uses the user's actual profile/experience data — never fabricates.
 *
 * Body: { questions: FormQuestion[], job_context: { job_title, company_name, description? } }
 * Returns: { answers: { id: string, answer: string }[] }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  const tier = (profile?.tier || "free") as Tier;
  if (!hasFeature(tier, "ai_form_answers")) {
    const requiredTier = getRequiredTier("ai_form_answers");
    return NextResponse.json(
      {
        error: `AI Form Answers requires the ${requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} plan. Your current plan: ${tier}.`,
        upgrade_required: true,
      },
      { status: 403 }
    );
  }

  const { questions, job_context } = await req.json();

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json(
      { error: "questions array is required" },
      { status: 400 }
    );
  }

  // Cap at 25 questions per request
  const cappedQuestions = questions.slice(0, 25) as FormQuestion[];

  // Fetch full resume data for AI context
  const resumeData = await fetchResumeData(supabase, user.id);
  if (!resumeData)
    return NextResponse.json(
      { error: "Profile data not found" },
      { status: 404 }
    );

  const profileContext = buildProfileContext(resumeData);

  const jobInfo = job_context
    ? `\nJOB CONTEXT:\nTitle: ${job_context.job_title || "Unknown"}\nCompany: ${job_context.company_name || "Unknown"}${job_context.description ? `\nDescription: ${job_context.description.substring(0, 2000)}` : ""}`
    : "";

  const questionsBlock = cappedQuestions
    .map((q, i) => {
      let line = `[Q${i + 1} | id="${q.id}" | type=${q.type}${q.required ? " | REQUIRED" : ""}]\n${q.question}`;
      if (q.options && q.options.length > 0) {
        line += `\nOptions: ${q.options.join(" | ")}`;
      }
      return line;
    })
    .join("\n\n");

  const prompt = `You are an AI assistant helping a job applicant fill out an application form. You must generate personalized, honest answers based ONLY on the applicant's real profile data below.

CRITICAL RULES:
- ONLY use information from the applicant's profile. NEVER fabricate experience, skills, or qualifications.
- For questions about experience/skills the applicant doesn't have, be honest: "I don't have direct experience with X, but I have related experience in Y."
- For "why interested" questions, craft a genuine answer connecting the applicant's background to the role.
- For yes/no questions, answer based on the profile data.
- For select/radio questions, pick the most accurate option from the available choices.
- For salary questions, respond with "Prefer not to disclose" or "Open to discussion" unless the profile has this info.
- For demographic/diversity questions (gender, race, disability, veteran status, LGBTQ+), ALWAYS answer "I prefer not to say" or "Prefer not to answer" or select the equivalent option — never assume or guess.
- For reference questions, answer affirmatively: "Yes, I can provide references."
- For employment gap questions, if no gaps visible in experience, answer "N/A".
- For start date questions, say "2-3 weeks notice" unless profile indicates otherwise.
- For "how did you hear" questions, say "Online job board" as a safe default.
- Keep answers professional, concise, and specific. Avoid generic filler.
- For longer questions, aim for 2-4 sentences. For short ones, keep it brief.

APPLICANT'S PROFILE:
${profileContext}
${jobInfo}

FORM QUESTIONS:
${questionsBlock}

Respond with ONLY valid JSON — an array of objects, one per question:
[
  { "id": "the question id", "answer": "your generated answer" },
  ...
]

For select/radio questions with options, the "answer" must be one of the provided options (exact text match).
For checkbox questions, answer "true" or "false".
For text/textarea questions, provide the written answer.`;

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("AI service not configured");

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
      throw new Error(`AI service error: ${err}`);
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.content?.[0]?.text || "";

    const jsonMatch = aiText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("AI did not return valid answers");

    const answers = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ answers });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "AI answer generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildProfileContext(resumeData: Awaited<ReturnType<typeof fetchResumeData>>): string {
  if (!resumeData) return "No profile data available.";

  const lines: string[] = [];
  const p = resumeData.profile;

  lines.push(`Name: ${p.first_name} ${p.last_name}`);
  if (p.headline) lines.push(`Headline: ${p.headline}`);
  if (p.location) lines.push(`Location: ${p.location}`);
  if ((p as unknown as Record<string, unknown>).website_url) lines.push(`Website: ${(p as unknown as Record<string, unknown>).website_url}`);
  lines.push("");

  if (resumeData.experiences.length > 0) {
    lines.push("WORK EXPERIENCE:");
    for (const e of resumeData.experiences) {
      const period = `${e.start_date} – ${e.is_current ? "Present" : e.end_date || "N/A"}`;
      lines.push(`  ${e.position} at ${e.company_name} (${period})`);
      if (e.description) lines.push(`    ${e.description}`);
      if (e.highlights?.length) {
        for (const h of e.highlights) lines.push(`    • ${h}`);
      }
    }
    lines.push("");
  }

  if (resumeData.educations.length > 0) {
    lines.push("EDUCATION:");
    for (const ed of resumeData.educations) {
      lines.push(
        `  ${ed.degree || ""} ${ed.field_of_study || ""} at ${ed.institution} (${ed.end_date || "N/A"})`
      );
    }
    lines.push("");
  }

  if (resumeData.skills.length > 0) {
    lines.push(
      `SKILLS: ${resumeData.skills.map((s) => s.name).join(", ")}`
    );
    lines.push("");
  }

  if (resumeData.certifications.length > 0) {
    lines.push("CERTIFICATIONS:");
    for (const c of resumeData.certifications) {
      lines.push(`  ${c.name}${c.issuing_org ? ` — ${c.issuing_org}` : ""}`);
    }
    lines.push("");
  }

  if (resumeData.projects.length > 0) {
    lines.push("PROJECTS:");
    for (const proj of resumeData.projects) {
      lines.push(`  ${proj.name}${proj.description ? `: ${proj.description}` : ""}`);
      if (proj.technologies?.length)
        lines.push(`    Tech: ${proj.technologies.join(", ")}`);
    }
    lines.push("");
  }

  // Calculate total years of experience
  if (resumeData.experiences.length > 0) {
    const earliest = resumeData.experiences[resumeData.experiences.length - 1];
    const start = new Date(earliest.start_date);
    const years = Math.round(
      (Date.now() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    lines.push(`TOTAL YEARS OF EXPERIENCE: ~${years} years`);
  }

  return lines.join("\n");
}
