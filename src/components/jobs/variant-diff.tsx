"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
  Lightbulb,
} from "lucide-react";
import type { VariantData } from "@/types/database";

interface VariantDiffProps {
  variantData: VariantData;
  matchScore: number;
  jobTitle: string;
  companyName: string;
  jobApplicationId: string;
  onAccept: (variantData: VariantData, name: string) => void;
  onReject: () => void;
  saving?: boolean;
}

export function VariantDiff({
  variantData,
  matchScore,
  jobTitle,
  companyName,
  jobApplicationId,
  onAccept,
  onReject,
  saving,
}: VariantDiffProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editedData, setEditedData] = useState<VariantData>(variantData);

  function toggleSection(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const variantName = `Tailored for ${jobTitle} at ${companyName}`;

  return (
    <div className="space-y-4">
      {/* Score header */}
      <div className="flex items-center justify-between rounded-lg bg-brand-subtle p-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-brand" />
          <div>
            <p className="font-semibold text-sm">AI Tailored Variant</p>
            <p className="text-xs text-zinc-500">{variantName}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-brand">{matchScore}%</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Match</p>
        </div>
      </div>

      {/* Top priorities */}
      {editedData.top_priorities.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-brand" />
              Key Optimizations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {editedData.top_priorities.map((p, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-brand font-medium shrink-0">{i + 1}.</span>
                <span className="text-zinc-700 dark:text-zinc-300">{p}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Headline diff */}
      {editedData.headline && (
        <DiffSection
          title="Headline"
          expanded={expanded["headline"]}
          onToggle={() => toggleSection("headline")}
        >
          <div className="space-y-2">
            <textarea
              value={editedData.headline}
              onChange={(e) =>
                setEditedData({ ...editedData, headline: e.target.value })
              }
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm resize-y min-h-[60px]"
            />
          </div>
        </DiffSection>
      )}

      {/* Summary diff */}
      {editedData.summary && (
        <DiffSection
          title="Professional Summary"
          expanded={expanded["summary"]}
          onToggle={() => toggleSection("summary")}
        >
          <textarea
            value={editedData.summary}
            onChange={(e) =>
              setEditedData({ ...editedData, summary: e.target.value })
            }
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm resize-y min-h-[80px]"
          />
        </DiffSection>
      )}

      {/* Experience rewrites */}
      {editedData.experience_rewrites.length > 0 && (
        <DiffSection
          title={`Experience Rewrites (${editedData.experience_rewrites.length})`}
          expanded={expanded["experience"]}
          onToggle={() => toggleSection("experience")}
        >
          <div className="space-y-3">
            {editedData.experience_rewrites.map((rew, i) => (
              <div key={rew.id} className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant={rew.emphasis === "high" ? "default" : rew.emphasis === "low" ? "secondary" : "outline"}
                    className="text-[10px]"
                  >
                    {rew.emphasis} emphasis
                  </Badge>
                </div>
                {rew.description && (
                  <textarea
                    value={rew.description}
                    onChange={(e) => {
                      const updated = [...editedData.experience_rewrites];
                      updated[i] = { ...updated[i], description: e.target.value };
                      setEditedData({ ...editedData, experience_rewrites: updated });
                    }}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm resize-y min-h-[60px] mb-2"
                  />
                )}
                {rew.highlights && rew.highlights.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500 font-medium">Bullet Points:</p>
                    {rew.highlights.map((h, hi) => (
                      <div key={hi} className="flex items-start gap-1.5">
                        <span className="text-brand text-xs mt-1">•</span>
                        <input
                          value={h}
                          onChange={(e) => {
                            const updated = [...editedData.experience_rewrites];
                            const highlights = [...(updated[i].highlights || [])];
                            highlights[hi] = e.target.value;
                            updated[i] = { ...updated[i], highlights };
                            setEditedData({ ...editedData, experience_rewrites: updated });
                          }}
                          className="flex-1 rounded border border-zinc-200 dark:border-zinc-800 px-2 py-1 text-xs bg-white dark:bg-zinc-900"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DiffSection>
      )}

      {/* AI Reasoning */}
      {editedData.ai_reasoning && (
        <DiffSection
          title="AI Reasoning"
          expanded={expanded["reasoning"]}
          onToggle={() => toggleSection("reasoning")}
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{editedData.ai_reasoning}</p>
        </DiffSection>
      )}

      {/* Hidden items summary */}
      {(editedData.hidden_skills.length > 0 || editedData.hidden_sections.length > 0) && (
        <div className="text-xs text-zinc-500 px-1">
          {editedData.hidden_skills.length > 0 && (
            <p>{editedData.hidden_skills.length} irrelevant skills will be hidden</p>
          )}
          {editedData.hidden_sections.length > 0 && (
            <p>{editedData.hidden_sections.length} sections will be hidden</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
        <Button variant="outline" onClick={onReject} disabled={saving}>
          <X className="h-4 w-4 mr-1" />
          Discard
        </Button>
        <Button
          onClick={() => onAccept(editedData, variantName)}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          Save Variant
        </Button>
      </div>
    </div>
  );
}

function DiffSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const isExpanded = expanded !== false; // default open

  return (
    <Card>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
      >
        <span>{title}</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        )}
      </button>
      {isExpanded && (
        <CardContent className="pt-0 pb-4">{children}</CardContent>
      )}
    </Card>
  );
}
