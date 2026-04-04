import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateForwardTwiml, generateVoicemailTwiml, generateRejectTwiml } from "@/lib/twilio/twiml";

/**
 * Twilio Voice Webhook — called when an incoming call arrives.
 * Looks up the dialed number, checks routing mode, and generates TwiML.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const to = formData.get("To") as string;
    const callSid = formData.get("CallSid") as string;

    if (!to || !callSid) {
      return twimlResponse(generateRejectTwiml("rejected"));
    }

    const admin = createAdminClient();

    // Find the phone record for this number
    const { data: phone } = await admin
      .from("platform_phones")
      .select("*, profiles!inner(first_name, last_name)")
      .eq("phone_number", to)
      .eq("is_active", true)
      .single();

    if (!phone) {
      return twimlResponse(generateRejectTwiml("rejected"));
    }

    const routingMode = phone.routing_mode as string;

    // Forward mode: dial the owner's personal number with call screening
    if (routingMode === "forward" && phone.forward_to) {
      return twimlResponse(generateForwardTwiml(phone.forward_to, callSid, true));
    }

    // Both mode: try forwarding first, voicemail on no-answer handled by dial-result
    if (routingMode === "both" && phone.forward_to) {
      return twimlResponse(generateForwardTwiml(phone.forward_to, callSid, true));
    }

    // Voicemail mode: go straight to voicemail
    return twimlResponse(generateVoicemailTwiml(callSid, phone.custom_greeting_url));
  } catch (error) {
    console.error("Voice webhook error:", error);
    return twimlResponse(generateRejectTwiml("busy"));
  }
}

function twimlResponse(twiml: string): NextResponse {
  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}
