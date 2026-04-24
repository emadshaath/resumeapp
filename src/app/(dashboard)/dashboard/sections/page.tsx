import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchResumeData } from "@/lib/pdf/fetch-resume-data";
import { fetchResumeBlocks } from "@/lib/blocks/fetch";
import { ResumeBuilder } from "@/components/dashboard/resume-builder";
import type { PdfSettings, ResumeSection, Tier } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ResumeBuilderPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch everything the unified builder needs in one round trip.
  const [data, { data: settings }, { data: profile }, { data: sections }, blocks] = await Promise.all([
    fetchResumeData(supabase, user.id),
    supabase.from("pdf_settings").select("*").eq("profile_id", user.id).single(),
    supabase.from("profiles").select("tier, tier_override").eq("id", user.id).single(),
    supabase.from("resume_sections").select("*").eq("profile_id", user.id).order("display_order"),
    fetchResumeBlocks(supabase, user.id),
  ]);

  if (!data) {
    return <div className="py-20 text-center text-zinc-500">Profile not found.</div>;
  }

  const tier = (profile?.tier_override || profile?.tier || "free") as Tier;

  return (
    <ResumeBuilder
      userId={user.id}
      initialTier={tier}
      initialData={data}
      initialSections={(sections as ResumeSection[]) || []}
      initialBlocks={blocks}
      initialSettings={(settings as PdfSettings) ?? null}
    />
  );
}
