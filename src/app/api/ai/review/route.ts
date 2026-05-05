import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, AI_MODEL, AI_MAX_TOKENS } from "@/lib/claude/client";
import { FULL_REVIEW_SYSTEM_PROMPT, buildFullReviewUserPrompt } from "@/lib/claude/prompts";
import { enforceAILimit, logUsage } from "@/lib/ai/usage";
import type { FullReviewResult } from "@/lib/claude/schemas";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const gate = await enforceAILimit(admin, user.id, "ai_review");
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
    const { data: profile } = await admin
      .from("profiles")
      .select("*, resume_sections(*)")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Fetch all resume content
    const sections = profile.resume_sections || [];
    const sectionIds = sections.map((s: { id: string }) => s.id);

    if (sectionIds.length === 0) {
      return NextResponse.json(
        { error: "Add at least one resume section before requesting a review." },
        { status: 400 }
      );
    }

    const [experiences, educations, skills, certifications, projects, customSections] =
      await Promise.all([
        admin.from("experiences").select("*").in("section_id", sectionIds).order("display_order"),
        admin.from("educations").select("*").in("section_id", sectionIds).order("display_order"),
        admin.from("skills").select("*").in("section_id", sectionIds).order("display_order"),
        admin.from("certifications").select("*").in("section_id", sectionIds).order("display_order"),
        admin.from("projects").select("*").in("section_id", sectionIds).order("display_order"),
        admin.from("custom_sections").select("*").in("section_id", sectionIds).order("display_order"),
      ]);

    // Build section data for the prompt
    const sectionData = sections.map((section: { id: string; title: string; section_type: string }) => {
      let items: Record<string, unknown>[] = [];

      switch (section.section_type) {
        case "experience":
          items = (experiences.data || []).filter((e) => e.section_id === section.id);
          break;
        case "education":
          items = (educations.data || []).filter((e) => e.section_id === section.id);
          break;
        case "skills":
          items = (skills.data || []).filter((s) => s.section_id === section.id);
          break;
        case "certifications":
          items = (certifications.data || []).filter((c) => c.section_id === section.id);
          break;
        case "projects":
          items = (projects.data || []).filter((p) => p.section_id === section.id);
          break;
        case "summary":
        case "custom":
          items = (customSections.data || []).filter((c) => c.section_id === section.id);
          break;
      }

      return {
        title: section.title,
        type: section.section_type,
        items,
      };
    });

    const userPrompt = buildFullReviewUserPrompt({
      name: `${profile.first_name} ${profile.last_name}`,
      headline: profile.headline,
      location: profile.location,
      sections: sectionData,
    });

    // Call Claude API
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: AI_MAX_TOKENS,
      system: FULL_REVIEW_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    tokensIn = response.usage.input_tokens;
    tokensOut = response.usage.output_tokens;

    // Extract text response
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from AI");
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const review: FullReviewResult = JSON.parse(jsonText);

    // Store the review
    const { data: savedReview, error: saveError } = await admin
      .from("ai_reviews")
      .insert({
        profile_id: user.id,
        review_type: "full",
        overall_score: review.overall_score,
        ats_score: review.ats_score,
        recommendations: review,
        raw_response: response,
        model_used: AI_MODEL,
        tokens_used: tokensIn + tokensOut,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save review:", saveError);
    }

    return NextResponse.json({
      success: true,
      review,
      review_id: savedReview?.id,
      usage: {
        reviews_used: gate.used + 1,
        reviews_limit: gate.limit,
      },
    });
  } catch (error) {
    logStatus = "error";
    console.error("AI review error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "AI returned an invalid response. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate review. Please try again." },
      { status: 500 }
    );
  } finally {
    await logUsage(admin, {
      profileId: user.id,
      feature: "ai_review",
      status: logStatus,
      tokensIn,
      tokensOut,
      model: AI_MODEL,
    });
  }
}
