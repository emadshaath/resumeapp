"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Target,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Play,
  Check,
  Loader2,
} from "lucide-react";
import type { FullReviewResult, SectionReview } from "@/lib/claude/schemas";

interface SavedReview {
  id: string;
  overall_score: number | null;
  ats_score: number | null;
  recommendations: FullReviewResult;
  created_at: string;
}

interface AIReviewDrawerProps {
  open: boolean;
  onClose: () => void;
  onSectionUpdate?: () => void;
  userTier?: "free" | "pro" | "premium";
}

export function AIReviewDrawer({ open, onClose, onSectionUpdate, userTier = "free" }: AIReviewDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<FullReviewResult | null>(null);
  const [usage, setUsage] = useState<{ reviews_used: number; reviews_limit: number } | null>(null);
  const [history, setHistory] = useState<SavedReview[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [viewingHistory, setViewingHistory] = useState<string | null>(null);

  const supabase = createClient();

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const { data } = await supabase
      .from("ai_reviews")
      .select("id, overall_score, ats_score, recommendations, created_at")
      .eq("review_type", "full")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setHistory(data as SavedReview[]);
    setHistoryLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (open) loadHistory();
  }, [open, loadHistory]);

  async function runReview() {
    setLoading(true);
    setError(null);
    setViewingHistory(null);

    try {
      const res = await fetch("/api/ai/review", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate review.");
        return;
      }

      setReview(data.review);
      setUsage(data.usage);
      loadHistory();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function viewHistorical(item: SavedReview) {
    setViewingHistory(item.id);
    setReview(item.recommendations);
    setError(null);
  }

  return (
    <SheetContent open={open} onClose={onClose}>
      <SheetHeader>
        <SheetTitle>AI Resume Review</SheetTitle>
        <SheetDescription>Get AI-powered analysis with actionable recommendations.</SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Run button */}
        <div className="flex items-center justify-between">
          <Button onClick={runReview} disabled={loading}>
            {loading ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" />Run AI Review</>
            )}
          </Button>
          {usage && (
            <span className="text-xs text-zinc-500">
              {usage.reviews_used}/{usage.reviews_limit} used
            </span>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-zinc-400 animate-spin mb-4" />
            <p className="text-sm text-zinc-500">Analyzing your resume...</p>
            <p className="text-xs text-zinc-400 mt-1">15-30 seconds</p>
          </div>
        )}

        {!loading && review && (
          <>
            {viewingHistory && (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Clock className="h-4 w-4" />
                Viewing review from {new Date(history.find(h => h.id === viewingHistory)?.created_at || "").toLocaleDateString()}
                <Button variant="ghost" size="sm" onClick={() => { setViewingHistory(null); setReview(null); }}>Clear</Button>
              </div>
            )}
            <ReviewResults review={review} onSectionUpdate={onSectionUpdate} canApply={userTier !== "free"} />
          </>
        )}

        {!loading && !review && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3" />
            <h3 className="font-medium">Ready to Review</h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-xs">
              Click &quot;Run AI Review&quot; for scores, feedback, and ATS compatibility.
            </p>
          </div>
        )}

        {/* Review History */}
        {history.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-zinc-400" /> Review History
            </h3>
            <div className="space-y-1.5">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => viewHistorical(item)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-colors text-sm ${
                    viewingHistory === item.id
                      ? "border-brand bg-brand-muted"
                      : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>
                      <span className="font-medium">Score: {item.overall_score}</span>
                      <span className="text-zinc-400 mx-1">|</span>
                      <span className="text-zinc-500">ATS: {item.ats_score}</span>
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </SheetContent>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const radius = 36;
  const stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const svgSize = (radius + stroke) * 2;

  let color = "text-red-500";
  if (score >= 75) color = "text-green-500";
  else if (score >= 60) color = "text-yellow-500";
  else if (score >= 40) color = "text-orange-500";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-zinc-200 dark:text-zinc-700" />
          <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={color} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-bold text-lg">{score}</span>
        </div>
      </div>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}

function SectionCard({
  section,
  onSectionUpdate,
  canApply,
}: {
  section: SectionReview;
  onSectionUpdate?: () => void;
  canApply?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [contextInputs, setContextInputs] = useState<Record<number, string>>({});
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null);
  const [appliedResults, setAppliedResults] = useState<Record<number, { changes: string[] }>>(
    {}
  );
  const [applyError, setApplyError] = useState<string | null>(null);

  function openContextInput(index: number) {
    setActiveIndex(index);
    setApplyError(null);
  }

  function cancelContext(index: number) {
    setActiveIndex(null);
    setContextInputs((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }

  async function applyRecommendation(rec: string, index: number) {
    setApplyingIndex(index);
    setApplyError(null);

    try {
      const res = await fetch("/api/ai/apply-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendation: rec,
          section_type: section.section_type,
          section_name: section.section_name,
          user_context: contextInputs[index]?.trim() || "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApplyError(data.error || "Failed to apply.");
        return;
      }

      setAppliedResults((prev) => ({
        ...prev,
        [index]: {
          changes: data.changes_summary || [data.explanation],
        },
      }));
      setActiveIndex(null);
      onSectionUpdate?.();
    } catch {
      setApplyError("Network error. Please try again.");
    } finally {
      setApplyingIndex(null);
    }
  }

  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center justify-between w-full text-left">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${
            section.score >= 75 ? "text-green-600" : section.score >= 60 ? "text-yellow-600" : section.score >= 40 ? "text-orange-600" : "text-red-600"
          }`}>{section.score}</span>
          <span className="font-medium text-sm">{section.section_name}</span>
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />}
      </button>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{section.feedback}</p>
          {applyError && (
            <p className="text-xs text-red-500">{applyError}</p>
          )}
          {section.recommendations.length > 0 && (
            <ul className="space-y-3">
              {section.recommendations.map((rec, i) => {
                const isApplying = applyingIndex === i;
                const applied = appliedResults[i];
                const isActive = activeIndex === i;

                return (
                  <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-start gap-2">
                      <span className="text-brand mt-0.5 shrink-0">•</span>
                      <span className="flex-1">{rec}</span>
                    </div>
                    <div className="ml-4 mt-1.5">
                      {applied ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                            <Check className="h-3 w-3" /> Applied
                          </span>
                          {applied.changes.map((change, ci) => (
                            <p key={ci} className="text-xs text-zinc-500 dark:text-zinc-400 ml-4">
                              {change}
                            </p>
                          ))}
                        </div>
                      ) : isActive ? (
                        <div className="space-y-2 rounded-md border border-zinc-200 dark:border-zinc-700 p-2.5 bg-white dark:bg-zinc-800">
                          <Textarea
                            placeholder="Add context to help AI apply this better (e.g. &quot;Graduated in 2021&quot;, &quot;Increased revenue by 30%&quot;). Leave empty to let AI improve the writing."
                            rows={2}
                            value={contextInputs[i] || ""}
                            onChange={(e) =>
                              setContextInputs((prev) => ({ ...prev, [i]: e.target.value }))
                            }
                            className="text-xs resize-none"
                            disabled={isApplying}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs px-3"
                              disabled={isApplying || applyingIndex !== null}
                              onClick={() => applyRecommendation(rec, i)}
                            >
                              {isApplying ? (
                                <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Applying...</>
                              ) : (
                                <><Play className="h-3 w-3 mr-1" />Apply</>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2"
                              disabled={isApplying}
                              onClick={() => cancelContext(i)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : canApply ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2.5"
                          disabled={applyingIndex !== null}
                          onClick={() => openContextInput(i)}
                        >
                          <Play className="h-3 w-3 mr-1" />Apply
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="text-xs font-normal">
                          Pro
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewResults({ review, onSectionUpdate, canApply }: { review: FullReviewResult; onSectionUpdate?: () => void; canApply?: boolean }) {
  return (
    <div className="space-y-5">
      <div className="flex justify-center gap-8">
        <ScoreRing score={review.overall_score} label="Overall" />
        <ScoreRing score={review.ats_score} label="ATS" />
      </div>

      <p className="text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">{review.summary}</p>

      {review.strengths.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> Strengths</h4>
          <ul className="space-y-0.5">{review.strengths.map((s, i) => <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400"><span className="text-green-500 mr-1.5">✓</span>{s}</li>)}</ul>
        </div>
      )}

      {review.quick_wins.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-1.5"><Zap className="h-3.5 w-3.5 text-yellow-500" /> Quick Wins</h4>
          <ul className="space-y-0.5">{review.quick_wins.map((w, i) => <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400"><span className="text-yellow-500 mr-1.5">⚡</span>{w}</li>)}</ul>
        </div>
      )}

      {review.ats_issues.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-1.5"><AlertTriangle className="h-3.5 w-3.5 text-orange-500" /> ATS Issues</h4>
          <ul className="space-y-0.5">{review.ats_issues.map((issue, i) => <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400"><span className="text-orange-500 mr-1.5">⚠</span>{issue}</li>)}</ul>
        </div>
      )}

      {review.missing_sections.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-1.5"><Target className="h-3.5 w-3.5 text-brand" /> Missing Sections</h4>
          <ul className="space-y-0.5">{review.missing_sections.map((s, i) => <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400"><span className="text-brand mr-1.5">+</span>{s}</li>)}</ul>
        </div>
      )}

      {review.sections.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2"><TrendingUp className="h-3.5 w-3.5 text-purple-500" /> Section Feedback</h4>
          <div className="space-y-1.5">{review.sections.map((section, i) => <SectionCard key={i} section={section} onSectionUpdate={onSectionUpdate} canApply={canApply} />)}</div>
        </div>
      )}
    </div>
  );
}
