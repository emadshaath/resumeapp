import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, AI_MODEL } from "@/lib/claude/client";
import { APPLY_RECOMMENDATION_SYSTEM_PROMPT } from "@/lib/claude/prompts";
import { rateLimit } from "@/lib/rate-limit";
import type { ApplyRecommendationResult } from "@/lib/claude/schemas";

const TABLE_MAP: Record<string, string> = {
  experience: "experiences",
  education: "educations",
  skills: "skills",
  certifications: "certifications",
  projects: "projects",
  summary: "custom_sections",
  custom: "custom_sections",
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success: rateLimitOk } = rateLimit(
      `ai-apply:${user.id}`,
      20,
      5 * 60 * 1000
    );
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: "Please wait a few minutes before applying more recommendations." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { recommendation, section_type, section_name } = body as {
      recommendation: string;
      section_type: string;
      section_name: string;
    };

    if (!recommendation || !section_type || !section_name) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const tableName = TABLE_MAP[section_type];
    if (!tableName) {
      return NextResponse.json(
        { error: "Invalid section type." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Find the matching resume section
    const { data: sections } = await admin
      .from("resume_sections")
      .select("id, title, section_type")
      .eq("profile_id", user.id)
      .eq("section_type", section_type);

    if (!sections || sections.length === 0) {
      return NextResponse.json(
        { error: "Resume section not found." },
        { status: 404 }
      );
    }

    // Match by title if multiple sections of the same type exist
    const section =
      sections.find(
        (s) => s.title.toLowerCase() === section_name.toLowerCase()
      ) || sections[0];

    // Fetch current items
    const { data: items } = await admin
      .from(tableName)
      .select("*")
      .eq("section_id", section.id)
      .order("display_order");

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "No content in this section to update." },
        { status: 400 }
      );
    }

    // Build the prompt
    const userPrompt = `Section type: ${section_type}
Section name: ${section_name}

Current section data:
${JSON.stringify(items, null, 2)}

Recommendation to apply:
${recommendation}

Apply this recommendation to the section data. Return ONLY the JSON object.`;

    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      system: APPLY_RECOMMENDATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from AI");
    }

    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    const result: ApplyRecommendationResult = JSON.parse(jsonText);

    // Apply updates
    for (const update of result.updates) {
      // Verify the item belongs to this user's section
      const existingItem = items.find((item) => item.id === update.id);
      if (!existingItem) continue;

      // Strip any fields that shouldn't be updated
      const safeFields = { ...update.fields };
      for (const key of [
        "id",
        "section_id",
        "profile_id",
        "created_at",
        "updated_at",
        "display_order",
      ]) {
        delete safeFields[key];
      }

      if (Object.keys(safeFields).length > 0) {
        await admin
          .from(tableName)
          .update(safeFields)
          .eq("id", update.id)
          .eq("section_id", section.id);
      }
    }

    // Apply inserts
    for (const insert of result.inserts) {
      const safeInsert = { ...insert };
      for (const key of [
        "id",
        "created_at",
        "updated_at",
      ]) {
        delete safeInsert[key];
      }

      await admin.from(tableName).insert({
        ...safeInsert,
        section_id: section.id,
        profile_id: user.id,
        display_order: (items.length + result.inserts.indexOf(insert)),
      });
    }

    return NextResponse.json({
      success: true,
      explanation: result.explanation,
      updates_count: result.updates.length,
      inserts_count: result.inserts.length,
    });
  } catch (error) {
    console.error("Apply recommendation error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "AI returned an invalid response. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Failed to apply recommendation. Please try again." },
      { status: 500 }
    );
  }
}
