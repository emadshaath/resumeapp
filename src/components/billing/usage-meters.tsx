"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, ArrowRight } from "lucide-react";

type Tier = "free" | "pro" | "premium";

type FeatureUsage = { used: number; limit: number; resetsAt: string };

type UsagePayload = {
  tier: Tier;
  features: Record<string, FeatureUsage>;
};

const FEATURE_LABELS: Record<string, string> = {
  ai_review: "AI Reviews",
  ai_suggest: "Section Suggestions",
  ai_apply: "AI Apply Recommendations",
  ai_form_answers: "AI Form Answers",
  job_parse: "Job-URL Parses",
  linkedin_analyze: "LinkedIn Analyses",
  resume_import: "Resume Imports",
  smart_tailor: "Smart Tailor Runs",
};

// Render order — most-used features first.
const FEATURE_ORDER = [
  "ai_review",
  "ai_suggest",
  "ai_apply",
  "smart_tailor",
  "linkedin_analyze",
  "job_parse",
  "resume_import",
  "ai_form_answers",
];

function nextTierUp(tier: Tier): Tier | null {
  if (tier === "free") return "pro";
  if (tier === "pro") return "premium";
  return null;
}

export function UsageMeters() {
  const [data, setData] = useState<UsagePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/billing/usage");
        if (!res.ok) return;
        const body = (await res.json()) as UsagePayload;
        if (!cancelled) setData(body);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            This Month&apos;s AI Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-500 py-4">Loading usage…</CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const upgrade = nextTierUp(data.tier);
  const resetsAt = Object.values(data.features)[0]?.resetsAt;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          This Month&apos;s AI Usage
        </CardTitle>
        <CardDescription>
          {resetsAt
            ? `Limits reset on ${new Date(resetsAt).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
              })}.`
            : "Limits reset at the start of each month."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {FEATURE_ORDER.map((key) => {
          const usage = data.features[key];
          if (!usage) return null;
          return (
            <UsageRow
              key={key}
              label={FEATURE_LABELS[key] ?? key}
              used={usage.used}
              limit={usage.limit}
              upgradeTo={upgrade}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

function UsageRow({
  label,
  used,
  limit,
  upgradeTo,
}: {
  label: string;
  used: number;
  limit: number;
  upgradeTo: Tier | null;
}) {
  const atLimit = limit > 0 && used >= limit;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const showUpgradeCta = atLimit && upgradeTo !== null;

  // limit === 0 means the feature is not available on this tier.
  const unavailable = limit === 0;

  let barColor = "bg-brand";
  if (atLimit) barColor = "bg-red-500";
  else if (pct >= 80) barColor = "bg-yellow-500";

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className={unavailable ? "text-zinc-400" : "text-zinc-700 dark:text-zinc-300"}>
          {label}
        </span>
        <span className="text-xs text-zinc-500 tabular-nums">
          {unavailable ? (
            "Not in your plan"
          ) : (
            <>
              {used} / {limit === 999 ? "∞" : limit}
            </>
          )}
        </span>
      </div>
      {!unavailable && limit !== 999 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      )}
      {showUpgradeCta && (
        <Link
          href="/dashboard/settings?tab=billing"
          className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          Upgrade to {upgradeTo === "pro" ? "Pro" : "Premium"}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
