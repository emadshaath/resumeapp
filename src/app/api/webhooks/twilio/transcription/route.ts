import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Called when Twilio finishes transcribing a voicemail recording.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const url = new URL(request.url);
    const callSid = url.searchParams.get("callSid") || (formData.get("CallSid") as string);
    const transcriptionText = formData.get("TranscriptionText") as string || "";
    const transcriptionStatus = formData.get("TranscriptionStatus") as string;

    const admin = createAdminClient();

    const status = transcriptionStatus === "completed" ? "completed" : "failed";

    await admin
      .from("voicemails")
      .update({
        transcription: transcriptionText || null,
        transcription_status: status,
      })
      .eq("call_sid", callSid);

    return new NextResponse("<Response/>", { headers: { "Content-Type": "text/xml" } });
  } catch (error) {
    console.error("Transcription webhook error:", error);
    return new NextResponse("<Response/>", { headers: { "Content-Type": "text/xml" } });
  }
}
