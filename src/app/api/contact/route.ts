import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { calculateSpamScore } from "@/lib/spam-filter";
import { sendContactNotification } from "@/lib/resend/send";
import { z } from "zod";

const contactSchema = z.object({
  profile_id: z.string().uuid(),
  sender_name: z.string().min(1).max(100),
  sender_email: z.string().email().max(255),
  subject: z.string().max(200).optional(),
  message: z.string().min(1).max(5000),
  turnstile_token: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid form data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { profile_id, sender_name, sender_email, subject, message, turnstile_token } =
      parsed.data;

    // Rate limit by IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const { success: rateLimitOk, remaining } = rateLimit(
      `contact:${ip}`,
      10, // 10 submissions per window
      60 * 60 * 1000 // 1 hour window
    );

    if (!rateLimitOk) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        { status: 429 }
      );
    }

    // Also rate limit per profile (prevent flooding a single user)
    const { success: profileRateLimitOk } = rateLimit(
      `contact:profile:${profile_id}`,
      50, // 50 submissions per profile per window
      60 * 60 * 1000
    );

    if (!profileRateLimitOk) {
      return NextResponse.json(
        { error: "This profile is receiving too many messages. Please try again later." },
        { status: 429 }
      );
    }

    // Verify Turnstile CAPTCHA if token provided
    let captchaPassed = false;
    if (turnstile_token && process.env.TURNSTILE_SECRET_KEY) {
      const verifyResponse = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret: process.env.TURNSTILE_SECRET_KEY,
            response: turnstile_token,
          }),
        }
      );
      const verifyResult = await verifyResponse.json();
      captchaPassed = verifyResult.success === true;
    } else {
      // If no Turnstile configured, consider captcha as not applicable
      captchaPassed = true;
    }

    // Calculate spam score
    const spamScore = calculateSpamScore({
      name: sender_name,
      email: sender_email,
      subject,
      message,
    });

    const isSpam = spamScore >= 0.6 || !captchaPassed;

    // Store the submission
    const supabase = createAdminClient();

    // Verify the profile exists and is published
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, is_published, first_name, email")
      .eq("id", profile_id)
      .eq("is_published", true)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { error: insertError } = await supabase
      .from("contact_submissions")
      .insert({
        profile_id,
        sender_name,
        sender_email,
        subject: subject || null,
        message,
        is_spam: isSpam,
        spam_score: spamScore,
        ip_address: ip,
        user_agent: request.headers.get("user-agent") || null,
        captcha_passed: captchaPassed,
      });

    if (insertError) {
      console.error("Contact insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    // Send email notification to profile owner (non-spam only)
    if (!isSpam && profile.email) {
      try {
        await sendContactNotification({
          to: profile.email,
          profileFirstName: profile.first_name,
          senderName: sender_name,
          senderEmail: sender_email,
          subject,
          message,
        });
      } catch (emailError) {
        // Don't fail the request if notification fails
        console.error("Contact notification email error:", emailError);
      }
    }

    return NextResponse.json(
      { success: true, message: "Message sent successfully" },
      {
        status: 200,
        headers: {
          "X-RateLimit-Remaining": remaining.toString(),
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
