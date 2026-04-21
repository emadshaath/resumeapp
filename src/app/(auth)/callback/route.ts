import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const redirectTo = searchParams.get("redirect_to");

  try {
    const supabase = await createClient();

    // OAuth / PKCE flow
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        if (type === "recovery") {
          return NextResponse.redirect(`${origin}/dashboard/settings`);
        }
        return NextResponse.redirect(resolveRedirect(redirectTo, origin));
      }
      return NextResponse.redirect(`${origin}/login?error=link_invalid`);
    }

    // Email link flow (signup confirm, password reset, magic link, email change)
    if (tokenHash && type) {
      const otpType = mapOtpType(type);
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      });

      if (!error) {
        const destination = destinationForType(type, redirectTo, origin);
        // Run profile + welcome email after the redirect is sent so a slow
        // Resend call never delays (or strands) the confirmation redirect.
        if (type === "signup" || type === "email") {
          after(finalizeSignup(supabase));
        }
        return NextResponse.redirect(destination);
      }

      // Token was rejected. Most often this is because an email scanner
      // (Gmail, Outlook Safe Links, etc.) prefetched the link and consumed
      // the one-time token before the user clicked. If we already have a
      // valid session in the browser, treat this as success.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        return NextResponse.redirect(destinationForType(type, redirectTo, origin));
      }

      const errorCode = /expired|used/i.test(error.message) ? "link_expired" : "link_invalid";
      return NextResponse.redirect(`${origin}/login?error=${errorCode}`);
    }

    return NextResponse.redirect(`${origin}/login?error=auth`);
  } catch {
    // Any unexpected failure (Supabase outage, bad env, etc.) should still
    // land the user on the login page with a message — never a blank page.
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }
}

function destinationForType(
  type: string,
  redirectTo: string | null,
  origin: string,
): string {
  if (type === "recovery" || type === "email_change") {
    return `${origin}/dashboard/settings`;
  }
  return resolveRedirect(redirectTo, origin);
}

async function finalizeSignup(supabase: SupabaseClient): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const firstName =
      (user.user_metadata?.first_name as string | undefined) ||
      user.email?.split("@")[0] ||
      "there";
    const slug =
      (user.user_metadata?.slug as string | undefined) ||
      firstName.toLowerCase();

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existingProfile) {
      await supabase.from("profiles").insert({
        id: user.id,
        slug,
        first_name: (user.user_metadata?.first_name as string | undefined) || firstName,
        last_name: (user.user_metadata?.last_name as string | undefined) || "",
        email: user.email!,
      });
    }

    await sendWelcomeEmailSafe(user, firstName, slug);
  } catch {
    // Post-response work is best-effort: the dashboard recreates the
    // profile if it's missing, and the welcome email is non-critical.
  }
}

async function sendWelcomeEmailSafe(
  user: User,
  firstName: string,
  slug: string,
): Promise<void> {
  try {
    const { sendWelcomeEmail } = await import("@/lib/resend/send");
    await sendWelcomeEmail({
      to: user.email!,
      firstName,
      slug,
    });
  } catch {
    // Welcome email is best-effort.
  }
}

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

function resolveRedirect(redirectTo: string | null, origin: string): string {
  if (!redirectTo) {
    return `${origin}/dashboard`;
  }

  try {
    const url = new URL(redirectTo);
    const originUrl = new URL(origin);
    if (url.hostname === originUrl.hostname) {
      return redirectTo;
    }
  } catch {
    if (redirectTo.startsWith("/")) {
      return `${origin}${redirectTo}`;
    }
  }

  return `${origin}/dashboard`;
}
