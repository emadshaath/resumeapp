import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchResumeData } from "@/lib/pdf/fetch-resume-data";
import { renderResumePdf } from "@/lib/pdf/render";
import type { PdfLayout, PdfColorTheme, PdfSettings } from "@/lib/pdf/types";

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

  const layout = settings.layout as PdfLayout;
  const colorTheme = settings.color_theme as PdfColorTheme;
  const singlePage = settings.single_page ?? false;

  const pdfBuffer = await renderResumePdf(data, layout, colorTheme, singlePage);
  const fileName = `${profile.first_name}_${profile.last_name}_Resume.pdf`;

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
