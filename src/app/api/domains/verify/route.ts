import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyDomainInVercel,
  getDomainFromVercel,
  isVercelConfigured,
} from "@/lib/vercel/client";
import dns from "dns/promises";

/**
 * POST — verify a custom domain.
 *
 * Preferred path (production): ask Vercel to verify the domain.
 * Vercel checks DNS and updates the domain's verified state, which
 * triggers automatic SSL provisioning.
 *
 * Fallback path (local/dev without VERCEL_TOKEN): do our own DNS
 * CNAME / TXT lookup so the feature still works end-to-end in dev.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: domainRecord } = await admin
      .from("custom_domains")
      .select("*")
      .eq("profile_id", user.id)
      .single();

    if (!domainRecord) {
      return NextResponse.json(
        { error: "No custom domain found. Add a domain first." },
        { status: 404 }
      );
    }

    if (domainRecord.status === "verified") {
      return NextResponse.json({
        success: true,
        status: "verified",
        message: "Domain is already verified",
      });
    }

    // ─── Vercel-backed verification (production) ───
    if (isVercelConfigured()) {
      try {
        // First, trigger Vercel's verification check
        const verifyResult = await verifyDomainInVercel(domainRecord.domain);

        // If not yet verified, re-fetch to pick up any updated challenges
        const finalState = verifyResult.verified
          ? verifyResult
          : (await getDomainFromVercel(domainRecord.domain)) ?? verifyResult;

        if (finalState.verified) {
          await admin
            .from("custom_domains")
            .update({
              status: "verified",
              verified_at: new Date().toISOString(),
              vercel_verification: finalState.verification ?? null,
            })
            .eq("id", domainRecord.id);

          return NextResponse.json({
            success: true,
            status: "verified",
            message: "Domain verified successfully! SSL certificate is being provisioned.",
          });
        }

        // Persist latest verification challenges for the UI
        await admin
          .from("custom_domains")
          .update({
            status: "failed",
            vercel_verification: finalState.verification ?? null,
          })
          .eq("id", domainRecord.id);

        return NextResponse.json({
          success: false,
          status: "failed",
          message: "DNS records not detected yet. DNS changes can take a few minutes to propagate.",
          verification: finalState.verification ?? [],
        });
      } catch (vercelError) {
        console.error("Vercel verify error:", vercelError);
        return NextResponse.json(
          { error: "Failed to verify domain with hosting provider. Please try again." },
          { status: 502 }
        );
      }
    }

    // ─── Local DNS fallback (dev without Vercel token) ───
    const appDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN || "rezm.ai").replace(/:\d+$/, "");
    const expectedCname = `custom.${appDomain}`;

    let cnameValid = false;
    let txtValid = false;

    try {
      const cnameRecords = await dns.resolveCname(domainRecord.domain);
      cnameValid = cnameRecords.some(
        (record) => record.replace(/\.$/, "").toLowerCase() === expectedCname
      );
    } catch {
      /* not set up yet */
    }

    try {
      const txtRecords = await dns.resolveTxt(domainRecord.domain);
      txtValid = txtRecords.some((record) =>
        record.join("").includes(domainRecord.verification_token)
      );
    } catch {
      /* not set up yet */
    }

    if (!cnameValid && !txtValid) {
      if (domainRecord.status === "pending") {
        await admin
          .from("custom_domains")
          .update({ status: "failed" })
          .eq("id", domainRecord.id);
      }

      return NextResponse.json({
        success: false,
        status: "failed",
        message: `DNS records not found. Please add a CNAME record pointing ${domainRecord.domain} to ${expectedCname}, or add a TXT record containing your verification token.`,
        expected_cname: expectedCname,
        verification_token: domainRecord.verification_token,
      });
    }

    await admin
      .from("custom_domains")
      .update({ status: "verified", verified_at: new Date().toISOString() })
      .eq("id", domainRecord.id);

    return NextResponse.json({
      success: true,
      status: "verified",
      message: "Domain verified successfully!",
      method: cnameValid ? "cname" : "txt",
    });
  } catch (error) {
    console.error("Domain verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
