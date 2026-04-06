import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, AI_MODEL, AI_MAX_TOKENS } from "@/lib/claude/client";
import { LINKEDIN_COMPARE_SYSTEM_PROMPT, buildLinkedInComparePrompt } from "@/lib/claude/prompts";
import { rateLimit } from "@/lib/rate-limit";
import type { LinkedInComparisonResult } from "@/lib/claude/schemas";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const linkedinText = body.linkedin_text?.trim();

    if (!linkedinText || linkedinText.length < 50) {
      return NextResponse.json(
        { error: "Please paste your full LinkedIn profile text (at least 50 characters)." },
        { status: 400 }
      );
    }

    if (linkedinText.length > 30000) {
      return NextResponse.json(
        { error: "LinkedIn text is too long. Please paste only the main profile content." },
        { status: 400 }
      );
    }

    // Rate limit: 5 analyses per 10 minutes
    const { success: rateLimitOk } = rateLimit(`linkedin-analyze:${user.id}`, 5, 10 * 60 * 1000);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: "Please wait a few minutes before running another analysis." },
        { status: 429 }
      );
    }

    // Fetch profile and resume data
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("*, resume_sections(*)")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const sections = profile.resume_sections || [];
    const sectionIds = sections.map((s: { id: string }) => s.id);

    // Fetch all resume content
    const [experiences, educations, skills, certifications, projects, customSections] =
      await Promise.all([
        sectionIds.length > 0 ? admin.from("experiences").select("*").in("section_id", sectionIds).order("display_order") : { data: [] },
        sectionIds.length > 0 ? admin.from("educations").select("*").in("section_id", sectionIds).order("display_order") : { data: [] },
        sectionIds.length > 0 ? admin.from("skills").select("*").in("section_id", sectionIds).order("display_order") : { data: [] },
        sectionIds.length > 0 ? admin.from("certifications").select("*").in("section_id", sectionIds).order("display_order") : { data: [] },
        sectionIds.length > 0 ? admin.from("projects").select("*").in("section_id", sectionIds).order("display_order") : { data: [] },
        sectionIds.length > 0 ? admin.from("custom_sections").select("*").in("section_id", sectionIds).order("display_order") : { data: [] },
      ]);

    // Build section data
    let summaryText: string | undefined;
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
        case "custom": {
          const customItems = (customSections.data || []).filter((c) => c.section_id === section.id);
          if (section.section_type === "summary" && customItems.length > 0) {
            summaryText = customItems[0].content;
          }
          items = customItems;
          break;
        }
      }

      return { title: section.title, type: section.section_type, items };
    });

    const userPrompt = buildLinkedInComparePrompt(
      {
        name: `${profile.first_name} ${profile.last_name}`,
        headline: profile.headline,
        location: profile.location,
        summary: summaryText,
        sections: sectionData,
      },
      linkedinText
    );

    // Call Claude API
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: AI_MAX_TOKENS,
      system: LINKEDIN_COMPARE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from AI");
    }

    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const comparison: LinkedInComparisonResult = JSON.parse(jsonText);

    return NextResponse.json({
      success: true,
      comparison,
      tokens_used: response.usage.input_tokens + response.usage.output_tokens,
    });
  } catch (error) {
    console.error("LinkedIn analysis error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "AI returned an invalid response. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Failed to analyze LinkedIn profile. Please try again." },
      { status: 500 }
    );
  }
}
