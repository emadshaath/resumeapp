import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { createHash } from "crypto";
import { z } from "zod";

interface RouteContext {
  params: Promise<{ token: string }>;
}

const commentSchema = z.object({
  section_id: z.string().uuid().optional(),
  section_type: z.string().max(50).optional(),
  reviewer_name: z.string().max(100).optional(),
  comment_text: z.string().min(1).max(5000),
  password: z.string().max(100).optional(),
});

function verifyPassword(token: string, password: string, hash: string): boolean {
  const computed = createHash("sha256").update(token + password).digest("hex");
  return computed === hash;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;

    // Rate limit by IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const { success: rateLimitOk } = rateLimit(
      `review-comment:${ip}`,
      20,
      60 * 60 * 1000 // 20 comments per hour per IP
    );

    if (!rateLimitOk) {
      return NextResponse.json(
        { error: "Too many comments. Please try again later." },
        { status: 429 }
      );
    }

    const supabase = createAdminClient();

    // Validate the review link
    const { data: link } = await supabase
      .from("review_links")
      .select("id, profile_id, is_active, expires_at, password_hash")
      .eq("token", token)
      .single();

    if (!link) {
      return NextResponse.json({ error: "Review link not found" }, { status: 404 });
    }

    if (!link.is_active) {
      return NextResponse.json({ error: "This review link has been deactivated" }, { status: 410 });
    }

    if (new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: "This review link has expired" }, { status: 410 });
    }

    // Check password if required
    if (link.password_hash) {
      const password = request.headers.get("x-review-password");
      if (!password || !verifyPassword(token, password, link.password_hash)) {
        return NextResponse.json({ error: "Unauthorized", requiresPassword: true }, { status: 401 });
      }
    }

    const body = await request.json();
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid comment data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { section_id, section_type, reviewer_name, comment_text } = parsed.data;

    const { data: comment, error } = await supabase
      .from("review_comments")
      .insert({
        review_link_id: link.id,
        profile_id: link.profile_id,
        section_id: section_id || null,
        section_type: section_type || null,
        reviewer_name: reviewer_name || null,
        comment_text,
      })
      .select("id, section_id, section_type, reviewer_name, comment_text, created_at")
      .single();

    if (error) {
      console.error("Comment insert error:", error);
      return NextResponse.json({ error: "Failed to submit comment" }, { status: 500 });
    }

    return NextResponse.json({ success: true, comment });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
