"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Download, Check, Loader2 } from "lucide-react";
import type { PdfLayout, PdfColorTheme } from "@/lib/pdf/types";
import { LAYOUT_OPTIONS, COLOR_THEMES } from "@/lib/pdf/types";

const LAYOUTS = Object.entries(LAYOUT_OPTIONS) as [PdfLayout, typeof LAYOUT_OPTIONS[PdfLayout]][];
const THEMES = Object.entries(COLOR_THEMES) as [PdfColorTheme, typeof COLOR_THEMES[PdfColorTheme]][];

export default function PdfResumePage() {
  const [layout, setLayout] = useState<PdfLayout>("classic");
  const [colorTheme, setColorTheme] = useState<PdfColorTheme>("navy");
  const [showOnProfile, setShowOnProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/pdf/settings");
      const { settings } = await res.json();
      if (settings) {
        setLayout(settings.layout);
        setColorTheme(settings.color_theme);
        setShowOnProfile(settings.show_on_profile);
      }
      setLoaded(true);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/pdf/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout, color_theme: colorTheme, show_on_profile: showOnProfile }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleDownload() {
    setDownloading(true);
    const res = await fetch(`/api/autofill/resume.pdf?layout=${layout}&theme=${colorTheme}`);
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

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">PDF Resume</h1>
        <p className="text-zinc-500 mt-1">
          Generate a professional PDF resume from your profile data. Choose a layout and color theme.
        </p>
      </div>

      {/* Layout Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Layout</CardTitle>
          <CardDescription>Choose how your resume is structured.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LAYOUTS.map(([key, opt]) => (
              <button
                key={key}
                onClick={() => setLayout(key)}
                className={`relative rounded-lg border-2 p-4 text-left transition-all ${
                  layout === key
                    ? "border-brand bg-brand/5"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                {layout === key && (
                  <div className="absolute top-3 right-3">
                    <Check className="h-4 w-4 text-brand" />
                  </div>
                )}
                <LayoutPreview layout={key} />
                <h3 className="font-semibold mt-3 text-zinc-900 dark:text-zinc-100">{opt.label}</h3>
                <p className="text-xs text-zinc-500 mt-1">{opt.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Color Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Color Theme</CardTitle>
          <CardDescription>Pick a color palette for your PDF resume.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {THEMES.map(([key, theme]) => (
              <button
                key={key}
                onClick={() => setColorTheme(key)}
                className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all ${
                  colorTheme === key
                    ? "border-brand bg-brand/5"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <div
                  className="h-6 w-6 rounded-full border border-zinc-300"
                  style={{ backgroundColor: theme.palette.primary }}
                />
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{theme.label}</span>
                {colorTheme === key && <Check className="h-4 w-4 text-brand ml-1" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Public Profile Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Public Download</CardTitle>
          <CardDescription>
            Allow visitors to download your PDF resume from your public profile page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch checked={showOnProfile} onCheckedChange={setShowOnProfile} />
            <Label className="text-sm">
              {showOnProfile ? "Enabled — visitors can download your PDF" : "Disabled — PDF is private"}
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {saved ? "Saved!" : "Save Settings"}
        </Button>
        <Button variant="outline" onClick={handleDownload} disabled={downloading}>
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Download Preview
        </Button>
      </div>
    </div>
  );
}

/** Mini layout preview thumbnails */
function LayoutPreview({ layout }: { layout: PdfLayout }) {
  const base = "w-full h-20 rounded bg-zinc-100 dark:bg-zinc-800 p-2 flex";

  if (layout === "classic") {
    return (
      <div className={`${base} flex-col gap-1`}>
        <div className="h-2 w-16 bg-zinc-300 dark:bg-zinc-600 rounded-sm" />
        <div className="h-1 w-24 bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
        <div className="flex-1 mt-1 space-y-1">
          <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
          <div className="h-1 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
          <div className="h-1 w-5/6 bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
        </div>
      </div>
    );
  }

  if (layout === "modern") {
    return (
      <div className={`${base} gap-1.5`}>
        <div className="w-8 bg-zinc-300 dark:bg-zinc-600 rounded-sm" />
        <div className="flex-1 space-y-1 py-0.5">
          <div className="h-2 w-12 bg-zinc-300 dark:bg-zinc-600 rounded-sm" />
          <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
          <div className="h-1 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
          <div className="h-1 w-5/6 bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
        </div>
      </div>
    );
  }

  if (layout === "minimal") {
    return (
      <div className={`${base} flex-col items-center gap-1`}>
        <div className="h-2 w-14 bg-zinc-300 dark:bg-zinc-600 rounded-sm" />
        <div className="h-px w-20 bg-zinc-300 dark:bg-zinc-600" />
        <div className="flex-1 w-full mt-1 space-y-1">
          <div className="flex gap-2">
            <div className="w-6 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
            <div className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
          </div>
          <div className="flex gap-2">
            <div className="w-6 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
            <div className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
          </div>
        </div>
      </div>
    );
  }

  // executive
  return (
    <div className={`${base} flex-col gap-1`}>
      <div className="h-4 bg-zinc-300 dark:bg-zinc-600 rounded-sm -mx-2 -mt-2 px-2 pt-1">
        <div className="h-1.5 w-14 bg-zinc-100 dark:bg-zinc-800 rounded-sm" />
      </div>
      <div className="flex-1 space-y-1 mt-0.5">
        <div className="flex items-center gap-1">
          <div className="w-0.5 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-sm" />
          <div className="h-1 w-10 bg-zinc-300 dark:bg-zinc-600 rounded-sm" />
        </div>
        <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
        <div className="h-1 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
      </div>
    </div>
  );
}
