import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, AI_MODEL } from "@/lib/claude/client";
import { SECTION_SUGGEST_SYSTEM_PROMPT, buildSectionSuggestPrompt } from "@/lib/claude/prompts";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import type { SectionSuggestions } from "@/lib/claude/schemas";

const suggestSchema = z.object({
  section_title: z.string(),
  section_type: z.string(),
  content: z.string().min(1).max(5000),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 10 suggestions per 10 minutes
    const { success: rateLimitOk } = rateLimit(`ai-suggest:${user.id}`, 10, 10 * 60 * 1000);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = suggestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { section_title, section_type, content } = parsed.data;

    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: SECTION_SUGGEST_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: buildSectionSuggestPrompt({
          title: section_title,
          type: section_type,
          content,
        }),
      }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from AI");
    }

    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const suggestions: SectionSuggestions = JSON.parse(jsonText);

    return NextResponse.json({ success: true, suggestions: suggestions.suggestions });
  } catch (error) {
    console.error("AI suggest error:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions." },
      { status: 500 }
    );
  }
}
