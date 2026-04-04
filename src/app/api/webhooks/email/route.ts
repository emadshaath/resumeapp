import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { forwardEmail } from "@/lib/resend/send";
import { calculateSpamScore } from "@/lib/spam-filter";

// Inbound email webhook handler
// Receives forwarded emails from Cloudflare Email Routing
// or any service that POSTs parsed email data

export async function POST(request: Request) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get("authorization");
    const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET;

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Expected payload format (from Cloudflare Email Workers or similar):
    const {
      to,           // recipient email (e.g., john@resumeprofile.com)
      from,         // sender email address
      from_name,    // sender display name
      subject,      // email subject
      text,         // plain text body
      html,         // HTML body
    } = body;

    if (!to || !from) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Find the platform email record
    const { data: platformEmail } = await supabase
      .from("platform_emails")
      .select("*, profiles(id, first_name, email)")
      .eq("email_address", to.toLowerCase())
      .eq("is_active", true)
      .single();

    if (!platformEmail) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    // Calculate spam score
    const spamScore = calculateSpamScore({
      name: from_name || from,
      email: from,
      subject,
      message: text || "",
    });

    const isSpam = spamScore >= 0.6;

    // Store the email message
    await supabase.from("email_messages").insert({
      platform_email_id: platformEmail.id,
      profile_id: platformEmail.profile_id,
      from_address: from,
      from_name: from_name || null,
      subject: subject || null,
      body_text: text || null,
      body_html: html || null,
      is_spam: isSpam,
      spam_score: spamScore,
    });

    // If routing mode is forward and not spam, forward to personal email
    if (platformEmail.routing_mode === "forward" && platformEmail.forward_to && !isSpam) {
      try {
        await forwardEmail({
          to: platformEmail.forward_to,
          from: from,
          subject: subject || "(no subject)",
          html: html || `<pre>${text || ""}</pre>`,
          text: text,
          replyTo: from,
        });
      } catch (forwardError) {
        console.error("Failed to forward email:", forwardError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Inbound email webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
