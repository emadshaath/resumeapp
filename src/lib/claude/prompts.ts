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
- Action verbs to start bullet points`;

export const SECTION_SUGGEST_SYSTEM_PROMPT = `You are an expert resume writer. Given a resume section, provide 2-3 specific, actionable suggestions to improve it.

Be concise and practical. Each suggestion should be something the user can implement immediately.

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

export function buildSectionSuggestPrompt(section: {
  title: string;
  type: string;
  content: string;
}): string {
  return `Please suggest improvements for this "${section.title}" section (type: ${section.type}):\n\n${section.content}\n\nReturn ONLY the JSON object with suggestions.`;
}
