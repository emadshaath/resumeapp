import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateVoicemailTwiml } from "@/lib/twilio/twiml";
import twilio from "twilio";

const VoiceResponse = twilio.twiml.VoiceResponse;

/**
 * Called after the owner presses a digit during call screening.
 * 1 = accept (connect), 2 = send to voicemail.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const url = new URL(request.url);
    const callSid = url.searchParams.get("callSid") || (formData.get("CallSid") as string);
    const digits = formData.get("Digits") as string;

    if (digits === "1") {
      // Owner accepted — empty TwiML continues the <Dial> connection
      const twiml = new VoiceResponse();
      return new NextResponse(twiml.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Owner rejected or pressed 2 — look up phone for custom greeting
    const admin = createAdminClient();
    const to = formData.get("To") as string;

    let customGreetingUrl: string | null = null;
    if (to) {
      const { data: phone } = await admin
        .from("platform_phones")
        .select("custom_greeting_url")
        .eq("phone_number", to)
        .single();
      customGreetingUrl = phone?.custom_greeting_url || null;
    }

    // Hang up on the owner's side, caller goes to voicemail
    const twiml = new VoiceResponse();
    twiml.hangup();

    return new NextResponse(
      generateVoicemailTwiml(callSid, customGreetingUrl),
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch (error) {
    console.error("Screen result error:", error);
    const twiml = new VoiceResponse();
    twiml.hangup();
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
