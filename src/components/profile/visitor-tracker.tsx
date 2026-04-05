"use client";

import { useEffect } from "react";

interface VisitorTrackerProps {
  profileId: string;
}

export function VisitorTracker({ profileId }: VisitorTrackerProps) {
  useEffect(() => {
    // Don't track in development unless explicitly wanted
    const url = new URL(window.location.href);
    const referrer = document.referrer || undefined;
    const utmSource = url.searchParams.get("utm_source") || undefined;
    const utmMedium = url.searchParams.get("utm_medium") || undefined;
    const utmCampaign = url.searchParams.get("utm_campaign") || undefined;

    // Fire and forget — don't await
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: profileId,
        referrer,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      }),
    }).catch(() => {
      // Silent fail — tracking should never affect user experience
    });
  }, [profileId]);

  return null;
}
