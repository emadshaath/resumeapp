"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Lock, AlertCircle } from "lucide-react";
import { TEMPLATES, type TemplateId } from "@/lib/templates/registry";
import { getEffectiveTier } from "@/lib/stripe/feature-gate";
import type { Profile, Tier } from "@/types/database";

interface TemplatePickerProps {
  profile: Profile;
  onUpdate: (updates: Partial<Profile>) => void;
}

export function TemplatePicker({ profile, onUpdate }: TemplatePickerProps) {
  const router = useRouter();
  const effectiveTier = getEffectiveTier(profile.tier as Tier, profile.tier_override as Tier | null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Local state for Aurora accent colors
  const [accent, setAccent] = useState(profile.template_accent || "#7c4dff");
  const [accentAlt, setAccentAlt] = useState(profile.template_accent_alt || "#ff54b0");

  const selectedTemplate = profile.profile_template;
  const selectedDef = TEMPLATES.find((t) => t.id === selectedTemplate);

  async function selectTemplate(templateId: TemplateId) {
    const def = TEMPLATES.find((t) => t.id === templateId);
    if (!def) return;

    // Tier check (UI side; server enforces)
    const TIER_LEVEL: Record<Tier, number> = { free: 0, pro: 1, premium: 2 };
    if (TIER_LEVEL[effectiveTier] < TIER_LEVEL[def.tier]) {
      setError(`The ${def.name} template requires a ${def.tier === "pro" ? "Pro" : "Premium"} plan.`);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    const res = await fetch("/api/profile/template", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: templateId }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to update template");
    } else {
      onUpdate({ profile_template: templateId });
      setSuccess(true);
      router.refresh();
    }
    setSaving(false);
  }

  async function saveAuroraColors() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const res = await fetch("/api/profile/template", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template_accent: accent,
        template_accent_alt: accentAlt,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to update colors");
    } else {
      onUpdate({ template_accent: accent, template_accent_alt: accentAlt });
      setSuccess(true);
      router.refresh();
    }
    setSaving(false);
  }

  function resetAuroraColors() {
    setAccent("#7c4dff");
    setAccentAlt("#ff54b0");
  }

  const TIER_LEVEL: Record<Tier, number> = { free: 0, pro: 1, premium: 2 };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300 flex items-center gap-2">
          <Check className="h-4 w-4 flex-shrink-0" />
          Saved successfully.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Template</CardTitle>
          <CardDescription>
            Choose how your public profile is laid out. Your content stays the same — only the visual style changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((template) => {
              const isLocked = TIER_LEVEL[effectiveTier] < TIER_LEVEL[template.tier];
              const isSelected = selectedTemplate === template.id;

              return (
                <button
                  key={template.id}
                  type="button"
                  disabled={saving}
                  onClick={() => !isLocked && selectTemplate(template.id)}
                  className={`group relative flex flex-col gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-900"
                      : isLocked
                      ? "border-zinc-200 dark:border-zinc-800 opacity-60 cursor-not-allowed"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer"
                  }`}
                >
                  {/* Mini preview */}
                  <TemplatePreview templateId={template.id} />

                  {/* Metadata */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm">{template.name}</h3>
                      {isSelected && (
                        <Badge variant="default" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                      {!isSelected && isLocked && (
                        <Badge variant="secondary" className="text-xs">
                          <Lock className="h-3 w-3 mr-1" />
                          {template.tier === "pro" ? "Pro" : "Premium"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{template.tagline}</p>
                    <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{template.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Aurora-specific accent color customization */}
      {selectedDef?.supportsCustomAccent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Accent Colors</CardTitle>
            <CardDescription>
              Customize the gradient colors that drive {selectedDef.name}&apos;s look. Change these and every button, chip, border, and shadow updates in lockstep.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accent">Primary accent</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="accent-picker"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="h-10 w-14 rounded border border-zinc-200 dark:border-zinc-800 cursor-pointer"
                  />
                  <Input
                    id="accent"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    placeholder="#7c4dff"
                    className="font-mono text-sm flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accentAlt">Secondary accent</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="accent-alt-picker"
                    value={accentAlt}
                    onChange={(e) => setAccentAlt(e.target.value)}
                    className="h-10 w-14 rounded border border-zinc-200 dark:border-zinc-800 cursor-pointer"
                  />
                  <Input
                    id="accentAlt"
                    value={accentAlt}
                    onChange={(e) => setAccentAlt(e.target.value)}
                    placeholder="#ff54b0"
                    className="font-mono text-sm flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Live gradient preview */}
            <div className="rounded-lg p-4 text-white text-center font-bold text-sm uppercase tracking-wider"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accentAlt})`,
                boxShadow: `0 16px 30px ${accent}50`,
              }}
            >
              Preview · Your Gradient
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={resetAuroraColors} disabled={saving}>
                Reset to default
              </Button>
              <Button type="button" onClick={saveAuroraColors} disabled={saving}>
                {saving ? "Saving..." : "Save colors"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Tiny SVG mockup giving each template a recognizable shape.
 * Not a literal preview — just an abstract representation of the layout structure.
 */
function TemplatePreview({ templateId }: { templateId: TemplateId }) {
  const previews: Record<TemplateId, React.ReactNode> = {
    minimal: (
      <svg viewBox="0 0 160 100" className="w-full h-auto rounded-md border border-zinc-200 dark:border-zinc-800">
        <rect width="160" height="100" fill="#fafafa" />
        <rect x="0" y="0" width="160" height="28" fill="#27272a" />
        <circle cx="20" cy="14" r="6" fill="#fafafa" />
        <rect x="32" y="10" width="50" height="3" rx="1" fill="#fafafa" />
        <rect x="32" y="16" width="35" height="2" rx="1" fill="#a1a1aa" />
        <rect x="12" y="38" width="20" height="2" rx="1" fill="#3f3f46" />
        <rect x="12" y="44" width="135" height="2" rx="1" fill="#d4d4d8" />
        <rect x="12" y="49" width="120" height="2" rx="1" fill="#d4d4d8" />
        <rect x="12" y="60" width="20" height="2" rx="1" fill="#3f3f46" />
        <rect x="12" y="66" width="135" height="2" rx="1" fill="#d4d4d8" />
        <rect x="12" y="71" width="105" height="2" rx="1" fill="#d4d4d8" />
        <rect x="12" y="82" width="20" height="2" rx="1" fill="#3f3f46" />
        <rect x="12" y="88" width="60" height="2" rx="1" fill="#d4d4d8" />
      </svg>
    ),
    modern: (
      <svg viewBox="0 0 160 100" className="w-full h-auto rounded-md border border-zinc-200 dark:border-zinc-800">
        <rect width="160" height="100" fill="#fafafa" />
        <rect x="6" y="6" width="48" height="88" rx="6" fill="#4f46e5" />
        <circle cx="30" cy="22" r="8" fill="#a5b4fc" />
        <rect x="14" y="34" width="32" height="2" rx="1" fill="#c7d2fe" />
        <rect x="14" y="40" width="22" height="2" rx="1" fill="#c7d2fe" />
        <rect x="14" y="52" width="32" height="2" rx="1" fill="#a5b4fc" />
        <rect x="14" y="58" width="32" height="2" rx="1" fill="#a5b4fc" />
        <rect x="62" y="12" width="20" height="3" rx="1" fill="#4f46e5" />
        <rect x="62" y="22" width="90" height="2" rx="1" fill="#d4d4d8" />
        <rect x="62" y="27" width="78" height="2" rx="1" fill="#d4d4d8" />
        <rect x="62" y="40" width="20" height="3" rx="1" fill="#4f46e5" />
        <rect x="62" y="50" width="90" height="2" rx="1" fill="#d4d4d8" />
        <rect x="62" y="55" width="80" height="2" rx="1" fill="#d4d4d8" />
        <rect x="62" y="68" width="20" height="3" rx="1" fill="#4f46e5" />
        <rect x="62" y="78" width="90" height="2" rx="1" fill="#d4d4d8" />
      </svg>
    ),
    executive: (
      <svg viewBox="0 0 160 100" className="w-full h-auto rounded-md border border-zinc-200 dark:border-zinc-800">
        <rect width="160" height="100" fill="#fafaf9" />
        <line x1="20" y1="22" x2="140" y2="22" stroke="#1c1917" strokeWidth="0.5" />
        <line x1="20" y1="26" x2="140" y2="26" stroke="#1c1917" strokeWidth="0.5" />
        <rect x="56" y="10" width="48" height="4" rx="0" fill="#1c1917" />
        <rect x="62" y="16" width="36" height="2" rx="0" fill="#78716c" />
        <rect x="20" y="34" width="14" height="2" rx="0" fill="#1c1917" />
        <line x1="20" y1="38" x2="140" y2="38" stroke="#d6d3d1" strokeWidth="0.5" />
        <rect x="20" y="42" width="100" height="2" rx="0" fill="#57534e" />
        <rect x="20" y="47" width="115" height="2" rx="0" fill="#a8a29e" />
        <rect x="20" y="52" width="95" height="2" rx="0" fill="#a8a29e" />
        <rect x="20" y="62" width="14" height="2" rx="0" fill="#1c1917" />
        <line x1="20" y1="66" x2="140" y2="66" stroke="#d6d3d1" strokeWidth="0.5" />
        <rect x="20" y="70" width="80" height="2" rx="0" fill="#57534e" />
        <rect x="20" y="75" width="60" height="2" rx="0" fill="#a8a29e" />
        <rect x="20" y="84" width="14" height="2" rx="0" fill="#1c1917" />
        <line x1="20" y1="88" x2="140" y2="88" stroke="#d6d3d1" strokeWidth="0.5" />
      </svg>
    ),
    creative: (
      <svg viewBox="0 0 160 100" className="w-full h-auto rounded-md border border-zinc-200 dark:border-zinc-800">
        <rect width="160" height="100" fill="#fafafa" />
        <rect x="0" y="0" width="160" height="36" fill="#fce7f3" />
        <rect x="6" y="10" width="60" height="6" rx="0" fill="#1c1917" />
        <rect x="6" y="18" width="40" height="6" rx="0" fill="#ec4899" />
        <rect x="6" y="26" width="80" height="2" rx="0" fill="#78716c" />
        <line x1="0" y1="36" x2="160" y2="36" stroke="#ec4899" strokeWidth="2" />
        <rect x="6" y="44" width="14" height="2" rx="0" fill="#ec4899" />
        <rect x="30" y="44" width="20" height="3" rx="0" fill="#1c1917" />
        <rect x="30" y="50" width="120" height="2" rx="0" fill="#d4d4d8" />
        <rect x="30" y="55" width="100" height="2" rx="0" fill="#d4d4d8" />
        <rect x="6" y="68" width="14" height="2" rx="0" fill="#ec4899" />
        <rect x="30" y="68" width="20" height="3" rx="0" fill="#1c1917" />
        <rect x="30" y="74" width="120" height="2" rx="0" fill="#d4d4d8" />
        <rect x="30" y="79" width="80" height="2" rx="0" fill="#d4d4d8" />
        <rect x="30" y="86" width="14" height="4" rx="0" fill="#ec4899" />
        <rect x="48" y="86" width="18" height="4" rx="0" fill="#ec4899" />
        <rect x="70" y="86" width="14" height="4" rx="0" fill="#ec4899" />
      </svg>
    ),
    developer: (
      <svg viewBox="0 0 160 100" className="w-full h-auto rounded-md border border-zinc-200 dark:border-zinc-800">
        <rect width="160" height="100" fill="#09090b" />
        <rect x="6" y="6" width="148" height="32" rx="3" fill="#18181b" stroke="#27272a" />
        <circle cx="12" cy="11" r="1.2" fill="#ef4444" />
        <circle cx="16" cy="11" r="1.2" fill="#eab308" />
        <circle cx="20" cy="11" r="1.2" fill="#22c55e" />
        <rect x="11" y="18" width="40" height="2" rx="0.5" fill="#71717a" />
        <rect x="11" y="23" width="30" height="2" rx="0.5" fill="#fbbf24" />
        <rect x="15" y="28" width="60" height="2" rx="0.5" fill="#86efac" />
        <rect x="15" y="33" width="50" height="2" rx="0.5" fill="#86efac" />
        <rect x="6" y="44" width="20" height="2" rx="0" fill="#a855f7" />
        <rect x="6" y="50" width="100" height="2" rx="0" fill="#a1a1aa" />
        <rect x="6" y="55" width="80" height="2" rx="0" fill="#a1a1aa" />
        <rect x="6" y="65" width="20" height="2" rx="0" fill="#a855f7" />
        <rect x="6" y="71" width="120" height="2" rx="0" fill="#a1a1aa" />
        <rect x="6" y="76" width="90" height="2" rx="0" fill="#a1a1aa" />
        <rect x="6" y="86" width="20" height="2" rx="0" fill="#a855f7" />
        <rect x="6" y="92" width="120" height="2" rx="0" fill="#a1a1aa" />
      </svg>
    ),
    aurora: (
      <svg viewBox="0 0 160 100" className="w-full h-auto rounded-md border border-zinc-200 dark:border-zinc-800">
        <defs>
          <linearGradient id="aurora-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#f3f5ff" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
          <linearGradient id="aurora-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c4dff" />
            <stop offset="100%" stopColor="#ff54b0" />
          </linearGradient>
        </defs>
        <rect width="160" height="100" fill="url(#aurora-bg)" />
        {/* Hero card */}
        <rect x="8" y="6" width="144" height="32" rx="6" fill="#ffffff" stroke="#e4e4e7" />
        <circle cx="22" cy="22" r="7" fill="url(#aurora-grad)" />
        <rect x="34" y="13" width="40" height="3" rx="1" fill="#1f1b3d" />
        <rect x="34" y="20" width="60" height="2" rx="1" fill="#61648a" />
        <rect x="34" y="26" width="20" height="3" rx="1.5" fill="url(#aurora-grad)" />
        {/* Section card */}
        <rect x="8" y="44" width="144" height="22" rx="5" fill="#ffffff" stroke="#e4e4e7" />
        <rect x="14" y="50" width="22" height="2" rx="1" fill="#7c4dff" />
        <rect x="14" y="56" width="100" height="2" rx="1" fill="#61648a" />
        <rect x="14" y="61" width="80" height="2" rx="1" fill="#61648a" />
        {/* Skills card with chips */}
        <rect x="8" y="72" width="144" height="22" rx="5" fill="#ffffff" stroke="#e4e4e7" />
        <rect x="14" y="78" width="22" height="2" rx="1" fill="#7c4dff" />
        <rect x="14" y="84" width="14" height="4" rx="2" fill="#7c4dff" fillOpacity="0.15" />
        <rect x="32" y="84" width="18" height="4" rx="2" fill="#7c4dff" fillOpacity="0.15" />
        <rect x="54" y="84" width="14" height="4" rx="2" fill="#7c4dff" fillOpacity="0.15" />
        <rect x="72" y="84" width="20" height="4" rx="2" fill="#7c4dff" fillOpacity="0.15" />
      </svg>
    ),
  };

  return previews[templateId];
}
