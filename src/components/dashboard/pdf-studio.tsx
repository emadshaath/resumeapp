"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Loader2,
  Check,
  ChevronLeft,
  Type,
  Palette,
  RotateCcw,
  Sparkles,
  ArrowDownUp,
  AlignJustify,
} from "lucide-react";
import {
  COLOR_THEMES,
  LAYOUT_OPTIONS,
  FONT_OPTIONS,
  FONT_PRESETS,
  DEFAULT_FONT_CONFIG,
} from "@/lib/pdf/types";
import type {
  PdfLayout,
  PdfColorTheme,
  PdfFontConfig,
  PdfFontFamily,
  ResumeData,
  PdfSettings,
} from "@/lib/pdf/types";
import type { ResumeBlock, PageTemplate } from "@/types/database";

const PdfLivePreview = dynamic(() => import("./pdf-live-preview"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
    </div>
  ),
});

type TabKey = "style" | "layout";

interface PdfStudioProps {
  data: ResumeData;
  initialSettings: PdfSettings | null;
  initialBlocks: ResumeBlock[];
}

export function PdfStudio({ data, initialSettings, initialBlocks }: PdfStudioProps) {
  const [tab, setTab] = useState<TabKey>("style");

  // Core state
  const [layout, setLayout] = useState<PdfLayout>(
    (initialSettings?.layout as PdfLayout) || "classic",
  );
  const [colorTheme, setColorTheme] = useState<PdfColorTheme>(
    (initialSettings?.color_theme as PdfColorTheme) || "navy",
  );
  const [showOnProfile, setShowOnProfile] = useState<boolean>(
    initialSettings?.show_on_profile ?? false,
  );
  const [fontConfig, setFontConfig] = useState<PdfFontConfig>({
    fontFamily: (initialSettings?.font_family as PdfFontFamily) || DEFAULT_FONT_CONFIG.fontFamily,
    fontScale: initialSettings?.font_scale ?? DEFAULT_FONT_CONFIG.fontScale,
    lineHeight: initialSettings?.line_height ?? DEFAULT_FONT_CONFIG.lineHeight,
    spacingScale: initialSettings?.spacing_scale ?? DEFAULT_FONT_CONFIG.spacingScale,
  });
  const [pageTemplate, setPageTemplate] = useState<PageTemplate>(
    (initialSettings?.page_template as PageTemplate) || "single-column",
  );
  const [sidebarWidth] = useState<number>(initialSettings?.sidebar_width ?? 180);

  // Blocks are read-only from the Studio today — edited in the Resume Builder.
  // Kept in state anyway so future commits can wire in live updates.
  const [blocks] = useState<ResumeBlock[]>(initialBlocks);

  // Track "dirty" state vs last saved
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const initialFingerprint = useMemo(() => fingerprint({
    layout: (initialSettings?.layout as PdfLayout) || "classic",
    colorTheme: (initialSettings?.color_theme as PdfColorTheme) || "navy",
    showOnProfile: initialSettings?.show_on_profile ?? false,
    pageTemplate: (initialSettings?.page_template as PageTemplate) || "single-column",
    fontConfig: {
      fontFamily: (initialSettings?.font_family as PdfFontFamily) || DEFAULT_FONT_CONFIG.fontFamily,
      fontScale: initialSettings?.font_scale ?? DEFAULT_FONT_CONFIG.fontScale,
      lineHeight: initialSettings?.line_height ?? DEFAULT_FONT_CONFIG.lineHeight,
      spacingScale: initialSettings?.spacing_scale ?? DEFAULT_FONT_CONFIG.spacingScale,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const currentFingerprint = fingerprint({ layout, colorTheme, showOnProfile, pageTemplate, fontConfig });
  const dirty = currentFingerprint !== initialFingerprint;

  // Clear "Saved" flash after a delay
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/pdf/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        layout,
        color_theme: colorTheme,
        show_on_profile: showOnProfile,
        font_family: fontConfig.fontFamily,
        font_scale: fontConfig.fontScale,
        line_height: fontConfig.lineHeight,
        spacing_scale: fontConfig.spacingScale,
        page_template: pageTemplate,
        sidebar_width: sidebarWidth,
      }),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  async function handleDownload() {
    setDownloading(true);
    const qs = new URLSearchParams({
      layout,
      theme: colorTheme,
      font: fontConfig.fontFamily,
      fontScale: String(fontConfig.fontScale),
      lineHeight: String(fontConfig.lineHeight),
      spacingScale: String(fontConfig.spacingScale),
      pageTemplate,
      sidebarWidth: String(sidebarWidth),
    });
    const res = await fetch(`/api/autofill/resume.pdf?${qs.toString()}`);
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

  function applyPreset(presetKey: keyof typeof FONT_PRESETS) {
    const p = FONT_PRESETS[presetKey].config;
    setFontConfig((cur) => ({ ...cur, ...p }));
  }

  function resetAll() {
    setFontConfig({ ...DEFAULT_FONT_CONFIG });
    setLayout("classic");
    setColorTheme("navy");
  }

  const setFont = useCallback(<K extends keyof PdfFontConfig>(key: K, value: PdfFontConfig[K]) => {
    setFontConfig((cur) => ({ ...cur, [key]: value }));
  }, []);

  return (
    <div className="-mx-4 sm:-mx-6 -my-6 sm:-my-8 flex min-h-[calc(100vh-0px)] flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
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

      {/* Main: controls + preview */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Controls */}
        <aside className="w-full shrink-0 border-b border-zinc-200 bg-white lg:h-[calc(100vh-58px)] lg:w-[360px] lg:overflow-y-auto lg:border-b-0 lg:border-r dark:border-zinc-800 dark:bg-zinc-950">
          {/* Tabs */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            <TabButton active={tab === "style"} onClick={() => setTab("style")} icon={Type} label="Style" />
            <TabButton active={tab === "layout"} onClick={() => setTab("layout")} icon={Palette} label="Layout & Color" />
          </div>

          <div className="space-y-6 p-4 sm:p-5">
            {tab === "style" && (
              <>
                {/* Font family */}
                <Section title="Font family" subtitle="Click a font to preview it live">
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(FONT_OPTIONS) as [PdfFontFamily, typeof FONT_OPTIONS[PdfFontFamily]][]).map(([key, opt]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFont("fontFamily", key)}
                        className={`group rounded-lg border-2 p-3 text-left transition-all ${
                          fontConfig.fontFamily === key
                            ? "border-brand bg-brand/5"
                            : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div
                          className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100"
                          style={{ fontFamily: opt.webFamily }}
                        >
                          Aa
                        </div>
                        <div className="mt-1 truncate text-xs font-medium">{opt.label}</div>
                        <div className="truncate text-[10px] text-zinc-500">{opt.description}</div>
                      </button>
                    ))}
                  </div>
                </Section>

                {/* Presets */}
                <Section title="Presets" subtitle="Quick starting points">
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(FONT_PRESETS) as [keyof typeof FONT_PRESETS, typeof FONT_PRESETS[keyof typeof FONT_PRESETS]][]).map(([key, preset]) => {
                      const active = approxEqual(fontConfig.fontScale, preset.config.fontScale)
                        && approxEqual(fontConfig.lineHeight, preset.config.lineHeight)
                        && approxEqual(fontConfig.spacingScale, preset.config.spacingScale);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => applyPreset(key)}
                          className={`rounded-lg border-2 p-2.5 text-center text-xs transition-all ${
                            active
                              ? "border-brand bg-brand/5 text-brand"
                              : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                          }`}
                        >
                          <div className="font-semibold">{preset.label}</div>
                          <div className="mt-0.5 text-[10px] text-zinc-500">{preset.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </Section>

                <SliderRow
                  icon={ArrowDownUp}
                  label="Text size"
                  value={fontConfig.fontScale}
                  onChange={(v) => setFont("fontScale", round(v, 2))}
                  min={0.8}
                  max={1.25}
                  step={0.01}
                  format={(v) => `${Math.round(v * 100)}%`}
                  ticks={[
                    { label: "Small", value: 0.9 },
                    { label: "Default", value: 1.0 },
                    { label: "Large", value: 1.1 },
                  ]}
                  onTickClick={(v) => setFont("fontScale", v)}
                />

                <SliderRow
                  icon={AlignJustify}
                  label="Line spacing"
                  value={fontConfig.lineHeight}
                  onChange={(v) => setFont("lineHeight", round(v, 2))}
                  min={1.15}
                  max={1.85}
                  step={0.01}
                  format={(v) => v.toFixed(2)}
                  ticks={[
                    { label: "Tight", value: 1.25 },
                    { label: "Normal", value: 1.45 },
                    { label: "Relaxed", value: 1.7 },
                  ]}
                  onTickClick={(v) => setFont("lineHeight", v)}
                />

                <SliderRow
                  icon={ArrowDownUp}
                  label="Section spacing"
                  value={fontConfig.spacingScale}
                  onChange={(v) => setFont("spacingScale", round(v, 2))}
                  min={0.8}
                  max={1.3}
                  step={0.01}
                  format={(v) => `${Math.round(v * 100)}%`}
                  ticks={[
                    { label: "Compact", value: 0.85 },
                    { label: "Normal", value: 1.0 },
                    { label: "Airy", value: 1.2 },
                  ]}
                  onTickClick={(v) => setFont("spacingScale", v)}
                />
              </>
            )}

            {tab === "layout" && (
              <>
                <Section title="Layout" subtitle="Overall arrangement of the page">
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(LAYOUT_OPTIONS) as [PdfLayout, typeof LAYOUT_OPTIONS[PdfLayout]][]).map(([key, opt]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setLayout(key)}
                        className={`rounded-lg border-2 p-3 text-left transition-all ${
                          layout === key
                            ? "border-brand bg-brand/5"
                            : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                        }`}
                      >
                        <LayoutThumb layout={key} />
                        <div className="mt-2 text-sm font-semibold">{opt.label}</div>
                        <div className="mt-0.5 text-[11px] text-zinc-500">{opt.description}</div>
                      </button>
                    ))}
                  </div>
                </Section>

                {layout === "custom" && (
                  <Section title="Page template" subtitle="Arrangement of block zones on the page">
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { key: "single-column" as PageTemplate, label: "Single column", description: "All blocks flow top to bottom" },
                        { key: "sidebar-left" as PageTemplate, label: "Sidebar left", description: "Colored sidebar for skills, certs, contact" },
                      ]).map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setPageTemplate(opt.key)}
                          className={`rounded-lg border-2 p-3 text-left transition-all ${
                            pageTemplate === opt.key
                              ? "border-brand bg-brand/5"
                              : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                          }`}
                        >
                          <PageTemplateThumb template={opt.key} />
                          <div className="mt-2 text-sm font-semibold">{opt.label}</div>
                          <div className="mt-0.5 text-[11px] text-zinc-500">{opt.description}</div>
                        </button>
                      ))}
                    </div>
                  </Section>
                )}

                <Section title="Color theme">
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(COLOR_THEMES) as [PdfColorTheme, typeof COLOR_THEMES[PdfColorTheme]][]).map(([key, theme]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setColorTheme(key)}
                        className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all ${
                          colorTheme === key
                            ? "border-brand bg-brand/5"
                            : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                        }`}
                      >
                        <span
                          className="h-5 w-5 rounded-full border border-zinc-300"
                          style={{ backgroundColor: theme.palette.primary }}
                        />
                        <span className="text-sm font-medium">{theme.label}</span>
                        {colorTheme === key && <Check className="h-3.5 w-3.5 text-brand" />}
                      </button>
                    ))}
                  </div>
                </Section>

                <Section title="Public download" subtitle="Let visitors download your resume from your profile">
                  <div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                    <Switch checked={showOnProfile} onCheckedChange={setShowOnProfile} />
                    <Label className="text-sm">
                      {showOnProfile ? "Enabled" : "Disabled"}
                    </Label>
                  </div>
                </Section>
              </>
            )}
          </div>
        </aside>

        {/* Preview */}
        <section className="relative flex-1 bg-zinc-100 dark:bg-zinc-900">
          <div className="h-[70vh] w-full lg:h-[calc(100vh-58px)]">
            <PdfLivePreview
              data={data}
              layout={layout}
              colorTheme={colorTheme}
              fontConfig={fontConfig}
              blocks={blocks}
              pageTemplate={pageTemplate}
              sidebarWidth={sidebarWidth}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
        active
          ? "border-brand text-brand"
          : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
          {title}
        </h3>
        {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

interface SliderRowProps {
  icon: React.ElementType;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  ticks?: { label: string; value: number }[];
  onTickClick?: (v: number) => void;
}

function SliderRow({ icon: Icon, label, value, onChange, min, max, step, format, ticks, onTickClick }: SliderRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
          <Icon className="h-3.5 w-3.5 text-zinc-500" />
          {label}
        </div>
        <span className="text-xs tabular-nums text-zinc-500">{format(value)}</span>
      </div>
      <Slider value={value} onChange={onChange} min={min} max={max} step={step} aria-label={label} />
      {ticks && (
        <div className="flex justify-between">
          {ticks.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => onTickClick?.(t.value)}
              className="text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LayoutThumb({ layout }: { layout: PdfLayout }) {
  const base = "h-14 w-full rounded bg-zinc-100 p-1.5 dark:bg-zinc-800";
  if (layout === "classic") {
    return (
      <div className={`${base} flex flex-col gap-1`}>
        <div className="h-1.5 w-10 rounded-sm bg-zinc-300 dark:bg-zinc-600" />
        <div className="h-1 w-14 rounded-sm bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-0.5 flex-1 space-y-0.5">
          <div className="h-1 w-full rounded-sm bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-1 w-3/4 rounded-sm bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
    );
  }
  if (layout === "modern") {
    return (
      <div className={`${base} flex gap-1.5`}>
        <div className="w-5 rounded-sm bg-zinc-300 dark:bg-zinc-600" />
        <div className="flex-1 space-y-0.5 py-0.5">
          <div className="h-1.5 w-8 rounded-sm bg-zinc-300 dark:bg-zinc-600" />
          <div className="h-1 w-full rounded-sm bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-1 w-3/4 rounded-sm bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
    );
  }
  if (layout === "minimal") {
    return (
      <div className={`${base} flex flex-col items-center gap-1`}>
        <div className="h-1.5 w-9 rounded-sm bg-zinc-300 dark:bg-zinc-600" />
        <div className="h-px w-12 bg-zinc-300 dark:bg-zinc-600" />
        <div className="mt-0.5 w-full flex-1 space-y-0.5">
          <div className="h-1 w-full rounded-sm bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-1 w-3/4 rounded-sm bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
    );
  }
  if (layout === "executive") {
    return (
      <div className={`${base} flex flex-col gap-1`}>
        <div className="-mx-1.5 -mt-1.5 h-3 rounded-t bg-zinc-300 px-1.5 pt-1 dark:bg-zinc-600">
          <div className="h-1 w-9 rounded-sm bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="mt-0.5 flex-1 space-y-0.5">
          <div className="h-1 w-full rounded-sm bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-1 w-3/4 rounded-sm bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
    );
  }
  // custom
  return (
    <div className={`${base} flex flex-col gap-1`}>
      <div className="h-1.5 w-10 rounded-sm bg-brand/40 dark:bg-brand/30" />
      <div className="flex flex-1 gap-1">
        <div className="flex w-1/3 flex-col gap-0.5 rounded-sm bg-brand/10 p-0.5">
          <div className="h-0.5 w-full rounded-sm bg-brand/30" />
          <div className="h-0.5 w-full rounded-sm bg-brand/30" />
          <div className="h-0.5 w-3/4 rounded-sm bg-brand/30" />
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="h-1 w-full rounded-sm bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-1 w-full rounded-sm bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-1 w-3/4 rounded-sm bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
    </div>
  );
}

function PageTemplateThumb({ template }: { template: PageTemplate }) {
  const base = "h-12 w-full rounded bg-zinc-100 p-1.5 dark:bg-zinc-800";
  if (template === "sidebar-left") {
    return (
      <div className={`${base} flex gap-1`}>
        <div className="flex w-1/3 flex-col gap-0.5 rounded-sm bg-brand/15 p-0.5">
          <div className="h-0.5 w-full rounded-sm bg-brand/40" />
          <div className="h-0.5 w-3/4 rounded-sm bg-brand/40" />
          <div className="h-0.5 w-full rounded-sm bg-brand/40" />
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="h-1 w-full rounded-sm bg-zinc-300 dark:bg-zinc-600" />
          <div className="h-1 w-full rounded-sm bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-1 w-3/4 rounded-sm bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
    );
  }
  return (
    <div className={`${base} flex flex-col gap-0.5`}>
      <div className="h-1 w-10 rounded-sm bg-zinc-300 dark:bg-zinc-600" />
      <div className="h-1 w-full rounded-sm bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-1 w-full rounded-sm bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-1 w-3/4 rounded-sm bg-zinc-200 dark:bg-zinc-700" />
    </div>
  );
}

function round(n: number, decimals: number) {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function approxEqual(a: number, b: number) {
  return Math.abs(a - b) < 0.005;
}

function fingerprint(s: {
  layout: PdfLayout;
  colorTheme: PdfColorTheme;
  showOnProfile: boolean;
  pageTemplate: PageTemplate;
  fontConfig: PdfFontConfig;
}) {
  return [
    s.layout,
    s.colorTheme,
    s.showOnProfile ? "1" : "0",
    s.pageTemplate,
    s.fontConfig.fontFamily,
    s.fontConfig.fontScale.toFixed(2),
    s.fontConfig.lineHeight.toFixed(2),
    s.fontConfig.spacingScale.toFixed(2),
  ].join("|");
}
