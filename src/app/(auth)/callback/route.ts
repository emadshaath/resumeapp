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
      return NextResponse.redirect(redirectTo || `${origin}/dashboard`);
    }
  }

  // Handle token_hash-based verification (email confirm, password reset, magic link)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "recovery" | "magiclink" | "email",
    });

    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/dashboard/settings`);
      }
      // For signup confirmations, send welcome email
      if (type === "signup" || type === "email") {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { sendWelcomeEmail } = await import("@/lib/resend/send");
            const firstName =
              user.user_metadata?.first_name ||
              user.email?.split("@")[0] || "there";
            const slug = user.user_metadata?.slug || firstName.toLowerCase();

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
      return NextResponse.redirect(redirectTo || `${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
