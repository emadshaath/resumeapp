import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeJobDescription } from "@/lib/jobs/sanitize-description";

// POST /api/jobs/parse-url — AI extracts job details from a URL
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

  // Validate URL
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    // Fetch the job page content
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; rezm.ai/1.0)",
        "Accept": "text/html",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ error: "Could not fetch the job page" }, { status: 422 });
    }

    const html = await response.text();
    // Limit content size for processing
    const truncated = html.slice(0, 50000);

    // Sanitize HTML — preserves formatting (headings, lists, bold) for display
    const descriptionHtml = sanitizeJobDescription(truncated);

    // Strip HTML tags for cleaner AI input
    const textContent = truncated
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15000);

    // Use Claude to parse the job posting
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `Extract job posting details from this page content. Return ONLY valid JSON with these fields (use null for missing info):

{
  "job_title": "string",
  "company_name": "string",
  "location": "string or null",
  "remote_type": "onsite" | "remote" | "hybrid" | null,
  "salary_min": number or null,
  "salary_max": number or null,
  "salary_currency": "USD",
  "employment_type": "full-time" | "part-time" | "contract" | "internship" | null,
  "required_skills": ["string"],
  "preferred_skills": ["string"],
  "required_experience_years": number or null,
  "required_education": "string or null",
  "key_responsibilities": ["string (max 5)"],
  "description_summary": "string (2-3 sentence summary)"
}

Page content:
${textContent}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      return NextResponse.json({ error: "AI parsing failed" }, { status: 500 });
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.content?.[0]?.text || "";

    // Extract JSON from response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse job details" }, { status: 422 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ parsed, description_html: descriptionHtml });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out fetching the URL" }, { status: 408 });
    }
    return NextResponse.json({ error: "Failed to parse job posting" }, { status: 500 });
  }
}
