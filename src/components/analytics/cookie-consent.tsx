"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CONSENT_CHANGE_EVENT,
  readConsent,
  writeConsent,
  type ConsentValue,
} from "@/lib/analytics/consent";

function subscribe(callback: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, callback);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, callback);
}

// Sentinel returned during SSR / first client render so the banner stays
// hidden until React reconciles with localStorage post-hydration.
const SSR: unique symbol = Symbol("ssr");
type Snapshot = ConsentValue | null | typeof SSR;

function getSnapshot(): Snapshot {
  return readConsent();
}

function getServerSnapshot(): Snapshot {
  return SSR;
}

export function CookieConsent() {
  const consent = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  if (consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <div className="mx-auto max-w-3xl rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            We use cookies and similar technologies (PostHog product analytics)
            to understand how rezm.ai is used and to improve the experience.
            See our{" "}
            <Link
              href="/privacy"
              className="text-brand underline underline-offset-2 hover:no-underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => writeConsent("rejected")}
            >
              Reject
            </Button>
            <Button size="sm" onClick={() => writeConsent("accepted")}>
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
