"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import type { FullReviewResult, SectionReview } from "@/lib/claude/schemas";

interface SavedReview {
  id: string;
  overall_score: number | null;
  ats_score: number | null;
  recommendations: FullReviewResult;
  created_at: string;
}

function ScoreRing({ score, label, size = "lg" }: { score: number; label: string; size?: "lg" | "sm" }) {
  const radius = size === "lg" ? 54 : 36;
  const stroke = size === "lg" ? 8 : 6;
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
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-zinc-200 dark:text-zinc-700"
          />
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={color}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${size === "lg" ? "text-2xl" : "text-lg"}`}>{score}</span>
        </div>
      </div>
      <span className={`text-zinc-500 ${size === "lg" ? "text-sm" : "text-xs"}`}>{label}</span>
    </div>
  );
}

function SectionCard({ section }: { section: SectionReview }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="bg-zinc-50 dark:bg-zinc-900">
      <CardContent className="p-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <span className={`text-sm font-bold ${
                section.score >= 75 ? "text-green-600" :
                section.score >= 60 ? "text-yellow-600" :
                section.score >= 40 ? "text-orange-600" : "text-red-600"
              }`}>
                {section.score}
              </span>
            </div>
            <div>
              <p className="font-medium text-sm">{section.section_name}</p>
              <Badge variant="secondary" className="text-xs mt-0.5">{section.section_type}</Badge>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
        </button>
        {expanded && (
          <div className="mt-4 space-y-3 border-t border-zinc-200 dark:border-zinc-700 pt-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{section.feedback}</p>
            {section.recommendations.length > 0 && (
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">Recommendations</p>
                <ul className="space-y-1">
                  {section.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                      <span className="text-blue-500 mt-1 shrink-0">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewResults({ review }: { review: FullReviewResult }) {
  return (
    <div className="space-y-6">
      {/* Scores */}
      <div className="flex justify-center gap-12">
        <ScoreRing score={review.overall_score} label="Overall Score" />
        <ScoreRing score={review.ats_score} label="ATS Score" />
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{review.summary}</p>
        </CardContent>
      </Card>

      {/* Strengths */}
      {review.strengths.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-500" /> Strengths
          </h3>
          <ul className="space-y-1">
            {review.strengths.map((s, i) => (
              <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                <span className="text-green-500 mt-0.5 shrink-0">✓</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Wins */}
      {review.quick_wins.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-yellow-500" /> Quick Wins
          </h3>
          <ul className="space-y-1">
            {review.quick_wins.map((w, i) => (
              <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5 shrink-0">⚡</span> {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ATS Issues */}
      {review.ats_issues.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" /> ATS Compatibility Issues
          </h3>
          <ul className="space-y-1">
            {review.ats_issues.map((issue, i) => (
              <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                <span className="text-orange-500 mt-0.5 shrink-0">⚠</span> {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing Sections */}
      {review.missing_sections.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-blue-500" /> Recommended Missing Sections
          </h3>
          <ul className="space-y-1">
            {review.missing_sections.map((s, i) => (
              <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                <span className="text-blue-500 mt-0.5 shrink-0">+</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Section-by-Section */}
      {review.sections.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-purple-500" /> Section-by-Section Feedback
          </h3>
          <div className="space-y-2">
            {review.sections.map((section, i) => (
              <SectionCard key={i} section={section} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AIReviewPage() {
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
    loadHistory();
  }, [loadHistory]);

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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Resume Review</h1>
          <p className="text-zinc-500 mt-1">Get AI-powered analysis with actionable recommendations.</p>
        </div>
        <Button onClick={runReview} disabled={loading} className="shrink-0 self-start">
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Run AI Review
            </>
          )}
        </Button>
      </div>

      {usage && (
        <p className="text-xs text-zinc-500">
          {usage.reviews_used} of {usage.reviews_limit} review{usage.reviews_limit > 1 ? "s" : ""} used this month
        </p>
      )}

      {error && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
          <CardContent className="p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="h-10 w-10 text-zinc-400 animate-spin mb-4" />
            <p className="text-sm text-zinc-500">Analyzing your resume with AI...</p>
            <p className="text-xs text-zinc-400 mt-1">This may take 15-30 seconds</p>
          </CardContent>
        </Card>
      )}

      {!loading && review && (
        <>
          {viewingHistory && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Clock className="h-4 w-4" />
              Viewing historical review from {new Date(history.find(h => h.id === viewingHistory)?.created_at || "").toLocaleDateString()}
              <Button variant="ghost" size="sm" onClick={() => { setViewingHistory(null); setReview(null); }}>
                Clear
              </Button>
            </div>
          )}
          <ReviewResults review={review} />
        </>
      )}

      {!loading && !review && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Sparkles className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium">Ready to Review</h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-md text-center">
              Click &quot;Run AI Review&quot; to get a comprehensive analysis of your resume
              including scores, section-by-section feedback, and ATS compatibility.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Review History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-zinc-400" /> Review History
          </h2>
          <div className="space-y-2">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => viewHistorical(item)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  viewingHistory === item.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <span className="font-medium">Score: {item.overall_score}</span>
                      <span className="text-zinc-400 mx-2">|</span>
                      <span className="text-zinc-500">ATS: {item.ats_score}</span>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(item.created_at).toLocaleDateString()} at{" "}
                    {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {historyLoading && history.length === 0 && (
        <p className="text-sm text-zinc-400 text-center">Loading review history...</p>
      )}
    </div>
  );
}
