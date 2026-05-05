import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, AI_MODEL } from "@/lib/claude/client";
import { SECTION_SUGGEST_SYSTEM_PROMPT, buildSectionSuggestPrompt } from "@/lib/claude/prompts";
import { enforceAILimit, logUsage } from "@/lib/ai/usage";
import { z } from "zod";
import type { SectionSuggestions } from "@/lib/claude/schemas";
import { buildAutoApplyJobContext } from "@/lib/auto-apply/job-context";

const suggestSchema = z.object({
  section_title: z.string(),
  section_type: z.string(),
  content: z.string().min(1).max(5000),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const gate = await enforceAILimit(admin, user.id, "ai_suggest");
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.message, code: gate.code, upgradeTo: gate.upgradeTo },
      { status: 429 }
    );
  }

  let logStatus: "ok" | "error" = "ok";
  let tokensIn = 0;
  let tokensOut = 0;

  try {
    const body = await request.json();
    const parsed = suggestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { section_title, section_type, content } = parsed.data;

    const jobContext = await buildAutoApplyJobContext(supabase, user.id);

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
          jobContext: jobContext?.summary ?? null,
        }),
      }],
    });

    tokensIn = response.usage.input_tokens;
    tokensOut = response.usage.output_tokens;

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from AI");
    }

    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const suggestions: SectionSuggestions = JSON.parse(jsonText);

    return NextResponse.json({
      success: true,
      suggestions: suggestions.suggestions,
      targeted: jobContext
        ? { candidate_count: jobContext.candidateCount }
        : null,
    });
  } catch (error) {
    logStatus = "error";
    console.error("AI suggest error:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions." },
      { status: 500 }
    );
  } finally {
    await logUsage(admin, {
      profileId: user.id,
      feature: "ai_suggest",
      status: logStatus,
      tokensIn,
      tokensOut,
      model: AI_MODEL,
    });
  }
}
