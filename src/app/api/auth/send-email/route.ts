import { NextResponse } from "next/server";
import {
  sendConfirmEmail,
  sendPasswordResetEmail,
  sendMagicLinkEmail,
  sendEmailChangedEmail,
} from "@/lib/resend/send";

// Supabase Auth Hook: Send Email (fallback)
// The primary email flow uses admin.generateLink() in server actions.
// This hook acts as a safety net for any Supabase-initiated emails
// (e.g., re-confirmations triggered by Supabase internals).
//
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
    const redirectTo = email_data.redirect_to || "";

    // Build confirmation/action URL using proper URL construction
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rezm.ai";
    const actionUrl = new URL("/callback", baseUrl);
    actionUrl.searchParams.set("token_hash", tokenHash);
    actionUrl.searchParams.set("type", emailActionType);
    if (redirectTo) {
      actionUrl.searchParams.set("redirect_to", redirectTo);
    }
    const actionUrlStr = actionUrl.toString();

    switch (emailActionType) {
      case "signup":
      case "email": {
        await sendConfirmEmail({
          to: email,
          firstName,
          confirmUrl: actionUrlStr,
        });
        break;
      }

      case "recovery": {
        await sendPasswordResetEmail({
          to: email,
          firstName,
          resetUrl: actionUrlStr,
        });
        break;
      }

      case "magiclink": {
        await sendMagicLinkEmail({
          to: email,
          magicLinkUrl: actionUrlStr,
        });
        break;
      }

      case "email_change": {
        const newEmail = email_data.new_email || email;
        await sendEmailChangedEmail({
          to: newEmail,
          firstName,
          newEmail,
          confirmUrl: actionUrlStr,
        });
        break;
      }

      case "invite": {
        await sendConfirmEmail({
          to: email,
          firstName,
          confirmUrl: actionUrlStr,
        });
        break;
      }

      default: {
        console.warn(`Unknown email action type: ${emailActionType}`);
        await sendConfirmEmail({
          to: email,
          firstName,
          confirmUrl: actionUrlStr,
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
