"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CONSENT_CHANGE_EVENT,
  readConsent,
  type ConsentValue,
} from "@/lib/analytics/consent";
import { createClient } from "@/lib/supabase/client";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

type PostHog = typeof import("posthog-js").default;

let posthogPromise: Promise<PostHog | null> | null = null;
let currentConsent: ConsentValue | null = null;

async function loadPostHog(): Promise<PostHog | null> {
  if (!POSTHOG_KEY) return null;
  if (!posthogPromise) {
    posthogPromise = import("posthog-js").then((mod) => {
      const ph = mod.default;
      ph.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: false,
        capture_pageleave: true,
        persistence: "localStorage+cookie",
        autocapture: true,
        loaded: (instance) => {
          instance.opt_in_capturing();
        },
      });
      return ph;
    });
  }
  return posthogPromise;
}

async function shutdownPostHog(): Promise<void> {
  if (!posthogPromise) return;
  const ph = await posthogPromise;
  if (!ph) return;
  ph.opt_out_capturing();
  ph.reset(true);
}

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (currentConsent !== "accepted" || !POSTHOG_KEY) return;
    let cancelled = false;
    void loadPostHog().then((ph) => {
      if (cancelled || !ph) return;
      const qs = searchParams?.toString();
      const url =
        window.location.origin + pathname + (qs ? `?${qs}` : "");
      ph.capture("$pageview", { $current_url: url });
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, searchParams]);

  return null;
}

function ConsentBoot() {
  useEffect(() => {
    if (!POSTHOG_KEY) return;

    const apply = async (value: ConsentValue | null) => {
      currentConsent = value;
      if (value === "accepted") {
        await loadPostHog();
      } else if (value === "rejected") {
        await shutdownPostHog();
      }
    };

    void apply(readConsent());

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ConsentValue | null>).detail ?? null;
      void apply(detail);
    };
    window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
  }, []);

  return null;
}

function UserIdentifier() {
  const identifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    const supabase = createClient();

    const identify = async () => {
      if (currentConsent !== "accepted") return;
      const { data } = await supabase.auth.getUser();
      const ph = await loadPostHog();
      if (!ph) return;
      if (data.user && identifiedRef.current !== data.user.id) {
        ph.identify(data.user.id, { email: data.user.email });
        identifiedRef.current = data.user.id;
      } else if (!data.user && identifiedRef.current) {
        ph.reset();
        identifiedRef.current = null;
      }
    };

    void identify();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void identify();
    });

    const onConsent = () => void identify();
    window.addEventListener(CONSENT_CHANGE_EVENT, onConsent);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener(CONSENT_CHANGE_EVENT, onConsent);
    };
  }, []);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ConsentBoot />
      <UserIdentifier />
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </>
  );
}
