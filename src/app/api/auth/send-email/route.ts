import { NextResponse } from "next/server";
import {
  sendConfirmEmail,
  sendPasswordResetEmail,
  sendMagicLinkEmail,
  sendEmailChangedEmail,
  sendWelcomeEmail,
} from "@/lib/resend/send";
import { createAdminClient } from "@/lib/supabase/admin";

// Supabase Auth Hook: Send Email
// Configure in Supabase Dashboard > Auth > Hooks > Send Email
// Set the hook URL to: https://yourdomain.com/api/auth/send-email
// Set the hook secret in AUTH_HOOK_SECRET env var

export async function POST(request: Request) {
  try {
    // Verify the hook secret
    const authHeader = request.headers.get("authorization");
    const hookSecret = process.env.AUTH_HOOK_SECRET;

    if (hookSecret && authHeader !== `Bearer ${hookSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();

    // Supabase Auth Hook payload structure:
    // { user, email_data: { token, token_hash, redirect_to, email_action_type, ... } }
    const { user, email_data } = payload;

    if (!user || !email_data) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const email = user.email;
    const firstName =
      user.user_metadata?.first_name ||
      user.user_metadata?.full_name?.split(" ")[0] ||
      email.split("@")[0];

    const emailActionType = email_data.email_action_type;
    const tokenHash = email_data.token_hash;
    const redirectTo = email_data.redirect_to || process.env.NEXT_PUBLIC_APP_URL;

    // Build confirmation/action URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rezm.ai";
    const actionUrl = `${baseUrl}/callback?token_hash=${tokenHash}&type=${emailActionType}&redirect_to=${encodeURIComponent(redirectTo)}`;

    switch (emailActionType) {
      case "signup":
      case "email": {
        // Email confirmation for new signup
        await sendConfirmEmail({
          to: email,
          firstName,
          confirmUrl: actionUrl,
        });
        break;
      }

      case "recovery": {
        // Password reset
        await sendPasswordResetEmail({
          to: email,
          firstName,
          resetUrl: actionUrl,
        });
        break;
      }

      case "magiclink": {
        // Magic link sign-in
        await sendMagicLinkEmail({
          to: email,
          magicLinkUrl: actionUrl,
        });
        break;
      }

      case "email_change": {
        // Email change confirmation
        const newEmail = email_data.new_email || email;
        await sendEmailChangedEmail({
          to: newEmail,
          firstName,
          newEmail,
          confirmUrl: actionUrl,
        });
        break;
      }

      case "invite": {
        // Invitation (same as confirm for our purposes)
        await sendConfirmEmail({
          to: email,
          firstName,
          confirmUrl: actionUrl,
        });
        break;
      }

      default: {
        console.warn(`Unknown email action type: ${emailActionType}`);
        // Fallback: send a generic confirm email
        await sendConfirmEmail({
          to: email,
          firstName,
          confirmUrl: actionUrl,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Auth email hook error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
