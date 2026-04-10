import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PdfLayout, PdfColorTheme } from "@/lib/pdf/types";

const VALID_LAYOUTS: PdfLayout[] = ["classic", "modern", "minimal", "executive"];
const VALID_THEMES: PdfColorTheme[] = ["navy", "teal", "charcoal"];

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
  const { layout, color_theme, show_on_profile, single_page } = body;

  if (layout && !VALID_LAYOUTS.includes(layout)) {
    return NextResponse.json({ error: "Invalid layout" }, { status: 400 });
  }
  if (color_theme && !VALID_THEMES.includes(color_theme)) {
    return NextResponse.json({ error: "Invalid color theme" }, { status: 400 });
  }

  // Upsert the settings
  const { data: existing } = await supabase
    .from("pdf_settings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from("pdf_settings")
      .update({
        layout: layout || "classic",
        color_theme: color_theme || "navy",
        show_on_profile: show_on_profile ?? false,
        single_page: single_page ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq("profile_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ settings: data });
  }

  const { data, error } = await supabase
    .from("pdf_settings")
    .insert({
      profile_id: user.id,
      layout: layout || "classic",
      color_theme: color_theme || "navy",
      show_on_profile: show_on_profile ?? false,
      single_page: single_page ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
