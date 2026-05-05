import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceAILimit, logUsage } from "@/lib/ai/usage";
import type { SupabaseClient } from "@supabase/supabase-js";

const RESUME_MODEL = "claude-sonnet-4-20250514";

const RESUME_PARSE_PROMPT = `You are an expert resume parser. Extract all structured information from the following resume text.

Return ONLY valid JSON matching this exact structure. Use null for missing fields. Do not invent data that is not present.

{
  "profile": {
    "first_name": "string",
    "last_name": "string",
    "headline": "string or null",
    "location": "string or null",
    "website_url": "string or null",
    "phone_personal": "string or null"
  },
  "summary": "string or null",
  "experiences": [
    {
      "company_name": "string",
      "position": "string",
      "location": "string or null",
      "start_date": "YYYY-MM-DD or null",
      "end_date": "YYYY-MM-DD or null",
      "is_current": false,
      "description": "string or null",
      "highlights": ["string"]
    }
  ],
  "educations": [
    {
      "institution": "string",
      "degree": "string or null",
      "field_of_study": "string or null",
      "location": "string or null",
      "start_date": "YYYY-MM-DD or null",
      "end_date": "YYYY-MM-DD or null",
      "is_current": false,
      "gpa": "string or null",
      "description": "string or null"
    }
  ],
  "skills": [
    {
      "name": "string",
      "category": "string or null",
      "proficiency": "beginner" | "intermediate" | "advanced" | "expert" | null
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuing_org": "string or null",
      "issue_date": "YYYY-MM-DD or null",
      "expiry_date": "YYYY-MM-DD or null",
      "credential_url": "string or null"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string or null",
      "url": "string or null",
      "start_date": "YYYY-MM-DD or null",
      "end_date": "YYYY-MM-DD or null",
      "highlights": ["string"],
      "technologies": ["string"]
    }
  ]
}

Important parsing rules:
- For dates, use the first day of the month if only month/year is given (e.g. "Jan 2020" -> "2020-01-01")
- If an experience says "Present" or "Current" for end date, set is_current to true and end_date to null
- Group skills by category when possible (e.g. "Programming Languages", "Frameworks", "Tools")
- Extract bullet points as highlights arrays
- Keep descriptions concise but complete

Resume text:
`;

// POST /api/resume/import — AI extracts resume data from uploaded file text
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const gate = await enforceAILimit(admin, user.id, "resume_import");
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.message, code: gate.code, upgradeTo: gate.upgradeTo },
      { status: 429 }
    );
  }

  let resumeText: string;

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file)
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 },
      );

    // Validate file type
    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".txt") && !file.name.endsWith(".pdf") && !file.name.endsWith(".docx")) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF, DOCX, or TXT file." },
        { status: 400 },
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 },
      );
    }

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      // For PDFs, send as base64 to Claude with document support
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      return parsePdfWithClaude(base64, admin, user.id);
    }

    // For text files and docx, extract text content
    const text = await file.text();
    resumeText = text.slice(0, 30000);
  } else {
    // JSON body with text content
    const body = await req.json();
    if (!body.text) {
      return NextResponse.json(
        { error: "No resume text provided" },
        { status: 400 },
      );
    }
    resumeText = (body.text as string).slice(0, 30000);
  }

  return parseTextWithClaude(resumeText, admin, user.id);
}

async function parseTextWithClaude(resumeText: string, admin: SupabaseClient, profileId: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI service not configured" },
      { status: 500 },
    );
  }

  let logStatus: "ok" | "error" = "ok";
  let tokensIn = 0;
  let tokensOut = 0;

  try {
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: RESUME_MODEL,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: RESUME_PARSE_PROMPT + resumeText,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      logStatus = "error";
      return NextResponse.json(
        { error: "AI parsing failed" },
        { status: 500 },
      );
    }

    const aiData = await aiResponse.json();
    tokensIn = aiData.usage?.input_tokens ?? 0;
    tokensOut = aiData.usage?.output_tokens ?? 0;
    const aiText = aiData.content?.[0]?.text || "";
    return extractAndReturnJson(aiText);
  } catch {
    logStatus = "error";
    return NextResponse.json(
      { error: "Failed to parse resume" },
      { status: 500 },
    );
  } finally {
    await logUsage(admin, {
      profileId,
      feature: "resume_import",
      status: logStatus,
      tokensIn,
      tokensOut,
      model: RESUME_MODEL,
    });
  }
}

async function parsePdfWithClaude(base64: string, admin: SupabaseClient, profileId: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI service not configured" },
      { status: 500 },
    );
  }

  let logStatus: "ok" | "error" = "ok";
  let tokensIn = 0;
  let tokensOut = 0;

  try {
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: RESUME_MODEL,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64,
                },
              },
              {
                type: "text",
                text: RESUME_PARSE_PROMPT,
              },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      logStatus = "error";
      return NextResponse.json(
        { error: "AI parsing failed" },
        { status: 500 },
      );
    }

    const aiData = await aiResponse.json();
    tokensIn = aiData.usage?.input_tokens ?? 0;
    tokensOut = aiData.usage?.output_tokens ?? 0;
    const aiText = aiData.content?.[0]?.text || "";
    return extractAndReturnJson(aiText);
  } catch {
    logStatus = "error";
    return NextResponse.json(
      { error: "Failed to parse resume PDF" },
      { status: 500 },
    );
  } finally {
    await logUsage(admin, {
      profileId,
      feature: "resume_import",
      status: logStatus,
      tokensIn,
      tokensOut,
      model: RESUME_MODEL,
    });
  }
}

function extractAndReturnJson(aiText: string) {
  const jsonMatch = aiText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json(
      { error: "Could not extract structured data from resume" },
      { status: 422 },
    );
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ parsed });
  } catch {
    return NextResponse.json(
      { error: "Could not parse extracted data" },
      { status: 422 },
    );
  }
}
