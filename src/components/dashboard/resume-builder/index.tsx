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
import { cn, parseHighlights } from "@/lib/utils";
import { ImportResumeDialog } from "@/components/dashboard/import-resume-dialog";
import { AIReviewDrawer } from "@/components/dashboard/ai-review-drawer";
import { VersionHistoryDrawer } from "@/components/dashboard/version-history-drawer";
import { LinkedInAnalyzerDrawer } from "@/components/dashboard/linkedin-analyzer-drawer";
import { sectionTypeToBlockType } from "@/lib/blocks/seed";
import { BuilderHeader, type BuilderView } from "./builder-header";
import { SectionList } from "./section-list";
import { SectionsBottomSheet } from "./sections-bottom-sheet";
import { StylePanel } from "./style-panel";
import { BlockCanvas } from "./block-canvas";
import { BlockProperties } from "./block-properties";
import type { SaveFieldFn, DeleteRowFn, AddRowFn } from "./block-renderers";
import {
  styleStateFromSettings,
  styleFingerprint,
  styleStateToSavePayload,
  styleStateToDownloadQuery,
  type StyleState,
} from "./style-state";

/** Match the `lg:` Tailwind breakpoint (1024px). Used to gate
 *  mobile-only view-switching side-effects without a hook or SSR dance. */
function isDesktop() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(min-width: 1024px)").matches;
}

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
  const [blocks, setBlocks] = useState<ResumeBlock[]>(initialBlocks);

  // Style
  const [style, setStyle] = useState<StyleState>(() => styleStateFromSettings(initialSettings));

  // Center-pane mode + selection. "design" shows the interactive canvas (the
  // default); "preview" swaps to the actual PDF iframe so the user can verify
  // before downloading.
  const [centerMode, setCenterMode] = useState<"design" | "preview">("design");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;

  // Drawer state (kept on the shell so the header bar can trigger them)
  const [importOpen, setImportOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [linkedinOpen, setLinkedinOpen] = useState(false);

  // Mobile/tablet view toggle. Desktop ignores this and shows all three
  // columns at once — view only gates visibility below the `lg` breakpoint.
  // On mobile the user sees Design by default; Style is the contextual rail.
  // The section list lives in a floating bottom sheet (sectionsOpen below)
  // rather than a third toggle value.
  const [view, setView] = useState<BuilderView>("design");
  const [sectionsOpen, setSectionsOpen] = useState(false);

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

  // Wrapper over setSelectedBlockId that also flips the mobile view to
  // "style" so the block's properties become visible without the user
  // hunting for the toggle. Desktop already shows everything at once.
  const selectBlock = useCallback((id: string | null) => {
    setSelectedBlockId(id);
    if (id && !isDesktop()) setView("style");
  }, []);

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

  // Counter bumped after each inline canvas save settles. Used as part of
  // the SectionContentEditor's React key so any expanded form in the left
  // rail refetches and shows the post-save value without the user having
  // to collapse + re-expand the card.
  const [sectionFormVersion, setSectionFormVersion] = useState(0);

  // Inline text edits from the canvas. Optimistically update local state, then
  // persist via supabase (RLS-gated per table). Re-fetch isn't strictly needed
  // because we already patched local state, but we skip it to avoid clobbering
  // the user's next keystroke mid-flight.
  const saveField: SaveFieldFn = useCallback(
    async ({ table, id, field, value }) => {
      // Optimistic local update — mutate the right row in the ResumeData bag.
      setData((cur) => patchResumeData(cur, table, id, field, value));
      await supabase.from(table).update({ [field]: value }).eq("id", id);
      // Nudge the expanded section editor (if any) to refetch so it stops
      // showing stale data. Debounced save means this only fires after the
      // user pauses — no per-keystroke remounts.
      setSectionFormVersion((n) => n + 1);
    },
    [supabase],
  );

  // Whole-row deletions from the canvas (e.g. removing a single skill chip).
  // Optimistic: drop the row locally first, then DELETE via supabase.
  const deleteRow: DeleteRowFn = useCallback(
    async ({ table, id }) => {
      setData((cur) => removeRowFromResumeData(cur, table, id));
      await supabase.from(table).delete().eq("id", id);
      setSectionFormVersion((n) => n + 1);
    },
    [supabase],
  );

  // Whole-row insertions from the canvas (e.g. "+ Add skill"). Server-side
  // first (so we have the generated id) then mirror into ResumeData.
  const addRow: AddRowFn = useCallback(
    async ({ table, data: row }) => {
      const { data: inserted, error } = await supabase.from(table).insert(row).select().single();
      if (error || !inserted) return null;
      setData((cur) => addRowToResumeData(cur, table, inserted as Record<string, unknown>));
      setSectionFormVersion((n) => n + 1);
      return (inserted as { id: string }).id;
    },
    [supabase],
  );

  // Patch the user's profile row. Used by the Header block's properties
  // panel for the show-on-resume toggles; shares the profiles table with the
  // Profile page, so toggling in either surface is reflected in the other
  // after next navigation.
  const patchProfile = useCallback(async (patch: Partial<Profile>) => {
    setData((cur) => ({ ...cur, profile: { ...cur.profile, ...patch } as Profile }));
    await supabase.from("profiles").update(patch).eq("id", userId);
  }, [supabase, userId]);

  // Shared: create a canvas block for a given section if one doesn't already
  // exist. Used both by the auto-add-on-create flow and by the explicit
  // "add to canvas" button on each section list row.
  const addBlockForSection = useCallback(async (section: ResumeSection) => {
    const already = blocks.some((b) => b.source_section_id === section.id);
    if (already) return;
    const blockType = sectionTypeToBlockType(section.section_type);
    if (!blockType) return;
    const nextOrder = blocks.filter((b) => b.zone === "main").length;

    const res = await fetch("/api/resume/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: blockType,
        zone: "main",
        display_order: nextOrder,
        source_section_id: section.id,
        style: {},
      }),
    });
    if (!res.ok) return;
    const { block } = await res.json();
    setBlocks((cur) => (cur.some((b) => b.id === block.id) ? cur : [...cur, block]));
  }, [blocks]);

  const handleSectionAdded = addBlockForSection;

  // When a section is about to be deleted, remove its corresponding canvas
  // blocks first. The DB would cascade source_section_id to NULL anyway, but
  // keeping orphaned blocks around produces empty shells on the canvas.
  const handleSectionDeleting = useCallback(async (sectionId: string) => {
    const victims = blocks.filter((b) => b.source_section_id === sectionId);
    if (victims.length === 0) return;
    setBlocks((cur) => cur.filter((b) => b.source_section_id !== sectionId));
    if (selectedBlockId && victims.some((b) => b.id === selectedBlockId)) {
      setSelectedBlockId(null);
    }
    await Promise.all(
      victims.map((b) => fetch(`/api/resume/blocks/${b.id}`, { method: "DELETE" })),
    );
  }, [blocks, selectedBlockId]);

  // Mirror section-list reorders onto the main-zone canvas blocks. Blocks
  // without a matching section stay where they are (dividers, spacers,
  // sidebar blocks), only the section-backed ones in main rearrange to
  // match the new section order. Users expect the canvas to follow the
  // list when they use the ↑/↓ arrows.
  const mirrorSectionOrder = useCallback(async (orderedSectionIds: string[]) => {
    const rank = new Map(orderedSectionIds.map((id, i) => [id, i]));
    const mainBlocks = blocks.filter((b) => b.zone === "main");
    const sectionBacked = mainBlocks.filter(
      (b) => b.source_section_id && rank.has(b.source_section_id),
    );
    const freeBlocks = mainBlocks.filter(
      (b) => !b.source_section_id || !rank.has(b.source_section_id),
    );

    // Sort section-backed blocks by the new section rank.
    sectionBacked.sort(
      (a, b) => (rank.get(a.source_section_id!) ?? 0) - (rank.get(b.source_section_id!) ?? 0),
    );

    // Rebuild main zone: section-backed (in new order) then free blocks last.
    const newMain = [...sectionBacked, ...freeBlocks].map((b, i) => ({
      ...b,
      display_order: i,
    }));

    const other = blocks.filter((b) => b.zone !== "main");
    const next = [...other, ...newMain];

    setBlocks(next);
    await fetch("/api/resume/blocks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks: next.map((b) => ({
          id: b.id,
          type: b.type,
          zone: b.zone,
          display_order: b.display_order,
          source_section_id: b.source_section_id,
          style: b.style,
        })),
      }),
    });
  }, [blocks]);

  // Persist a new block ordering after a canvas drag. Optimistic: update the
  // local blocks list immediately, then PUT the whole list. If the write
  // fails the next page load corrects things — drag feedback is what matters.
  const reorderBlocks = useCallback(async (next: ResumeBlock[]) => {
    setBlocks(next);
    await fetch("/api/resume/blocks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks: next.map((b) => ({
          id: b.id,
          type: b.type,
          zone: b.zone,
          display_order: b.display_order,
          source_section_id: b.source_section_id,
          style: b.style,
        })),
      }),
    });
  }, []);

  // Patch a single block's fields locally + persist via API. Optimistic so
  // the canvas reflects the change before the server confirms.
  const patchBlock = useCallback(async (id: string, patch: Partial<ResumeBlock>) => {
    setBlocks((cur) => cur.map((b) => (b.id === id ? { ...b, ...patch } as ResumeBlock : b)));
    await fetch(`/api/resume/blocks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }, []);

  const deleteBlock = useCallback(async (id: string) => {
    setBlocks((cur) => cur.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
    await fetch(`/api/resume/blocks/${id}`, { method: "DELETE" });
  }, [selectedBlockId]);

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
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
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

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        {/* Left: section content forms. Desktop-only — mobile reaches the
            same list via the floating Sections bottom sheet rendered below. */}
        <aside className="hidden shrink-0 flex-col border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:flex lg:h-[calc(100vh-50px)] lg:w-[340px] lg:border-r">
          <SectionList
            sections={sections}
            setSections={setSections}
            supabase={supabase}
            profileId={userId}
            onRefresh={refreshAll}
            onOpenImport={() => setImportOpen(true)}
            onSectionAdded={handleSectionAdded}
            onSectionDeleting={handleSectionDeleting}
            onSectionsReordered={mirrorSectionOrder}
            blocks={blocks}
            onAddToCanvas={addBlockForSection}
            formRefreshVersion={sectionFormVersion}
          />
        </aside>

        {/* Center: design canvas (default) or PDF preview iframe (toggle). */}
        <section
          className={cn(
            "relative flex flex-col bg-zinc-100 dark:bg-zinc-900",
            "lg:h-[calc(100vh-50px)] lg:flex-1",
            "max-lg:w-full max-lg:flex-1",
            view !== "design" && "max-lg:hidden",
          )}
        >
          {/* Design / Preview mode toggle floats over the canvas */}
          <div className="absolute right-3 top-3 z-20 inline-flex rounded-md border border-zinc-300 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
            <button
              type="button"
              onClick={() => setCenterMode("design")}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                centerMode === "design"
                  ? "bg-brand text-brand-foreground"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              Design
            </button>
            <button
              type="button"
              onClick={() => setCenterMode("preview")}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                centerMode === "preview"
                  ? "bg-brand text-brand-foreground"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              Preview
            </button>
          </div>

          <div className="flex-1 w-full min-h-0">
            {centerMode === "design" && style.layout === "custom" ? (
              <BlockCanvas
                data={data}
                blocks={blocks}
                style={style}
                selectedBlockId={selectedBlockId}
                onSelectBlock={selectBlock}
                saveField={saveField}
                deleteRow={deleteRow}
                addRow={addRow}
                onReorder={reorderBlocks}
              />
            ) : (
              // Preview mode — and also the fallback for Design when the user
              // picked a preset layout (Classic/Modern/Minimal/Executive). The
              // block canvas is block-driven; the preset layouts aren't, so
              // there'd be nothing meaningful to edit on them beyond what the
              // section forms already handle.
              <PdfLivePreview
                data={data}
                layout={style.layout}
                colorTheme={style.colorTheme}
                fontConfig={style.fontConfig}
                blocks={blocks}
                pageTemplate={style.pageTemplate}
                sidebarWidth={style.sidebarWidth}
              />
            )}
          </div>
        </section>

        {/* Right: contextual rail. When a block is selected the panel switches
            into block-properties mode; otherwise styling controls. Visible on
            desktop always; on mobile it's the third member of the view toggle
            (Edit / Design / Style). */}
        <aside
          className={cn(
            "flex shrink-0 flex-col border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
            "lg:h-[calc(100vh-50px)] lg:w-[340px] lg:border-l",
            "max-lg:w-full max-lg:flex-1",
            view !== "style" && "max-lg:hidden",
          )}
        >
          {selectedBlock ? (
            <BlockProperties
              key={selectedBlock.id}
              block={selectedBlock}
              pageTemplateHasSidebar={style.pageTemplate === "sidebar-left"}
              onPatch={(patch) => patchBlock(selectedBlock.id, patch)}
              onDelete={() => deleteBlock(selectedBlock.id)}
              onClose={() => {
                setSelectedBlockId(null);
                // On mobile, returning from block properties should land the
                // user back on the canvas they were inspecting.
                if (!isDesktop()) setView("design");
              }}
              profile={data.profile}
              onProfilePatch={patchProfile}
            />
          ) : (
            <StylePanel value={style} onChange={(p) => setStyle((cur) => ({ ...cur, ...p }))} />
          )}
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

      {/* Mobile: floating Sections button + bottom sheet hosting the same
          SectionList the desktop left rail renders. Hidden on lg+ via the
          component's own wrapper class. */}
      <SectionsBottomSheet open={sectionsOpen} onOpenChange={setSectionsOpen}>
        <SectionList
          sections={sections}
          setSections={setSections}
          supabase={supabase}
          profileId={userId}
          onRefresh={refreshAll}
          onOpenImport={() => {
            setSectionsOpen(false);
            setImportOpen(true);
          }}
          onSectionAdded={handleSectionAdded}
          onSectionDeleting={handleSectionDeleting}
          onSectionsReordered={mirrorSectionOrder}
          blocks={blocks}
          onAddToCanvas={async (section) => {
            await addBlockForSection(section);
            // Drop the sheet so the user immediately sees the new block.
            setSectionsOpen(false);
          }}
          formRefreshVersion={sectionFormVersion}
        />
      </SectionsBottomSheet>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Optimistic patch helper: find the row matching `table` + `id` in a
// ResumeData bag and update a single field. Returns a new ResumeData so
// React picks up the change. Untouched rows are shared by reference.
// ---------------------------------------------------------------------------

/** Mirror of patchResumeData for deletions — drops the row matching
 *  (table, id) and returns a new ResumeData. Profile + resume_sections
 *  aren't deletable from the canvas (profile has a single row; sections
 *  have their own delete path through SectionList). */
function removeRowFromResumeData(data: ResumeData, table: string, id: string): ResumeData {
  const removeRow = <T extends { id: string }>(rows: T[]): T[] =>
    rows.filter((r) => r.id !== id);
  switch (table) {
    case "experiences":     return { ...data, experiences:    removeRow(data.experiences) };
    case "educations":      return { ...data, educations:     removeRow(data.educations) };
    case "skills":          return { ...data, skills:         removeRow(data.skills) };
    case "certifications":  return { ...data, certifications: removeRow(data.certifications) };
    case "projects":        return { ...data, projects:       removeRow(data.projects) };
    case "custom_sections": return { ...data, customSections: removeRow(data.customSections) };
    default:                return data;
  }
}

/** Append a freshly-inserted row into the matching ResumeData bucket. */
function addRowToResumeData(data: ResumeData, table: string, row: Record<string, unknown>): ResumeData {
  switch (table) {
    case "experiences":     return { ...data, experiences:    [...data.experiences,    row as unknown as Experience] };
    case "educations":      return { ...data, educations:     [...data.educations,     row as unknown as Education] };
    case "skills":          return { ...data, skills:         [...data.skills,         row as unknown as Skill] };
    case "certifications":  return { ...data, certifications: [...data.certifications, row as unknown as Certification] };
    case "projects":        return { ...data, projects:       [...data.projects,       row as unknown as Project] };
    case "custom_sections": return { ...data, customSections: [...data.customSections, row as unknown as CustomSection] };
    default:                return data;
  }
}

function patchResumeData(
  data: ResumeData,
  table: string,
  id: string,
  field: string,
  value: string | string[] | boolean,
): ResumeData {
  const patchRow = <T extends { id: string }>(rows: T[]): T[] =>
    rows.map((r) => (r.id === id ? { ...r, [field]: value } as T : r));

  switch (table) {
    case "profiles":
      return data.profile.id === id
        ? { ...data, profile: { ...data.profile, [field]: value } }
        : data;
    case "resume_sections":
      return { ...data, sections: patchRow(data.sections) };
    case "experiences":
      return { ...data, experiences: patchRow(data.experiences) };
    case "educations":
      return { ...data, educations: patchRow(data.educations) };
    case "skills":
      return { ...data, skills: patchRow(data.skills) };
    case "certifications":
      return { ...data, certifications: patchRow(data.certifications) };
    case "projects":
      return { ...data, projects: patchRow(data.projects) };
    case "custom_sections":
      return { ...data, customSections: patchRow(data.customSections) };
    default:
      return data;
  }
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
