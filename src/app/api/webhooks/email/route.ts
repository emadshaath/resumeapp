import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend } from "@/lib/resend/client";
import { forwardEmail } from "@/lib/resend/send";
import { calculateSpamScore } from "@/lib/spam-filter";

// Inbound email webhook handler
// Receives inbound email events from Resend

// Parse "Name <email>" format into separate parts
function parseEmailAddress(raw: string): { email: string; name: string | null } {
  const match = raw.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim().toLowerCase() };
  }
  return { name: null, email: raw.trim().toLowerCase() };
}

export async function POST(request: Request) {
  try {
    // Resend uses Svix for webhook signing. For now we verify using the
    // webhook secret as a shared-secret fallback, but also allow Resend
    // webhooks through (they include svix-id header).
    const svixId = request.headers.get("svix-id");
    const authHeader = request.headers.get("authorization");
    const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET;

    // Allow if: Resend webhook (has svix-id) OR valid Bearer token
    if (!svixId && webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    let to: string;
    let from: string;
    let fromName: string | null = null;
    let subject: string | null = null;
    let text: string | null = null;
    let html: string | null = null;

    // Handle Resend inbound webhook format
    if (body.type === "email.received" && body.data?.email_id) {
      const emailId = body.data.email_id;
      to = (body.data.to?.[0] || "").toLowerCase();
      const parsed = parseEmailAddress(body.data.from || "");
      from = parsed.email;
      fromName = parsed.name;
      subject = body.data.subject || null;

      // Fetch full email content from Resend API
      const resend = getResend();
      const { data: fullEmail, error: fetchError } = await resend.emails.receiving.get(emailId);

      if (fetchError) {
        console.error("Failed to fetch inbound email from Resend:", fetchError);
      } else if (fullEmail) {
        html = fullEmail.html ?? null;
        text = fullEmail.text ?? null;
      }
    } else {
      // Legacy format (direct POST with email fields)
      to = (body.to || "").toLowerCase();
      from = body.from || "";
      fromName = body.from_name || null;
      subject = body.subject || null;
      text = body.text || null;
      html = body.html || null;
    }

    if (!to || !from) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Find the platform email record
    const { data: platformEmail } = await supabase
      .from("platform_emails")
      .select("*, profiles(id, first_name, email)")
      .eq("email_address", to)
      .eq("is_active", true)
      .single();

    if (!platformEmail) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    // Calculate spam score
    const spamScore = calculateSpamScore({
      name: fromName || from,
      email: from,
      subject: subject || "",
      message: text || "",
    });

    const isSpam = spamScore >= 0.6;

    // Store the email message
    await supabase.from("email_messages").insert({
      platform_email_id: platformEmail.id,
      profile_id: platformEmail.profile_id,
      from_address: from,
      from_name: fromName || null,
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
          text: text || undefined,
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
