import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchResumeData } from "@/lib/pdf/fetch-resume-data";
import { fetchResumeBlocks } from "@/lib/blocks/fetch";
import { renderResumePdf } from "@/lib/pdf/render";
import { applyVariantToResume } from "@/lib/tailor";
import type { PdfLayout, PdfColorTheme, PdfFontFamily, PdfFontConfig, PdfPageSize } from "@/lib/pdf/types";
import { DEFAULT_FONT_CONFIG, FONT_OPTIONS } from "@/lib/pdf/types";
import type { VariantData, PdfSettingsSnapshot, PageTemplate } from "@/types/database";

// Layout query param is accepted for back-compat (migration 00027 collapsed
// every variant into "custom") but the value is ignored — every render
// flows through CustomLayout now.
const VALID_THEMES: PdfColorTheme[] = ["navy", "teal", "charcoal"];
const VALID_FONTS = Object.keys(FONT_OPTIONS) as PdfFontFamily[];
const VALID_PAGE_TEMPLATES: PageTemplate[] = ["single-column", "sidebar-left"];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// GET /api/autofill/resume.pdf?variant=<id> — Generates a PDF resume, optionally tailored.
//
// Styling resolution order (highest precedence first):
//   1. Explicit query params (for live preview overrides from the PDF Studio)
//   2. Variant's frozen pdf_settings_snapshot (when ?variant=<id> is supplied)
//   3. User's current pdf_settings row
//   4. Hard-coded defaults
//
// When the effective layout is "custom", the user's current resume_blocks are
// used to render the PDF. Block arrangement is not yet part of the variant
// snapshot — see README note in lib/blocks for the v2 plan.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const layoutParam = searchParams.get("layout") as PdfLayout | null;
  const themeParam = searchParams.get("theme") as PdfColorTheme | null;
  const fontParam = searchParams.get("font") as PdfFontFamily | null;
  const fontScaleParam = searchParams.get("fontScale");
  const lineHeightParam = searchParams.get("lineHeight");
  const spacingScaleParam = searchParams.get("spacingScale");
  const pageTemplateParam = searchParams.get("pageTemplate") as PageTemplate | null;
  const sidebarWidthParam = searchParams.get("sidebarWidth");
  const pageMarginParam = searchParams.get("pageMargin");
  const pageSizeParam = searchParams.get("pageSize") as PdfPageSize | null;
  const variantId = searchParams.get("variant");

  // Load user's current saved settings (baseline for the base resume, or
  // fallback for legacy variants created before pdf_settings_snapshot existed).
  const { data: saved } = await supabase
    .from("pdf_settings")
    .select("layout, color_theme, font_family, font_scale, line_height, spacing_scale, page_template, sidebar_width, page_margin, page_size")
    .eq("profile_id", user.id)
    .single();

  // If this is a variant download, load the variant (incl. its frozen snapshot).
  type VariantRow = { variant_data: VariantData; pdf_settings_snapshot: PdfSettingsSnapshot | null };
  let variantRow: VariantRow | null = null;
  if (variantId) {
    const { data } = await supabase
      .from("profile_variants")
      .select("variant_data, pdf_settings_snapshot")
      .eq("id", variantId)
      .eq("profile_id", user.id)
      .single();
    if (data) variantRow = data as unknown as VariantRow;
  }

  // Styling baseline: variant snapshot > user's saved settings > defaults.
  const baseline = variantRow?.pdf_settings_snapshot ?? saved ?? null;

  // layoutParam is accepted for back-compat but coerced — every render uses
  // the block-driven Custom layout. Reference the variable so the param
  // parsing above stays alive for typecheck.
  void layoutParam;
  const layout: PdfLayout = "custom";

  const colorTheme: PdfColorTheme = (themeParam && VALID_THEMES.includes(themeParam))
    ? themeParam
    : ((baseline?.color_theme as PdfColorTheme) || "navy");

  const fontFamily: PdfFontFamily = (fontParam && VALID_FONTS.includes(fontParam))
    ? fontParam
    : ((baseline?.font_family as PdfFontFamily) || DEFAULT_FONT_CONFIG.fontFamily);

  const fontConfig: PdfFontConfig = {
    fontFamily,
    fontScale: fontScaleParam != null
      ? clamp(parseFloat(fontScaleParam), 0.8, 1.25)
      : (baseline?.font_scale ?? DEFAULT_FONT_CONFIG.fontScale),
    lineHeight: lineHeightParam != null
      ? clamp(parseFloat(lineHeightParam), 1.15, 1.85)
      : (baseline?.line_height ?? DEFAULT_FONT_CONFIG.lineHeight),
    spacingScale: spacingScaleParam != null
      ? clamp(parseFloat(spacingScaleParam), 0.8, 1.3)
      : (baseline?.spacing_scale ?? DEFAULT_FONT_CONFIG.spacingScale),
  };

  // Custom-layout inputs are only used when layout === "custom"; cheap to
  // compute, so build them unconditionally and let the renderer ignore them
  // for other layouts.
  const pageTemplate: PageTemplate = (pageTemplateParam && VALID_PAGE_TEMPLATES.includes(pageTemplateParam))
    ? pageTemplateParam
    : ((saved?.page_template as PageTemplate) || "single-column");
  const sidebarWidth: number = sidebarWidthParam != null
    ? Math.round(clamp(parseFloat(sidebarWidthParam), 120, 260))
    : (saved?.sidebar_width ?? 180);
  const pageMargin: number = pageMarginParam != null
    ? Math.round(clamp(parseFloat(pageMarginParam), 16, 80))
    : (saved?.page_margin ?? 40);
  const pageSize: PdfPageSize = pageSizeParam === "LETTER" || pageSizeParam === "A4"
    ? pageSizeParam
    : ((saved?.page_size as PdfPageSize) || "A4");

  const blocks = layout === "custom"
    ? await fetchResumeBlocks(supabase, user.id)
    : [];

  let data = await fetchResumeData(supabase, user.id);
  if (!data) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  if (variantRow?.variant_data) {
    data = applyVariantToResume(data, variantRow.variant_data);
  }

  const pdfBuffer = await renderResumePdf(
    data,
    layout,
    colorTheme,
    fontConfig,
    { blocks, pageTemplate, sidebarWidth, pageMargin, pageSize },
  );
  const fileName = `${data.profile.first_name}_${data.profile.last_name}_Resume.pdf`;

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
