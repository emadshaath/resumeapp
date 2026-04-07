import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const redirectTo = searchParams.get("redirect_to");

  const supabase = await createClient();

  // Handle code-based exchange (OAuth, PKCE)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/dashboard/settings`);
      }
      return NextResponse.redirect(resolveRedirect(redirectTo, origin));
    }
  }

  // Handle token_hash-based verification (email confirm, password reset, magic link, email change)
  if (tokenHash && type) {
    const otpType = mapOtpType(type);
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });

    if (!error) {
      // Recovery -> settings page to set new password
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/dashboard/settings`);
      }

      // Email change -> settings page
      if (type === "email_change") {
        return NextResponse.redirect(`${origin}/dashboard/settings`);
      }

      // Signup/email confirmations -> create profile and send welcome email
      if (type === "signup" || type === "email") {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const firstName =
              user.user_metadata?.first_name ||
              user.email?.split("@")[0] || "there";
            const slug = user.user_metadata?.slug || firstName.toLowerCase();

            // Ensure profile exists (fallback if trigger didn't fire)
            const { data: existingProfile } = await supabase
              .from("profiles")
              .select("id")
              .eq("id", user.id)
              .single();

            if (!existingProfile) {
              await supabase.from("profiles").insert({
                id: user.id,
                slug,
                first_name: user.user_metadata?.first_name || firstName,
                last_name: user.user_metadata?.last_name || "",
                email: user.email!,
              });
            }

            const { sendWelcomeEmail } = await import("@/lib/resend/send");
            await sendWelcomeEmail({
              to: user.email!,
              firstName,
              slug,
            });
          }
        } catch {
          // Don't block the redirect if welcome email fails
        }
      }

      return NextResponse.redirect(resolveRedirect(redirectTo, origin));
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

/** Map our custom type strings to Supabase OTP types */
function mapOtpType(type: string): "signup" | "recovery" | "magiclink" | "email" | "email_change" {
  switch (type) {
    case "signup":
      return "signup";
    case "recovery":
      return "recovery";
    case "magiclink":
      return "magiclink";
    case "email_change":
      return "email_change";
    case "email":
      return "email";
    default:
      return "email";
  }
}

/** Safely resolve the redirect URL, falling back to /dashboard */
function resolveRedirect(redirectTo: string | null, origin: string): string {
  if (!redirectTo) {
    return `${origin}/dashboard`;
  }

  // Only allow redirects to our own origin for security
  try {
    const url = new URL(redirectTo);
    const originUrl = new URL(origin);
    if (url.hostname === originUrl.hostname) {
      return redirectTo;
    }
  } catch {
    // If redirectTo is a relative path, prefix with origin
    if (redirectTo.startsWith("/")) {
      return `${origin}${redirectTo}`;
    }
  }

  return `${origin}/dashboard`;
}
