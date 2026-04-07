import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchResumeData } from "@/lib/pdf/fetch-resume-data";
import { renderResumePdf } from "@/lib/pdf/render";
import { applyVariantToResume } from "@/lib/tailor";
import type { PdfLayout, PdfColorTheme } from "@/lib/pdf/types";
import type { VariantData } from "@/types/database";

const VALID_LAYOUTS: PdfLayout[] = ["classic", "modern", "minimal", "executive"];
const VALID_THEMES: PdfColorTheme[] = ["navy", "teal", "charcoal"];

// GET /api/autofill/resume.pdf?variant=<id> — Generates a PDF resume, optionally tailored
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const layout = (searchParams.get("layout") || "classic") as PdfLayout;
  const colorTheme = (searchParams.get("theme") || "navy") as PdfColorTheme;
  const variantId = searchParams.get("variant");

  if (!VALID_LAYOUTS.includes(layout)) {
    return NextResponse.json({ error: "Invalid layout" }, { status: 400 });
  }
  if (!VALID_THEMES.includes(colorTheme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  let data = await fetchResumeData(supabase, user.id);
  if (!data) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Apply variant if specified
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

  const pdfBuffer = await renderResumePdf(data, layout, colorTheme);
  const fileName = `${data.profile.first_name}_${data.profile.last_name}_Resume.pdf`;

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
