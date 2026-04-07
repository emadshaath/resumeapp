import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, AI_MODEL, AI_MAX_TOKENS } from "@/lib/claude/client";
import { FULL_REVIEW_SYSTEM_PROMPT, buildFullReviewUserPrompt } from "@/lib/claude/prompts";
import { rateLimit } from "@/lib/rate-limit";
import { getEffectiveTier } from "@/lib/stripe/feature-gate";
import type { FullReviewResult } from "@/lib/claude/schemas";
import type { Tier } from "@/types/database";

// Tier-based monthly limits
const TIER_LIMITS: Record<string, number> = {
  free: 1,
  pro: 10,
  premium: 999,
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get profile with tier
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("*, resume_sections(*)")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check tier-based rate limit (monthly)
    const tier = getEffectiveTier((profile.tier || "free") as Tier, profile.tier_override as Tier | null);
    const monthlyLimit = TIER_LIMITS[tier] || 1;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: reviewsThisMonth } = await admin
      .from("ai_reviews")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .eq("review_type", "full")
      .gte("created_at", startOfMonth.toISOString());

    if ((reviewsThisMonth || 0) >= monthlyLimit) {
      return NextResponse.json(
        {
          error: `You've used all ${monthlyLimit} AI review${monthlyLimit > 1 ? "s" : ""} for this month. ${
            tier === "free" ? "Upgrade to Pro for more reviews." : tier === "pro" ? "Upgrade to Premium for unlimited reviews." : ""
          }`,
        },
        { status: 429 }
      );
    }

    // Also apply a short-term rate limit to prevent abuse
    const { success: rateLimitOk } = rateLimit(`ai-review:${user.id}`, 3, 5 * 60 * 1000);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: "Please wait a few minutes before requesting another review." },
        { status: 429 }
      );
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
        tokens_used: response.usage.input_tokens + response.usage.output_tokens,
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
        reviews_used: (reviewsThisMonth || 0) + 1,
        reviews_limit: monthlyLimit,
      },
    });
  } catch (error) {
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
  }
}
