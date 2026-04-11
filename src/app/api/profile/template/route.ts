import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseTemplate, isValidTemplate, TEMPLATES } from "@/lib/templates/registry";
import { getEffectiveTier } from "@/lib/stripe/feature-gate";
import type { Tier } from "@/types/database";

/**
 * PATCH — update the user's selected template and (optionally) accent colors.
 *
 * Body: {
 *   template?: TemplateId,
 *   template_accent?: string | null,      // hex e.g. "#7c4dff"
 *   template_accent_alt?: string | null,  // hex e.g. "#ff54b0"
 * }
 *
 * Validates:
 * - Template id is real
 * - User's tier allows the template
 * - Accent colors are valid 6-digit hex
 * - Accent colors only allowed on templates that support them
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get current profile to check tier and existing template
    const { data: profile } = await admin
      .from("profiles")
      .select("tier, tier_override, profile_template")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const effectiveTier = getEffectiveTier(
      profile.tier as Tier,
      profile.tier_override as Tier | null
    );

    const body = await request.json();
    const updates: Record<string, string | null> = {};

    // Validate template id
    if (body.template !== undefined) {
      if (!isValidTemplate(body.template)) {
        return NextResponse.json({ error: "Invalid template id" }, { status: 400 });
      }
      if (!canUseTemplate(effectiveTier, body.template)) {
        return NextResponse.json(
          { error: "This template requires a higher plan tier" },
          { status: 403 }
        );
      }
      updates.profile_template = body.template;
    }

    // Determine which template the accent colors will apply to
    const targetTemplate = updates.profile_template ?? profile.profile_template;
    const targetTemplateDef = TEMPLATES.find((t) => t.id === targetTemplate);

    // Validate and apply accent colors
    if (body.template_accent !== undefined) {
      if (body.template_accent !== null && !isValidHex(body.template_accent)) {
        return NextResponse.json(
          { error: "template_accent must be a 6-digit hex color (e.g. #7c4dff)" },
          { status: 400 }
        );
      }
      if (body.template_accent && !targetTemplateDef?.supportsCustomAccent) {
        return NextResponse.json(
          { error: "The selected template does not support custom accent colors" },
          { status: 400 }
        );
      }
      updates.template_accent = body.template_accent;
    }

    if (body.template_accent_alt !== undefined) {
      if (body.template_accent_alt !== null && !isValidHex(body.template_accent_alt)) {
        return NextResponse.json(
          { error: "template_accent_alt must be a 6-digit hex color (e.g. #ff54b0)" },
          { status: 400 }
        );
      }
      if (body.template_accent_alt && !targetTemplateDef?.supportsCustomAccent) {
        return NextResponse.json(
          { error: "The selected template does not support custom accent colors" },
          { status: 400 }
        );
      }
      updates.template_accent_alt = body.template_accent_alt;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data: updated, error: updateError } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select("profile_template, template_accent, template_accent_alt")
      .single();

    if (updateError) {
      console.error("Template update error:", updateError);
      return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    console.error("Template PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}
