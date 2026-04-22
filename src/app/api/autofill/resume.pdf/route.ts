import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchResumeData } from "@/lib/pdf/fetch-resume-data";
import { renderResumePdf } from "@/lib/pdf/render";
import { applyVariantToResume } from "@/lib/tailor";
import type { PdfLayout, PdfColorTheme, PdfFontFamily, PdfFontConfig } from "@/lib/pdf/types";
import { DEFAULT_FONT_CONFIG, FONT_OPTIONS } from "@/lib/pdf/types";
import type { VariantData } from "@/types/database";

const VALID_LAYOUTS: PdfLayout[] = ["classic", "modern", "minimal", "executive"];
const VALID_THEMES: PdfColorTheme[] = ["navy", "teal", "charcoal"];
const VALID_FONTS = Object.keys(FONT_OPTIONS) as PdfFontFamily[];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// GET /api/autofill/resume.pdf?variant=<id> — Generates a PDF resume, optionally tailored.
// Query params override saved settings for one-off previews.
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
  const variantId = searchParams.get("variant");

  // Load saved settings as defaults
  const { data: saved } = await supabase
    .from("pdf_settings")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  const layout: PdfLayout = (layoutParam && VALID_LAYOUTS.includes(layoutParam))
    ? layoutParam
    : ((saved?.layout as PdfLayout) || "classic");

  const colorTheme: PdfColorTheme = (themeParam && VALID_THEMES.includes(themeParam))
    ? themeParam
    : ((saved?.color_theme as PdfColorTheme) || "navy");

  const fontFamily: PdfFontFamily = (fontParam && VALID_FONTS.includes(fontParam))
    ? fontParam
    : ((saved?.font_family as PdfFontFamily) || DEFAULT_FONT_CONFIG.fontFamily);

  const fontConfig: PdfFontConfig = {
    fontFamily,
    fontScale: fontScaleParam != null
      ? clamp(parseFloat(fontScaleParam), 0.8, 1.25)
      : (saved?.font_scale ?? DEFAULT_FONT_CONFIG.fontScale),
    lineHeight: lineHeightParam != null
      ? clamp(parseFloat(lineHeightParam), 1.15, 1.85)
      : (saved?.line_height ?? DEFAULT_FONT_CONFIG.lineHeight),
    spacingScale: spacingScaleParam != null
      ? clamp(parseFloat(spacingScaleParam), 0.8, 1.3)
      : (saved?.spacing_scale ?? DEFAULT_FONT_CONFIG.spacingScale),
  };

  let data = await fetchResumeData(supabase, user.id);
  if (!data) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  if (variantId) {
    const { data: variant } = await supabase
      .from("profile_variants")
      .select("variant_data")
      .eq("id", variantId)
      .eq("profile_id", user.id)
      .single();

    if (variant?.variant_data) {
      data = applyVariantToResume(data, variant.variant_data as VariantData);
    }
  }

  const pdfBuffer = await renderResumePdf(data, layout, colorTheme, fontConfig);
  const fileName = `${data.profile.first_name}_${data.profile.last_name}_Resume.pdf`;

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
