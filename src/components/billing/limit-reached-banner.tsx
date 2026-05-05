"use client";

import Link from "next/link";
import { AlertCircle, Clock, ArrowRight } from "lucide-react";

export type LimitErrorCode = "monthly_cap" | "throttle";

export type LimitError = {
  message: string;
  code?: LimitErrorCode;
  upgradeTo?: "pro" | "premium";
};

/**
 * Convert a fetch response body from any AI route into a LimitError.
 * Server returns { error, code?, upgradeTo? } — this normalizes it.
 */
export function parseAIError(data: unknown, fallback = "Something went wrong."): LimitError {
  if (!data || typeof data !== "object") return { message: fallback };
  const d = data as Record<string, unknown>;
  return {
    message: typeof d.error === "string" ? d.error : fallback,
    code: d.code === "monthly_cap" || d.code === "throttle" ? d.code : undefined,
    upgradeTo:
      d.upgradeTo === "pro" || d.upgradeTo === "premium" ? d.upgradeTo : undefined,
  };
}

/**
 * Inline banner for AI-route errors. Renders three modes:
 *  - throttle      → soft yellow "wait a moment" (no upgrade CTA)
 *  - monthly_cap   → red banner + "Upgrade to {tier}" link if upgradeTo is set
 *  - generic error → red banner with the message only
 *
 * Renders nothing when error is null.
 */
export function LimitReachedBanner({ error }: { error: LimitError | null }) {
  if (!error) return null;

  if (error.code === "throttle") {
    return (
      <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 flex items-start gap-2">
        <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span>{error.message}</span>
      </div>
    );
  }

  if (error.code === "monthly_cap" && error.upgradeTo) {
    const tierLabel = error.upgradeTo === "pro" ? "Pro" : "Premium";
    return (
      <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{error.message}</span>
        </div>
        <Link
          href="/dashboard/settings?tab=billing"
          className="mt-2 inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
        >
          Upgrade to {tierLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300 flex items-start gap-2">
      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <span>{error.message}</span>
    </div>
  );
}
