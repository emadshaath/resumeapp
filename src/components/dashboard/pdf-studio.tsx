"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Loader2,
  Check,
  ChevronLeft,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { ResumeData, PdfSettings } from "@/lib/pdf/types";
import type { ResumeBlock } from "@/types/database";
import { StylePanel } from "./resume-builder/style-panel";
import {
  DEFAULT_STYLE_STATE,
  styleStateFromSettings,
  styleFingerprint,
  styleStateToSavePayload,
  styleStateToDownloadQuery,
  type StyleState,
} from "./resume-builder/style-state";

const PdfLivePreview = dynamic(() => import("./pdf-live-preview"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
    </div>
  ),
});

interface PdfStudioProps {
  data: ResumeData;
  initialSettings: PdfSettings | null;
  initialBlocks: ResumeBlock[];
}

export function PdfStudio({ data, initialSettings, initialBlocks }: PdfStudioProps) {
  const [style, setStyle] = useState<StyleState>(() => styleStateFromSettings(initialSettings));
  const [blocks] = useState<ResumeBlock[]>(initialBlocks);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const patchStyle = (patch: Partial<StyleState>) => setStyle((cur) => ({ ...cur, ...patch }));

  async function handleSave() {
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

  function resetAll() {
    setStyle({ ...DEFAULT_STYLE_STATE });
  }

  return (
    <div className="-mx-4 sm:-mx-6 -my-6 sm:-my-8 flex min-h-[calc(100vh-0px)] flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6">
        <Link
          href="/dashboard/sections"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Resume Builder</span>
        </Link>
        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand" />
          <h1 className="text-sm font-semibold tracking-tight sm:text-base">PDF Studio</h1>
        </div>
        <div className="flex-1" />
        {saved && (
          <Badge variant="secondary" className="gap-1">
            <Check className="h-3 w-3" /> Saved
          </Badge>
        )}
        {!saved && dirty && (
          <span className="hidden text-xs text-zinc-500 sm:inline">Unsaved changes</span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={resetAll}
          className="hidden sm:inline-flex"
          aria-label="Reset to defaults"
        >
          <RotateCcw className="h-3.5 w-3.5 sm:mr-1" />
          <span className="hidden sm:inline">Reset</span>
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1" /> : null}
          <span className="hidden sm:inline">Save</span>
          <span className="sm:hidden">Save</span>
        </Button>
        <Button size="sm" variant="default" onClick={handleDownload} disabled={downloading}>
          {downloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1" />
          ) : (
            <Download className="h-3.5 w-3.5 sm:mr-1" />
          )}
          <span className="hidden sm:inline">Download</span>
        </Button>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b border-zinc-200 bg-white lg:h-[calc(100vh-58px)] lg:w-[360px] lg:border-b-0 lg:border-r dark:border-zinc-800 dark:bg-zinc-950">
          <StylePanel value={style} onChange={patchStyle} />
        </aside>

        <section className="relative flex-1 bg-zinc-100 dark:bg-zinc-900">
          <div className="h-[70vh] w-full lg:h-[calc(100vh-58px)]">
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
      </div>
    </div>
  );
}
