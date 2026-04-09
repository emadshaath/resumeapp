import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import dns from "dns/promises";

/**
 * POST — verify a custom domain by checking DNS CNAME record.
 *
 * The user must create a CNAME record pointing their domain to
 * the app's custom-domains host (e.g. custom.rezm.ai).
 * We also accept a TXT record with the verification token as an
 * alternative verification method.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Fetch the user's pending/failed domain
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

    const appDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN || "rezm.ai").replace(/:\d+$/, "");
    const expectedCname = `custom.${appDomain}`;

    let cnameValid = false;
    let txtValid = false;

    // Check CNAME record
    try {
      const cnameRecords = await dns.resolveCname(domainRecord.domain);
      cnameValid = cnameRecords.some(
        (record) => record.replace(/\.$/, "").toLowerCase() === expectedCname
      );
    } catch {
      // CNAME lookup failed — might not be set up yet
    }

    // Check TXT record as alternative verification
    try {
      const txtRecords = await dns.resolveTxt(domainRecord.domain);
      txtValid = txtRecords.some((record) =>
        record.join("").includes(domainRecord.verification_token)
      );
    } catch {
      // TXT lookup failed — might not be set up yet
    }

    if (!cnameValid && !txtValid) {
      // Update status to failed if it was pending
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

    // Mark as verified
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
