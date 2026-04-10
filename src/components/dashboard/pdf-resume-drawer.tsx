"use client";

import { useState, useEffect } from "react";
import { SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Download, Check, Loader2 } from "lucide-react";
import type { PdfLayout, PdfColorTheme } from "@/lib/pdf/types";
import { LAYOUT_OPTIONS, COLOR_THEMES } from "@/lib/pdf/types";

const LAYOUTS = Object.entries(LAYOUT_OPTIONS) as [PdfLayout, typeof LAYOUT_OPTIONS[PdfLayout]][];
const THEMES = Object.entries(COLOR_THEMES) as [PdfColorTheme, typeof COLOR_THEMES[PdfColorTheme]][];

interface PdfResumeDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function PdfResumeDrawer({ open, onClose }: PdfResumeDrawerProps) {
  const [layout, setLayout] = useState<PdfLayout>("classic");
  const [colorTheme, setColorTheme] = useState<PdfColorTheme>("navy");
  const [showOnProfile, setShowOnProfile] = useState(false);
  const [singlePage, setSinglePage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open) return;
    async function load() {
      const res = await fetch("/api/pdf/settings");
      const { settings } = await res.json();
      if (settings) {
        setLayout(settings.layout);
        setColorTheme(settings.color_theme);
        setShowOnProfile(settings.show_on_profile);
        setSinglePage(settings.single_page ?? false);
      }
      setLoaded(true);
    }
    load();
  }, [open]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/pdf/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout, color_theme: colorTheme, show_on_profile: showOnProfile, single_page: singlePage }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleDownload() {
    setDownloading(true);
    const res = await fetch(`/api/autofill/resume.pdf?layout=${layout}&theme=${colorTheme}&singlePage=${singlePage}`);
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
    <SheetContent open={open} onClose={onClose}>
      <SheetHeader>
        <SheetTitle>PDF Resume</SheetTitle>
        <SheetDescription>Choose a layout and color theme, then download your PDF.</SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {!loaded ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          <>
            {/* Layout Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Layout</h3>
              <div className="grid grid-cols-2 gap-3">
                {LAYOUTS.map(([key, opt]) => (
                  <button
                    key={key}
                    onClick={() => setLayout(key)}
                    className={`relative rounded-lg border-2 p-3 text-left transition-all ${
                      layout === key
                        ? "border-brand bg-brand/5"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    {layout === key && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-3.5 w-3.5 text-brand" />
                      </div>
                    )}
                    <LayoutPreview layout={key} />
                    <h4 className="font-semibold text-sm mt-2">{opt.label}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Theme */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Color Theme</h3>
              <div className="flex flex-wrap gap-2">
                {THEMES.map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => setColorTheme(key)}
                    className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all ${
                      colorTheme === key
                        ? "border-brand bg-brand/5"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="h-5 w-5 rounded-full border border-zinc-300" style={{ backgroundColor: theme.palette.primary }} />
                    <span className="text-sm font-medium">{theme.label}</span>
                    {colorTheme === key && <Check className="h-3.5 w-3.5 text-brand" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Single Page Mode */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Single Page</h3>
              <div className="flex items-center gap-3">
                <Switch checked={singlePage} onCheckedChange={setSinglePage} />
                <Label className="text-sm">
                  {singlePage ? "Enabled — compact layout to fit one page" : "Disabled — standard spacing"}
                </Label>
              </div>
            </div>

            {/* Public Download Toggle */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Public Download</h3>
              <div className="flex items-center gap-3">
                <Switch checked={showOnProfile} onCheckedChange={setShowOnProfile} />
                <Label className="text-sm">
                  {showOnProfile ? "Enabled — visitors can download your PDF" : "Disabled — PDF is private"}
                </Label>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Actions pinned to bottom */}
      {loaded && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 flex gap-3 shrink-0">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {saved ? "Saved!" : "Save Settings"}
          </Button>
          <Button variant="outline" onClick={handleDownload} disabled={downloading} className="flex-1">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Download PDF
          </Button>
        </div>
      )}
    </SheetContent>
  );
}

function LayoutPreview({ layout }: { layout: PdfLayout }) {
  const base = "w-full h-16 rounded bg-zinc-100 dark:bg-zinc-800 p-2 flex";

  if (layout === "classic") {
    return (
      <div className={`${base} flex-col gap-1`}>
        <div className="h-1.5 w-12 bg-zinc-300 dark:bg-zinc-600 rounded-sm" />
        <div className="h-1 w-16 bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
        <div className="flex-1 mt-0.5 space-y-0.5">
          <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
          <div className="h-1 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
        </div>
      </div>
    );
  }
  if (layout === "modern") {
    return (
      <div className={`${base} gap-1.5`}>
        <div className="w-6 bg-zinc-300 dark:bg-zinc-600 rounded-sm" />
        <div className="flex-1 space-y-0.5 py-0.5">
          <div className="h-1.5 w-10 bg-zinc-300 dark:bg-zinc-600 rounded-sm" />
          <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
          <div className="h-1 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
        </div>
      </div>
    );
  }
  if (layout === "minimal") {
    return (
      <div className={`${base} flex-col items-center gap-1`}>
        <div className="h-1.5 w-10 bg-zinc-300 dark:bg-zinc-600 rounded-sm" />
        <div className="h-px w-14 bg-zinc-300 dark:bg-zinc-600" />
        <div className="flex-1 w-full mt-0.5 space-y-0.5">
          <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
          <div className="h-1 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
        </div>
      </div>
    );
  }
  return (
    <div className={`${base} flex-col gap-1`}>
      <div className="h-3 bg-zinc-300 dark:bg-zinc-600 rounded-sm -mx-2 -mt-2 px-2 pt-1">
        <div className="h-1 w-10 bg-zinc-100 dark:bg-zinc-800 rounded-sm" />
      </div>
      <div className="flex-1 space-y-0.5 mt-0.5">
        <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
        <div className="h-1 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
      </div>
    </div>
  );
}
