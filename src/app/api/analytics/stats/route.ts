import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveTier } from "@/lib/stripe/feature-gate";
import type { Tier } from "@/types/database";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get profile tier
    const { data: profile } = await admin
      .from("profiles")
      .select("id, tier, tier_override")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const effectiveTier = getEffectiveTier(profile.tier as Tier, profile.tier_override as Tier | null);

    const url = new URL(request.url);
    const days = Math.min(parseInt(url.searchParams.get("days") || "30"), 365);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Total views
    const { count: totalViews } = await admin
      .from("page_views")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .gte("viewed_at", since.toISOString());

    // Unique visitors (distinct visitor_id)
    const { data: uniqueData } = await admin
      .from("page_views")
      .select("visitor_id")
      .eq("profile_id", user.id)
      .gte("viewed_at", since.toISOString());

    const uniqueVisitors = new Set(uniqueData?.map((r) => r.visitor_id).filter(Boolean)).size;

    // Free tier: only total views and unique visitors
    if (effectiveTier === "free") {
      return NextResponse.json({
        total_views: totalViews || 0,
        unique_visitors: uniqueVisitors,
        tier: "free",
      });
    }

    // Pro+ tier: full analytics

    // Views per day for chart
    const { data: dailyViews } = await admin
      .from("page_views")
      .select("viewed_at")
      .eq("profile_id", user.id)
      .gte("viewed_at", since.toISOString())
      .order("viewed_at", { ascending: true });

    const viewsByDay: Record<string, number> = {};
    for (let d = 0; d < days; d++) {
      const date = new Date(since);
      date.setDate(date.getDate() + d);
      viewsByDay[date.toISOString().split("T")[0]] = 0;
    }
    dailyViews?.forEach((v) => {
      const day = new Date(v.viewed_at).toISOString().split("T")[0];
      viewsByDay[day] = (viewsByDay[day] || 0) + 1;
    });

    const dailyChart = Object.entries(viewsByDay).map(([date, views]) => ({ date, views }));

    // Top referrers
    const { data: referrerData } = await admin
      .from("page_views")
      .select("referrer")
      .eq("profile_id", user.id)
      .gte("viewed_at", since.toISOString())
      .not("referrer", "is", null);

    const referrerCounts: Record<string, number> = {};
    referrerData?.forEach((r) => {
      if (r.referrer) {
        try {
          const host = new URL(r.referrer).hostname;
          referrerCounts[host] = (referrerCounts[host] || 0) + 1;
        } catch {
          referrerCounts[r.referrer] = (referrerCounts[r.referrer] || 0) + 1;
        }
      }
    });
    const topReferrers = Object.entries(referrerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([source, count]) => ({ source, count }));

    // Device breakdown
    const { data: deviceData } = await admin
      .from("page_views")
      .select("device_type")
      .eq("profile_id", user.id)
      .gte("viewed_at", since.toISOString());

    const deviceCounts: Record<string, number> = {};
    deviceData?.forEach((d) => {
      const type = d.device_type || "unknown";
      deviceCounts[type] = (deviceCounts[type] || 0) + 1;
    });
    const devices = Object.entries(deviceCounts).map(([device, count]) => ({ device, count }));

    // Browser breakdown
    const { data: browserData } = await admin
      .from("page_views")
      .select("browser")
      .eq("profile_id", user.id)
      .gte("viewed_at", since.toISOString());

    const browserCounts: Record<string, number> = {};
    browserData?.forEach((b) => {
      const name = b.browser || "Unknown";
      browserCounts[name] = (browserCounts[name] || 0) + 1;
    });
    const browsers = Object.entries(browserCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([browser, count]) => ({ browser, count }));

    // Country breakdown
    const { data: countryData } = await admin
      .from("page_views")
      .select("country")
      .eq("profile_id", user.id)
      .gte("viewed_at", since.toISOString())
      .not("country", "is", null);

    const countryCounts: Record<string, number> = {};
    countryData?.forEach((c) => {
      if (c.country) {
        countryCounts[c.country] = (countryCounts[c.country] || 0) + 1;
      }
    });
    const countries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([country, count]) => ({ country, count }));

    // UTM campaigns
    const { data: utmData } = await admin
      .from("page_views")
      .select("utm_source, utm_medium, utm_campaign")
      .eq("profile_id", user.id)
      .gte("viewed_at", since.toISOString())
      .not("utm_source", "is", null);

    const utmCounts: Record<string, number> = {};
    utmData?.forEach((u) => {
      const key = [u.utm_source, u.utm_medium, u.utm_campaign].filter(Boolean).join(" / ");
      if (key) utmCounts[key] = (utmCounts[key] || 0) + 1;
    });
    const campaigns = Object.entries(utmCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([campaign, count]) => ({ campaign, count }));

    return NextResponse.json({
      total_views: totalViews || 0,
      unique_visitors: uniqueVisitors,
      daily_chart: dailyChart,
      top_referrers: topReferrers,
      devices,
      browsers,
      countries,
      campaigns,
      tier: effectiveTier,
    });
  } catch (error) {
    console.error("Analytics stats error:", error);
    return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 });
  }
}
