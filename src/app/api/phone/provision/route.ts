import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTwilioClient } from "@/lib/twilio/client";
import { getEffectiveTier } from "@/lib/stripe/feature-gate";
import type { Tier } from "@/types/database";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Check tier — Premium only
    const { data: profile } = await admin
      .from("profiles")
      .select("id, tier, tier_override, slug, first_name, last_name")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const effectiveTier = getEffectiveTier(profile.tier as Tier, profile.tier_override as Tier | null);
    if (effectiveTier !== "premium") {
      return NextResponse.json(
        { error: "Phone numbers are available on the Premium plan." },
        { status: 403 }
      );
    }

    // Check if already has a phone
    const { data: existing } = await admin
      .from("platform_phones")
      .select("id, phone_number")
      .eq("profile_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "You already have a phone number.", phone_number: existing.phone_number },
        { status: 409 }
      );
    }

    // Provision a phone number from Twilio
    const twilioClient = getTwilioClient();
    const country = process.env.TWILIO_PHONE_COUNTRY || "US";

    // Search for available local numbers
    const available = await twilioClient.availablePhoneNumbers(country).local.list({
      limit: 1,
      voiceEnabled: true,
      smsEnabled: false,
    });

    if (available.length === 0) {
      return NextResponse.json(
        { error: "No phone numbers available. Please try again later." },
        { status: 503 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000";

    // Purchase the number and configure webhooks
    const purchased = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: available[0].phoneNumber,
      friendlyName: `rezm.ai - ${profile.first_name} ${profile.last_name}`,
      voiceUrl: `${baseUrl}/api/webhooks/twilio/voice`,
      voiceMethod: "POST",
      statusCallback: `${baseUrl}/api/webhooks/twilio/status`,
      statusCallbackMethod: "POST",
    });

    // Store in database
    const { error: insertError } = await admin.from("platform_phones").insert({
      profile_id: user.id,
      phone_number: purchased.phoneNumber,
      twilio_sid: purchased.sid,
      friendly_name: purchased.friendlyName,
      routing_mode: "voicemail",
      forward_to: null,
    });

    if (insertError) {
      // Attempt to release the number if DB insert fails
      try { await twilioClient.incomingPhoneNumbers(purchased.sid).remove(); } catch {}
      return NextResponse.json({ error: "Failed to save phone number." }, { status: 500 });
    }

    return NextResponse.json({
      phone_number: purchased.phoneNumber,
      message: "Phone number provisioned successfully.",
    });
  } catch (error) {
    console.error("Phone provision error:", error);
    return NextResponse.json({ error: "Failed to provision phone number." }, { status: 500 });
  }
}

// Release phone number
export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: phone } = await admin
      .from("platform_phones")
      .select("*")
      .eq("profile_id", user.id)
      .single();

    if (!phone) {
      return NextResponse.json({ error: "No phone number to release." }, { status: 404 });
    }

    // Release from Twilio
    try {
      const twilioClient = getTwilioClient();
      await twilioClient.incomingPhoneNumbers(phone.twilio_sid).remove();
    } catch (err) {
      console.error("Twilio release error:", err);
    }

    // Delete from DB (cascading will clean up voicemails)
    await admin.from("platform_phones").delete().eq("id", phone.id);

    return NextResponse.json({ message: "Phone number released." });
  } catch (error) {
    console.error("Phone release error:", error);
    return NextResponse.json({ error: "Failed to release phone number." }, { status: 500 });
  }
}
