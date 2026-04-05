import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import crypto from "crypto";

const trackSchema = z.object({
  profile_id: z.string().uuid(),
  referrer: z.string().max(2000).optional(),
  utm_source: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
});

function hashIP(ip: string): string {
  const dailySalt = new Date().toISOString().split("T")[0];
  return crypto.createHash("sha256").update(`${ip}:${dailySalt}`).digest("hex").slice(0, 16);
}

function generateVisitorId(ip: string, ua: string): string {
  const dailySalt = new Date().toISOString().split("T")[0];
  return crypto.createHash("sha256").update(`${ip}:${ua}:${dailySalt}`).digest("hex").slice(0, 16);
}

function parseDeviceType(ua: string): string {
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
    if (/ipad|tablet/i.test(ua)) return "tablet";
    return "mobile";
  }
  return "desktop";
}

function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return "Safari";
  if (/opera|opr\//i.test(ua)) return "Opera";
  return "Other";
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    const userAgent = request.headers.get("user-agent") || "";

    // Rate limit per IP: 30 tracks per minute (prevents abuse)
    const { success: rateLimitOk } = rateLimit(`track:${ip}`, 30, 60 * 1000);
    if (!rateLimitOk) {
      return NextResponse.json({ ok: true }); // Silent fail — don't reveal rate limiting
    }

    const body = await request.json();
    const parsed = trackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: true }); // Silent fail
    }

    const { profile_id, referrer, utm_source, utm_medium, utm_campaign } = parsed.data;

    const visitorId = generateVisitorId(ip, userAgent);
    const ipHash = hashIP(ip);
    const deviceType = parseDeviceType(userAgent);
    const browser = parseBrowser(userAgent);

    // Get country from Vercel/Cloudflare geo headers
    const country = request.headers.get("x-vercel-ip-country")
      || request.headers.get("cf-ipcountry")
      || null;

    const admin = createAdminClient();
    await admin.from("page_views").insert({
      profile_id,
      visitor_id: visitorId,
      path: "/",
      referrer: referrer || null,
      country,
      device_type: deviceType,
      browser,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      ip_hash: ipHash,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Analytics track error:", error);
    return NextResponse.json({ ok: true }); // Always return ok — tracking should never break UX
  }
}
