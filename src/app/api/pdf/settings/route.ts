import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PdfColorTheme, PdfFontFamily } from "@/lib/pdf/types";
import { FONT_OPTIONS } from "@/lib/pdf/types";
import type { PageTemplate } from "@/types/database";

// Accept legacy values from saved bookmarks and old client builds — they all
// resolve to "custom" since the four preset layouts collapsed into starter
// templates (migration 00027).
const LEGACY_LAYOUT_VALUES = ["classic", "modern", "minimal", "executive", "custom"] as const;
const VALID_THEMES: PdfColorTheme[] = ["navy", "teal", "charcoal"];
const VALID_FONTS: PdfFontFamily[] = Object.keys(FONT_OPTIONS) as PdfFontFamily[];
const VALID_PAGE_TEMPLATES: PageTemplate[] = ["single-column", "sidebar-left"];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// GET /api/pdf/settings — Fetch current user's PDF settings
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: settings } = await supabase
    .from("pdf_settings")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  return NextResponse.json({ settings: settings || null });
}

// POST /api/pdf/settings — Create or update PDF settings
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    layout,
    color_theme,
    show_on_profile,
    font_family,
    font_scale,
    line_height,
    spacing_scale,
    page_template,
    sidebar_width,
    page_margin,
    page_size,
  } = body;

  if (layout && !LEGACY_LAYOUT_VALUES.includes(layout)) {
    return NextResponse.json({ error: "Invalid layout" }, { status: 400 });
  }
  if (color_theme && !VALID_THEMES.includes(color_theme)) {
    return NextResponse.json({ error: "Invalid color theme" }, { status: 400 });
  }
  if (font_family && !VALID_FONTS.includes(font_family)) {
    return NextResponse.json({ error: "Invalid font family" }, { status: 400 });
  }
  if (page_template && !VALID_PAGE_TEMPLATES.includes(page_template)) {
    return NextResponse.json({ error: "Invalid page template" }, { status: 400 });
  }
  if (page_size && page_size !== "A4" && page_size !== "LETTER") {
    return NextResponse.json({ error: "Invalid page size" }, { status: 400 });
  }

  const fontScale = typeof font_scale === "number" ? clamp(font_scale, 0.8, 1.25) : undefined;
  const lineHeight = typeof line_height === "number" ? clamp(line_height, 1.15, 1.85) : undefined;
  const spacingScale = typeof spacing_scale === "number" ? clamp(spacing_scale, 0.8, 1.3) : undefined;
  const sidebarWidth = typeof sidebar_width === "number" ? Math.round(clamp(sidebar_width, 120, 260)) : undefined;
  const pageMargin = typeof page_margin === "number" ? Math.round(clamp(page_margin, 16, 80)) : undefined;

  // Upsert the settings
  const { data: existing } = await supabase
    .from("pdf_settings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  const payload = {
    // Always persist as "custom" — the four legacy values collapsed into
    // starter templates (migration 00027). Accepting them at the API edge
    // only so old client builds and saved download bookmarks don't 400.
    layout: "custom",
    color_theme: color_theme || "navy",
    show_on_profile: show_on_profile ?? false,
    font_family: font_family || "Helvetica",
    font_scale: fontScale ?? 1.0,
    line_height: lineHeight ?? 1.45,
    spacing_scale: spacingScale ?? 1.0,
    page_template: page_template || "single-column",
    sidebar_width: sidebarWidth ?? 180,
    page_margin: pageMargin ?? 40,
    page_size: page_size === "LETTER" ? "LETTER" : "A4",
  };

  if (existing) {
    const { data, error } = await supabase
      .from("pdf_settings")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("profile_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ settings: data });
  }

  const { data, error } = await supabase
    .from("pdf_settings")
    .insert({ profile_id: user.id, ...payload })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
