import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchResumeData } from "@/lib/pdf/fetch-resume-data";
import { fetchResumeBlocks } from "@/lib/blocks/fetch";
import { PdfStudio } from "@/components/dashboard/pdf-studio";
import type { PdfSettings } from "@/lib/pdf/types";

export const dynamic = "force-dynamic";

export default async function PdfStudioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [data, { data: settings }, blocks] = await Promise.all([
    fetchResumeData(supabase, user.id),
    supabase
      .from("pdf_settings")
      .select("*")
      .eq("profile_id", user.id)
      .single(),
    fetchResumeBlocks(supabase, user.id),
  ]);

  if (!data) redirect("/dashboard/sections");

  return (
    <PdfStudio
      data={data}
      initialSettings={(settings as PdfSettings) ?? null}
      initialBlocks={blocks}
    />
  );
}
