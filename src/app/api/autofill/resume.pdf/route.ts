import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchResumeData } from "@/lib/pdf/fetch-resume-data";
import { renderResumePdf } from "@/lib/pdf/render";
import type { PdfLayout, PdfColorTheme } from "@/lib/pdf/types";

const VALID_LAYOUTS: PdfLayout[] = ["classic", "modern", "minimal", "executive"];
const VALID_THEMES: PdfColorTheme[] = ["navy", "teal", "charcoal"];

// GET /api/autofill/resume.pdf — Generates a PDF resume for the authenticated user
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const layout = (searchParams.get("layout") || "classic") as PdfLayout;
  const colorTheme = (searchParams.get("theme") || "navy") as PdfColorTheme;

  if (!VALID_LAYOUTS.includes(layout)) {
    return NextResponse.json({ error: "Invalid layout" }, { status: 400 });
  }
  if (!VALID_THEMES.includes(colorTheme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  const data = await fetchResumeData(supabase, user.id);
  if (!data) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

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
