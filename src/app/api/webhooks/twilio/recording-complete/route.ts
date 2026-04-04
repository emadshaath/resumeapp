import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Called when a voicemail recording is complete.
 * Stores the voicemail record in the database.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const url = new URL(request.url);
    const callSid = url.searchParams.get("callSid") || (formData.get("CallSid") as string);
    const recordingUrl = formData.get("RecordingUrl") as string;
    const recordingSid = formData.get("RecordingSid") as string;
    const recordingDuration = parseInt(formData.get("RecordingDuration") as string) || 0;
    const to = formData.get("To") as string;
    const from = formData.get("From") as string;
    const callerCity = formData.get("CallerCity") as string || null;
    const callerState = formData.get("CallerState") as string || null;
    const callerCountry = formData.get("CallerCountry") as string || null;

    const admin = createAdminClient();

    // Find the phone record
    const { data: phone } = await admin
      .from("platform_phones")
      .select("id, profile_id")
      .eq("phone_number", to)
      .single();

    if (!phone) {
      console.error("Recording complete: phone not found for", to);
      return new NextResponse("<Response/>", { headers: { "Content-Type": "text/xml" } });
    }

    // Store voicemail
    await admin.from("voicemails").insert({
      profile_id: phone.profile_id,
      phone_id: phone.id,
      caller_number: from || "unknown",
      caller_city: callerCity,
      caller_state: callerState,
      caller_country: callerCountry,
      call_sid: callSid,
      recording_url: recordingUrl ? `${recordingUrl}.mp3` : null,
      recording_sid: recordingSid,
      recording_duration: recordingDuration,
      transcription_status: "pending",
    });

    return new NextResponse("<Response/>", { headers: { "Content-Type": "text/xml" } });
  } catch (error) {
    console.error("Recording complete error:", error);
    return new NextResponse("<Response/>", { headers: { "Content-Type": "text/xml" } });
  }
}
