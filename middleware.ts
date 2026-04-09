import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost:3000";

  // Strip port for comparison
  const currentHost = hostname.replace(/:\d+$/, "");
  const rootDomain = appDomain.replace(/:\d+$/, "");

  // Handle subdomain routing (e.g., john-doe.resumedomain.com)
  if (
    currentHost !== rootDomain &&
    currentHost !== `www.${rootDomain}` &&
    currentHost !== `app.${rootDomain}` &&
    !currentHost.includes("localhost") &&
    !currentHost.includes("vercel.app")
  ) {
    // Extract the subdomain slug
    const slug = currentHost.replace(`.${rootDomain}`, "");
    if (slug && slug !== currentHost) {
      // Rewrite to the profile page
      const url = request.nextUrl.clone();
      url.pathname = `/p/${slug}${request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname}`;
      return NextResponse.rewrite(url);
    }

    // Not a recognized subdomain — check if it's a verified custom domain
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceRoleKey) {
      const admin = createSupabaseClient(supabaseUrl, serviceRoleKey);
      const { data: customDomain } = await admin
        .from("custom_domains")
        .select("profile_id")
        .eq("domain", currentHost)
        .eq("status", "verified")
        .single();

      if (customDomain) {
        // Look up the profile slug for this custom domain
        const { data: profile } = await admin
          .from("profiles")
          .select("slug")
          .eq("id", customDomain.profile_id)
          .single();

        if (profile) {
          const url = request.nextUrl.clone();
          url.pathname = `/p/${profile.slug}${request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname}`;
          return NextResponse.rewrite(url);
        }
      }
    }
  }

  // Handle www redirect
  if (currentHost === `www.${rootDomain}`) {
    const url = request.nextUrl.clone();
    url.host = appDomain;
    return NextResponse.redirect(url, 301);
  }

  // Dev mode: support ?profile=slug query param for subdomain simulation
  if (currentHost.includes("localhost") || currentHost.includes("127.0.0.1")) {
    const profileSlug = request.nextUrl.searchParams.get("profile");
    if (profileSlug) {
      const url = request.nextUrl.clone();
      url.pathname = `/p/${profileSlug}`;
      url.searchParams.delete("profile");
      return NextResponse.rewrite(url);
    }
  }

  // Handle Supabase auth session refresh + route protection
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
