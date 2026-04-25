import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchResumeData } from "@/lib/pdf/fetch-resume-data";
import { fetchResumeBlocks } from "@/lib/blocks/fetch";
import { renderResumePdf } from "@/lib/pdf/render";
import type { PdfLayout, PdfColorTheme, PdfSettings, PdfFontConfig, PdfFontFamily } from "@/lib/pdf/types";
import { DEFAULT_FONT_CONFIG } from "@/lib/pdf/types";
import type { PageTemplate } from "@/types/database";

// GET /api/pdf/public?slug=john-doe — Generates a PDF for a published profile
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const supabase = createAdminClient();

  // Lookup the profile by slug, must be published
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, is_published")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Check if user enabled PDF download on their profile
  const { data: pdfSettings } = await supabase
    .from("pdf_settings")
    .select("*")
    .eq("profile_id", profile.id)
    .single();

  const settings = pdfSettings as PdfSettings | null;
  if (!settings?.show_on_profile) {
    return NextResponse.json({ error: "PDF download not available for this profile" }, { status: 403 });
  }

  const data = await fetchResumeData(supabase, profile.id);
  if (!data) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Always Custom — see migration 00027. Kept as a typed constant rather
  // than reading settings.layout to make the intent explicit.
  const layout: PdfLayout = "custom";
  void settings.layout;
  const colorTheme = settings.color_theme as PdfColorTheme;
  const fontConfig: PdfFontConfig = {
    fontFamily: (settings.font_family as PdfFontFamily) || DEFAULT_FONT_CONFIG.fontFamily,
    fontScale: settings.font_scale ?? DEFAULT_FONT_CONFIG.fontScale,
    lineHeight: settings.line_height ?? DEFAULT_FONT_CONFIG.lineHeight,
    spacingScale: settings.spacing_scale ?? DEFAULT_FONT_CONFIG.spacingScale,
  };

  const blocks = layout === "custom"
    ? await fetchResumeBlocks(supabase, profile.id)
    : [];
  const pageTemplate: PageTemplate = (settings.page_template as PageTemplate) || "single-column";
  const sidebarWidth = settings.sidebar_width ?? 180;
  const pageMargin = settings.page_margin ?? 40;

  const pdfBuffer = await renderResumePdf(
    data,
    layout,
    colorTheme,
    fontConfig,
    { blocks, pageTemplate, sidebarWidth, pageMargin },
  );
  const fileName = `${profile.first_name}_${profile.last_name}_Resume.pdf`;

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
