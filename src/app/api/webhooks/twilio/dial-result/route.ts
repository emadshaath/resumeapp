import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateVoicemailTwiml } from "@/lib/twilio/twiml";

/**
 * Called after a <Dial> completes (forwarding attempt).
 * If the call wasn't answered, routes to voicemail for "both" mode.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const url = new URL(request.url);
    const callSid = url.searchParams.get("callSid") || (formData.get("CallSid") as string);
    const dialCallStatus = formData.get("DialCallStatus") as string;
    const to = formData.get("To") as string;

    // If call was answered and completed, just hang up
    if (dialCallStatus === "completed") {
      const twilio = await import("twilio");
      const twiml = new twilio.default.twiml.VoiceResponse();
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Call wasn't answered (no-answer, busy, failed, canceled)
    // Check if routing_mode is "both" — fall back to voicemail
    const admin = createAdminClient();

    let customGreetingUrl: string | null = null;
    if (to) {
      const { data: phone } = await admin
        .from("platform_phones")
        .select("routing_mode, custom_greeting_url")
        .eq("phone_number", to)
        .single();

      if (phone?.routing_mode === "both" || phone?.routing_mode === "voicemail") {
        customGreetingUrl = phone.custom_greeting_url || null;
        return new NextResponse(
          generateVoicemailTwiml(callSid, customGreetingUrl),
          { headers: { "Content-Type": "text/xml" } }
        );
      }
    }

    // Forward-only mode with no answer — just hang up
    const twilio = await import("twilio");
    const twiml = new twilio.default.twiml.VoiceResponse();
    twiml.say({ voice: "Polly.Joanna" }, "The person you are calling is not available. Please try again later.");
    twiml.hangup();
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Dial result error:", error);
    const twilio = await import("twilio");
    const twiml = new twilio.default.twiml.VoiceResponse();
    twiml.hangup();
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
