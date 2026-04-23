"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import type {
  ResumeSection,
  ResumeBlock,
  Tier,
  PdfSettings,
  Profile,
  Experience,
  Education,
  Skill,
  Certification,
  Project,
  CustomSection,
} from "@/types/database";
import type { ResumeData } from "@/lib/pdf/types";
import { parseHighlights } from "@/lib/utils";
import { ImportResumeDialog } from "@/components/dashboard/import-resume-dialog";
import { AIReviewDrawer } from "@/components/dashboard/ai-review-drawer";
import { VersionHistoryDrawer } from "@/components/dashboard/version-history-drawer";
import { LinkedInAnalyzerDrawer } from "@/components/dashboard/linkedin-analyzer-drawer";
import { BuilderHeader, type BuilderView } from "./builder-header";
import { SectionList } from "./section-list";
import { StylePanel } from "./style-panel";
import {
  styleStateFromSettings,
  styleFingerprint,
  styleStateToSavePayload,
  styleStateToDownloadQuery,
  type StyleState,
} from "./style-state";

const PdfLivePreview = dynamic(() => import("@/components/dashboard/pdf-live-preview"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-900">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
    </div>
  ),
});

interface ResumeBuilderProps {
  /** Current user id, sourced server-side. */
  userId: string;
  /** Effective tier (override applied). */
  initialTier: Tier;
  /** All resume content + profile, used for the live preview. */
  initialData: ResumeData;
  /** Initial sections, lifted from initialData but kept separate so the left-rail can mutate them. */
  initialSections: ResumeSection[];
  initialBlocks: ResumeBlock[];
  initialSettings: PdfSettings | null;
}

/**
 * Three-pane Resume Builder shell. Replaces the old `/dashboard/sections`
 * single-column experience by combining content editing (left), live PDF
 * preview (center), and styling controls (right) on one screen. Header bar
 * carries every action that used to live in the old toolbar plus PDF Studio's
 * Save/Download.
 *
 * Canvas in the center is still a read-only PDF preview here — drag-and-drop
 * + inline editing land in later commits.
 */
export function ResumeBuilder({
  userId,
  initialTier,
  initialData,
  initialSections,
  initialBlocks,
  initialSettings,
}: ResumeBuilderProps) {
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createClient());

  // Content
  const [sections, setSections] = useState<ResumeSection[]>(initialSections);
  const [data, setData] = useState<ResumeData>(initialData);
  const [blocks] = useState<ResumeBlock[]>(initialBlocks);

  // Style
  const [style, setStyle] = useState<StyleState>(() => styleStateFromSettings(initialSettings));

  // Drawer state (kept on the shell so the header bar can trigger them)
  const [importOpen, setImportOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [linkedinOpen, setLinkedinOpen] = useState(false);

  // Mobile/tablet view toggle. Desktop ignores this and shows everything.
  const [view, setView] = useState<BuilderView>("edit");

  // Style save indicator
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const initialFingerprint = useMemo(
    () => styleFingerprint(styleStateFromSettings(initialSettings)),
    [initialSettings],
  );
  const dirty = styleFingerprint(style) !== initialFingerprint;

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  // Honor legacy ?open=... deep links pointing at this URL.
  // setState in an effect is intentional here — same pattern as the rest of
  // the dashboard's drawer-on-deep-link handling. Could be lifted into a hook
  // later but the trade-off isn't worth a refactor in this commit.
  useEffect(() => {
    const param = searchParams.get("open");
    /* eslint-disable react-hooks/set-state-in-effect */
    if (param === "import") setImportOpen(true);
    else if (param === "review") setReviewOpen(true);
    else if (param === "history") setHistoryOpen(true);
    else if (param === "linkedin") setLinkedinOpen(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // ?open=pdf is now a no-op — PDF settings are the right rail of this page.
  }, [searchParams]);

  // Re-fetch the full ResumeData after a content mutation so the live preview
  // reflects the change. Sections also refetched for left-rail ordering /
  // visibility flags.
  const refreshAll = useCallback(async () => {
    const [{ data: latestSections }, refreshed] = await Promise.all([
      supabase
        .from("resume_sections")
        .select("*")
        .eq("profile_id", userId)
        .order("display_order"),
      fetchResumeDataClient(supabase, userId),
    ]);
    if (latestSections) setSections(latestSections as ResumeSection[]);
    if (refreshed) setData(refreshed);
  }, [supabase, userId]);

  async function handleSaveStyle() {
    setSaving(true);
    const res = await fetch("/api/pdf/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(styleStateToSavePayload(style)),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  async function handleDownload() {
    setDownloading(true);
    const res = await fetch(`/api/autofill/resume.pdf?${styleStateToDownloadQuery(style).toString()}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Resume.pdf";
      a.click();
      URL.revokeObjectURL(url);
    }
    setDownloading(false);
  }

  return (
    <div className="-mx-4 sm:-mx-6 -my-6 sm:-my-8 flex min-h-[calc(100vh-0px)] flex-col bg-zinc-50 dark:bg-zinc-950">
      <BuilderHeader
        saving={saving}
        saved={saved}
        dirty={dirty}
        onSave={handleSaveStyle}
        downloading={downloading}
        onDownload={handleDownload}
        view={view}
        onViewChange={setView}
        onOpenImport={() => setImportOpen(true)}
        onOpenAIReview={() => setReviewOpen(true)}
        onOpenLinkedIn={() => setLinkedinOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left: section content forms */}
        <aside
          className={`w-full shrink-0 border-zinc-200 bg-white lg:h-[calc(100vh-50px)] lg:w-[340px] lg:border-r dark:border-zinc-800 dark:bg-zinc-950 ${
            view === "edit" ? "block" : "hidden"
          } lg:block`}
        >
          <SectionList
            sections={sections}
            setSections={setSections}
            supabase={supabase}
            profileId={userId}
            onRefresh={refreshAll}
            onOpenImport={() => setImportOpen(true)}
          />
        </aside>

        {/* Center: live PDF preview */}
        <section
          className={`relative flex-1 bg-zinc-100 dark:bg-zinc-900 ${
            view === "preview" ? "block" : "hidden"
          } lg:block`}
        >
          <div className="h-[calc(100vh-50px)] w-full">
            <PdfLivePreview
              data={data}
              layout={style.layout}
              colorTheme={style.colorTheme}
              fontConfig={style.fontConfig}
              blocks={blocks}
              pageTemplate={style.pageTemplate}
              sidebarWidth={style.sidebarWidth}
            />
          </div>
        </section>

        {/* Right: style controls. Desktop-only for now; mobile shows them under
            the Preview view in a later commit when we have more vertical room. */}
        <aside className="hidden w-full shrink-0 border-zinc-200 bg-white lg:block lg:h-[calc(100vh-50px)] lg:w-[340px] lg:border-l dark:border-zinc-800 dark:bg-zinc-950">
          <StylePanel value={style} onChange={(p) => setStyle((cur) => ({ ...cur, ...p }))} />
        </aside>
      </div>

      <ImportResumeDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={refreshAll}
      />
      <AIReviewDrawer
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onSectionUpdate={refreshAll}
        userTier={initialTier}
      />
      <LinkedInAnalyzerDrawer
        open={linkedinOpen}
        onClose={() => setLinkedinOpen(false)}
        onApplyComplete={refreshAll}
      />
      <VersionHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client-side ResumeData refresh — mirrors fetchResumeData from the server
// helper but without importing it (the server helper pulls server-only deps).
// ---------------------------------------------------------------------------

async function fetchResumeDataClient(
  supabase: SupabaseClient,
  profileId: string,
): Promise<ResumeData | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();
  if (!profile) return null;

  const { data: sections } = await supabase
    .from("resume_sections")
    .select("*")
    .eq("profile_id", profileId)
    .eq("is_visible", true)
    .order("display_order");

  const sectionList = (sections || []) as ResumeSection[];
  const sectionIds = sectionList.map((s) => s.id);
  if (sectionIds.length === 0) {
    return {
      profile: profile as Profile,
      sections: [],
      experiences: [],
      educations: [],
      skills: [],
      certifications: [],
      projects: [],
      customSections: [],
    };
  }

  const [experiences, educations, skills, certifications, projects, customSections] = await Promise.all([
    supabase.from("experiences").select("*").in("section_id", sectionIds).order("display_order"),
    supabase.from("educations").select("*").in("section_id", sectionIds).order("display_order"),
    supabase.from("skills").select("*").in("section_id", sectionIds).order("display_order"),
    supabase.from("certifications").select("*").in("section_id", sectionIds).order("display_order"),
    supabase.from("projects").select("*").in("section_id", sectionIds).order("display_order"),
    supabase.from("custom_sections").select("*").in("section_id", sectionIds).order("display_order"),
  ]);

  return {
    profile: profile as Profile,
    sections: sectionList,
    experiences: (experiences.data || []).map((e: Record<string, unknown>) => ({ ...e, highlights: parseHighlights(e.highlights) })) as Experience[],
    educations: (educations.data || []) as Education[],
    skills: (skills.data || []) as Skill[],
    certifications: (certifications.data || []) as Certification[],
    projects: (projects.data || []) as Project[],
    customSections: (customSections.data || []) as CustomSection[],
  };
}
