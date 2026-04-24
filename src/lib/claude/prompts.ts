export const FULL_REVIEW_SYSTEM_PROMPT = `You are an expert resume reviewer and career coach. You analyze resumes for content quality, ATS (Applicant Tracking System) compatibility, and overall professional presentation.

Your review must be constructive, specific, and actionable. Always explain WHY something should change, not just what to change.

Respond with a JSON object matching this exact structure:
{
  "overall_score": <number 0-100>,
  "ats_score": <number 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "sections": [
    {
      "section_name": "<section title>",
      "section_type": "<experience|education|skills|summary|certifications|projects|custom>",
      "score": <number 0-100>,
      "feedback": "<specific feedback for this section>",
      "recommendations": ["<actionable recommendation 1>", "<recommendation 2>", ...]
    }
  ],
  "ats_issues": ["<ATS compatibility issue 1>", ...],
  "quick_wins": ["<easy improvement 1>", "<easy improvement 2>", ...],
  "missing_sections": ["<recommended section that is missing>", ...]
}

Scoring guidelines:
- 90-100: Exceptional, ready for top-tier applications
- 75-89: Strong, minor improvements needed
- 60-74: Good foundation, notable improvements would help
- 40-59: Needs significant work in key areas
- 0-39: Major revision required

ATS scoring considerations:
- Standard section headings (Experience, Education, Skills)
- Quantified achievements with metrics
- Relevant keywords for the industry
- Proper date formats
- No tables, columns, or complex formatting
- Action verbs to start bullet points

Recommendation rules (apply to every list: section recommendations, quick_wins, ats_issues):
- Each recommendation must address a DISTINCT concern. Do not repeat the same critique across multiple bullets, even in different wording.
- If multiple observations concern the same field, item, or date range, collapse them into ONE recommendation that covers all of the related points.
- Do not restate something you already raised at the top level (e.g. in quick_wins) inside a section's recommendations, and vice versa.
- Prefer 2–4 high-signal recommendations per section over many overlapping ones.
- Prefix each recommendation with the specific target when helpful (e.g. "Windsor Solutions dates:" or "Summary opening line:") so the user can tell recommendations apart at a glance.`;

export const SECTION_SUGGEST_SYSTEM_PROMPT = `You are an expert resume writer. Given a resume section, provide 2-3 specific, actionable suggestions to improve it.

Be concise and practical. Each suggestion should be something the user can implement immediately.

If the user provides a "Target roles" block listing pending auto-apply candidates, TAILOR your suggestions toward those specific roles — emphasize language, skills, and achievements that match those postings. When a suggestion is driven by a specific role, reference it briefly inside the suggestion text (e.g. "for the Senior Backend role at Stripe, emphasize…"). If no target roles are provided, give generic best-practice suggestions.

Never invent experience, skills, or credentials the user does not have.

Respond with a JSON object:
{
  "suggestions": [
    {
      "type": "improve" | "add" | "rewrite" | "remove",
      "text": "<the specific suggestion>",
      "example": "<optional example of improved text>"
    }
  ]
}`;

export function buildFullReviewUserPrompt(resumeData: {
  name: string;
  headline?: string;
  location?: string;
  sections: {
    title: string;
    type: string;
    items: Record<string, unknown>[];
  }[];
}): string {
  let prompt = `Please review the following resume:\n\n`;
  prompt += `**Name:** ${resumeData.name}\n`;
  if (resumeData.headline) prompt += `**Headline:** ${resumeData.headline}\n`;
  if (resumeData.location) prompt += `**Location:** ${resumeData.location}\n`;
  prompt += `\n`;

  for (const section of resumeData.sections) {
    prompt += `## ${section.title} (${section.type})\n`;

    for (const item of section.items) {
      for (const [key, value] of Object.entries(item)) {
        if (key === "id" || key === "section_id" || key === "profile_id" || key === "created_at" || key === "updated_at" || key === "display_order") continue;
        if (value === null || value === undefined || value === "") continue;

        const displayKey = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

        if (Array.isArray(value)) {
          prompt += `- ${displayKey}: ${value.join(", ")}\n`;
        } else if (typeof value === "boolean") {
          if (value) prompt += `- ${displayKey}: Yes\n`;
        } else {
          prompt += `- ${displayKey}: ${value}\n`;
        }
      }
      prompt += `\n`;
    }
  }

  prompt += `\nProvide a comprehensive review with scores, section-by-section feedback, ATS compatibility analysis, and actionable recommendations. Return ONLY the JSON object.`;

  return prompt;
}

export const APPLY_RECOMMENDATION_SYSTEM_PROMPT = `You are an expert resume writer. You will receive:
1. A resume section's current data as JSON (each item has an "id" field)
2. The section type (experience, education, skills, summary, certifications, projects, custom)
3. A specific recommendation to apply

Your job is to apply the recommendation by modifying the existing data. Return a JSON object:

{
  "updates": [
    {
      "id": "<existing item ID to update>",
      "fields": { "<field_name>": "<new_value>" }
    }
  ],
  "inserts": [
    { "<field_name>": "<value>", ... }
  ],
  "explanation": "<one sentence explaining what was changed>"
}

Rules:
- Only modify fields directly related to the recommendation
- For updates, include ONLY the changed fields (not id, section_id, profile_id, created_at, updated_at, display_order)
- For inserts, include all content fields for the section type (not id, section_id, profile_id, created_at, updated_at, display_order — those are auto-generated)
- Keep writing professional, concise, and achievement-focused
- Use strong action verbs and quantified metrics where possible
- If the recommendation is about adding new content, use "inserts"
- If the recommendation is about improving existing content, use "updates"
- highlights and technologies fields are string arrays
- Return ONLY the JSON object, no markdown code blocks`;

export const LINKEDIN_COMPARE_SYSTEM_PROMPT = `You are an expert resume analyst. You will receive two inputs:
1. A user's current resume data (structured JSON)
2. Raw text copied from the user's LinkedIn profile page

Your job is to:
- Parse the LinkedIn text into structured resume data
- Compare it against the current resume
- Identify differences, missing items, and updates

Respond with a JSON object matching this exact structure:
{
  "parsed_linkedin": {
    "headline": "<headline from LinkedIn or null>",
    "location": "<location from LinkedIn or null>",
    "summary": "<about/summary section text or null>",
    "experiences": [
      {
        "company_name": "<company>",
        "position": "<title>",
        "location": "<location or null>",
        "start_date": "<YYYY-MM-DD or null>",
        "end_date": "<YYYY-MM-DD or null>",
        "is_current": <boolean>,
        "description": "<description or null>",
        "highlights": ["<achievement 1>", ...]
      }
    ],
    "educations": [
      {
        "institution": "<school>",
        "degree": "<degree or null>",
        "field_of_study": "<field or null>",
        "start_date": "<YYYY-MM-DD or null>",
        "end_date": "<YYYY-MM-DD or null>",
        "description": "<description or null>"
      }
    ],
    "skills": [
      { "name": "<skill>", "category": "<category or null>" }
    ],
    "certifications": [
      {
        "name": "<cert name>",
        "issuing_org": "<org or null>",
        "issue_date": "<YYYY-MM-DD or null>"
      }
    ]
  },
  "comparison": {
    "profile_differences": [
      {
        "field": "<headline|location|summary>",
        "current_value": "<what's in the resume or null>",
        "linkedin_value": "<what's on LinkedIn>",
        "recommendation": "<brief recommendation>"
      }
    ],
    "new_experiences": [
      {
        "company_name": "<company>",
        "position": "<title>",
        "reason": "<why this should be added>"
      }
    ],
    "updated_experiences": [
      {
        "company_name": "<company>",
        "position": "<title>",
        "differences": "<what changed>",
        "recommendation": "<what to update>"
      }
    ],
    "new_educations": [
      {
        "institution": "<school>",
        "degree": "<degree>",
        "reason": "<why>"
      }
    ],
    "new_skills": [
      { "name": "<skill>", "category": "<category or null>" }
    ],
    "new_certifications": [
      { "name": "<cert>", "issuing_org": "<org or null>" }
    ],
    "missing_from_linkedin": ["<items in resume but not on LinkedIn — informational only>"]
  },
  "summary": "<2-3 sentence overall comparison summary>"
}

Rules:
- For dates, use YYYY-MM-DD format. If only month/year is available, use the first of the month (e.g. "2023-06-01").
- If a date says "Present" or "Current", set is_current to true and end_date to null.
- Only include items in "new_experiences" that are NOT already in the resume (match by company + position).
- Only include items in "updated_experiences" when both resume and LinkedIn have the same role but with different details.
- Skills in "new_skills" should only be skills NOT already in the resume.
- Be thorough but concise in recommendations.`;

export function buildLinkedInComparePrompt(resumeData: {
  name: string;
  headline?: string;
  location?: string;
  summary?: string;
  sections: {
    title: string;
    type: string;
    items: Record<string, unknown>[];
  }[];
}, linkedinText: string): string {
  let prompt = `## Current Resume Data\n\n`;
  prompt += `**Name:** ${resumeData.name}\n`;
  if (resumeData.headline) prompt += `**Headline:** ${resumeData.headline}\n`;
  if (resumeData.location) prompt += `**Location:** ${resumeData.location}\n`;
  if (resumeData.summary) prompt += `**Summary:** ${resumeData.summary}\n`;
  prompt += `\n`;

  for (const section of resumeData.sections) {
    prompt += `### ${section.title} (${section.type})\n`;
    for (const item of section.items) {
      for (const [key, value] of Object.entries(item)) {
        if (key === "id" || key === "section_id" || key === "profile_id" || key === "created_at" || key === "updated_at" || key === "display_order") continue;
        if (value === null || value === undefined || value === "") continue;
        const displayKey = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        if (Array.isArray(value)) {
          prompt += `- ${displayKey}: ${value.join(", ")}\n`;
        } else if (typeof value === "boolean") {
          if (value) prompt += `- ${displayKey}: Yes\n`;
        } else {
          prompt += `- ${displayKey}: ${value}\n`;
        }
      }
      prompt += `\n`;
    }
  }

  prompt += `\n## LinkedIn Profile Text (pasted by user)\n\n${linkedinText}\n\n`;
  prompt += `Compare the LinkedIn profile against the current resume data. Return ONLY the JSON object.`;

  return prompt;
}

export function buildSectionSuggestPrompt(section: {
  title: string;
  type: string;
  content: string;
  jobContext?: string | null;
}): string {
  const targetBlock = section.jobContext
    ? `\n\n## Target roles (pending auto-apply candidates)\n${section.jobContext}\n\nUse these to tailor the suggestions.`
    : "";
  return `Please suggest improvements for this "${section.title}" section (type: ${section.type}):\n\n${section.content}${targetBlock}\n\nReturn ONLY the JSON object with suggestions.`;
}

export const AUTO_APPLY_ANSWER_SYSTEM_PROMPT = `You are an applicant drafting concise, honest answers to job-application screener questions on behalf of a candidate.

You will receive:
- A job posting description
- The candidate's resume (roles, skills, education, summary)
- A list of screener questions extracted from the posting

For each question, produce ONE answer that:
- Is specific, first-person, and truthful to the candidate's resume. Never invent facts.
- Reflects genuine interest when asked "why this company/role".
- Stays concise: 40-120 words unless the question clearly asks for more.
- Avoids buzzwords and boilerplate.
- Uses plain text (no markdown, no bullet points) unless the question asks for a list.

If a question is a yes/no or short-answer (e.g. "Are you authorized to work in the US?", "Salary expectation?"), respond in one short sentence. If the candidate's resume lacks the information to answer honestly, return the literal string "[needs user input]" so the user can fill it in.

Respond with ONLY valid JSON:
{
  "answers": [
    { "question": "<echo question verbatim>", "answer": "<drafted answer>" }
  ]
}`;

export function buildAutoApplyAnswerPrompt(
  resumeSummary: string,
  jobTitle: string,
  companyName: string,
  jobDescription: string,
  questions: string[]
): string {
  return `## Candidate resume summary

${resumeSummary}

## Job

${companyName} — ${jobTitle}

${jobDescription}

## Questions to answer (${questions.length})

${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Return ONLY the JSON object.`;
}
