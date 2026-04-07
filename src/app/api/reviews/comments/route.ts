import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get all comments for the user's resumes, joined with link info
    const { data: comments, error } = await admin
      .from("review_comments")
      .select(`
        id,
        review_link_id,
        section_id,
        section_type,
        reviewer_name,
        comment_text,
        created_at,
        review_links!inner (
          token,
          created_at
        )
      `)
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Comments fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
    }

    return NextResponse.json(comments || []);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
