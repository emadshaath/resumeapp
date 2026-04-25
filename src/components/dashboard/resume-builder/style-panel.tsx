"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Check,
  Type,
  Palette,
  ArrowDownUp,
  AlignJustify,
  Sparkles,
  Frame,
} from "lucide-react";
import {
  COLOR_THEMES,
  LAYOUT_OPTIONS,
  FONT_OPTIONS,
  FONT_PRESETS,
} from "@/lib/pdf/types";
import type {
  PdfLayout,
  PdfColorTheme,
  PdfFontConfig,
  PdfFontFamily,
} from "@/lib/pdf/types";
import { STARTERS, type StarterId } from "@/lib/blocks/starters";
import type { PageTemplate } from "@/types/database";
import type { StyleState } from "./style-state";

type TabKey = "style" | "layout";

interface StylePanelProps {
  value: StyleState;
  onChange: (patch: Partial<StyleState>) => void;
  /** Called when the user clicks a font preset (Compact / Comfortable / Spacious). */
  onPreset?: (key: keyof typeof FONT_PRESETS) => void;
  /** Apply a starter template — replaces the user's current canvas blocks
   *  with a predefined arrangement and switches to the Custom layout. The
   *  parent is expected to confirm-then-call the API. Skipped on this
   *  panel if not provided. */
  onApplyStarter?: (id: StarterId) => Promise<void> | void;
}

/**
 * The styling controls. Self-contained — owns nothing except its tab state.
 * All real state is hoisted to the parent (ResumeBuilder).
 */
export function StylePanel({ value, onChange, onPreset, onApplyStarter }: StylePanelProps) {
  const [tab, setTab] = useState<TabKey>("style");

  const setFont = <K extends keyof PdfFontConfig>(key: K, v: PdfFontConfig[K]) => {
    onChange({ fontConfig: { ...value.fontConfig, [key]: v } });
  };

  function applyPreset(key: keyof typeof FONT_PRESETS) {
    if (onPreset) {
      onPreset(key);
      return;
    }
    onChange({ fontConfig: { ...value.fontConfig, ...FONT_PRESETS[key].config } });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <TabButton active={tab === "style"} onClick={() => setTab("style")} icon={Type} label="Style" />
        <TabButton active={tab === "layout"} onClick={() => setTab("layout")} icon={Palette} label="Layout" />
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 p-4 sm:p-5">
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
                      value.fontConfig.fontFamily === key
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
                  const active = approxEqual(value.fontConfig.fontScale, preset.config.fontScale)
                    && approxEqual(value.fontConfig.lineHeight, preset.config.lineHeight)
                    && approxEqual(value.fontConfig.spacingScale, preset.config.spacingScale);
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
              value={value.fontConfig.fontScale}
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
              value={value.fontConfig.lineHeight}
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
              value={value.fontConfig.spacingScale}
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

            <SliderRow
              icon={Frame}
              label="Page margin"
              value={value.pageMargin}
              onChange={(v) => onChange({ pageMargin: Math.round(v) })}
              min={16}
              max={80}
              step={2}
              format={(v) => `${Math.round(v)}px`}
              ticks={[
                { label: "Tight", value: 24 },
                { label: "Normal", value: 40 },
                { label: "Wide", value: 56 },
              ]}
              onTickClick={(v) => onChange({ pageMargin: Math.round(v) })}
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
                    onClick={() => onChange({ layout: key })}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      value.layout === key
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

            {value.layout !== "custom" && (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">Fixed layout</p>
                <p className="mt-1 leading-relaxed">
                  {LAYOUT_OPTIONS[value.layout].label} uses a preset arrangement — drag and inline editing don&apos;t apply. Switch to{" "}
                  <button
                    type="button"
                    onClick={() => onChange({ layout: "custom" })}
                    className="font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                  >
                    Custom
                  </button>
                  {" "}to rearrange blocks and type directly on the canvas.
                </p>
              </div>
            )}

            {value.layout === "custom" && (
              <Section title="Page template" subtitle="Arrangement of block zones on the page">
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: "single-column" as PageTemplate, label: "Single column", description: "All blocks flow top to bottom" },
                    { key: "sidebar-left" as PageTemplate, label: "Sidebar left", description: "Colored sidebar for skills, certs, contact" },
                  ]).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => onChange({ pageTemplate: opt.key })}
                      className={`rounded-lg border-2 p-3 text-left transition-all ${
                        value.pageTemplate === opt.key
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

            {onApplyStarter && (
              <Section
                title="Starter templates"
                subtitle="Replace the current canvas layout with a preset arrangement. Your section content stays."
              >
                <div className="grid grid-cols-2 gap-2">
                  {(Object.values(STARTERS)).map((starter) => (
                    <button
                      key={starter.id}
                      type="button"
                      onClick={() => {
                        const ok = window.confirm(
                          `Apply the ${starter.label} starter? This replaces your current canvas layout — section content (jobs, education, skills) is kept.`,
                        );
                        if (ok) onApplyStarter(starter.id);
                      }}
                      className="rounded-lg border-2 border-dashed border-zinc-200 p-3 text-left transition-all hover:border-brand hover:bg-brand/5 dark:border-zinc-800"
                    >
                      <div className="flex items-center gap-1.5 text-sm font-semibold">
                        <Sparkles className="h-3.5 w-3.5 text-brand" />
                        {starter.label}
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-500 leading-relaxed">
                        {starter.description}
                      </div>
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
                    onClick={() => onChange({ colorTheme: key })}
                    className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all ${
                      value.colorTheme === key
                        ? "border-brand bg-brand/5"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                    }`}
                  >
                    <span
                      className="h-5 w-5 rounded-full border border-zinc-300"
                      style={{ backgroundColor: theme.palette.primary }}
                    />
                    <span className="text-sm font-medium">{theme.label}</span>
                    {value.colorTheme === key && <Check className="h-3.5 w-3.5 text-brand" />}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Public download" subtitle="Let visitors download your resume from your profile">
              <div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <Switch
                  checked={value.showOnProfile}
                  onCheckedChange={(v) => onChange({ showOnProfile: v })}
                />
                <Label className="text-sm">
                  {value.showOnProfile ? "Enabled" : "Disabled"}
                </Label>
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

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

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
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
