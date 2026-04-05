import { NextResponse } from "next/server";
import { generateScreeningTwiml } from "@/lib/twilio/twiml";

/**
 * Called when the forwarded call connects — plays the screening prompt to the owner.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const url = new URL(request.url);
    const callSid = url.searchParams.get("callSid") || (formData.get("CallSid") as string);
    const callerNumber = formData.get("From") as string || "unknown";

    return new NextResponse(generateScreeningTwiml(callerNumber, callSid), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Screen webhook error:", error);
    const twilio = await import("twilio");
    const twiml = new twilio.default.twiml.VoiceResponse();
    twiml.hangup();
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
