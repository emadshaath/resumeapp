import { NextResponse } from "next/server";

/**
 * Twilio call status callback — receives updates on call progress.
 * Currently a no-op; can be extended for call logging/analytics.
 */
export async function POST() {
  return new NextResponse("<Response/>", { headers: { "Content-Type": "text/xml" } });
}
