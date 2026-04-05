import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureSnapshot } from "@/lib/snapshots/service";
import { getLimit } from "@/lib/stripe/feature-gate";
import type { Tier } from "@/types/database";
import { z } from "zod";

const createSchema = z.object({
  label: z.string().min(1).max(200),
});

// POST - Create a manual snapshot
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Check tier limits
    const { data: profile } = await admin
      .from("profiles")
      .select("tier")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const maxSnapshots = getLimit(profile.tier as Tier, "snapshots_max");

    const { count } = await admin
      .from("profile_snapshots")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user.id);

    if ((count || 0) >= maxSnapshots) {
      return NextResponse.json(
        { error: `Snapshot limit reached (${maxSnapshots}). Upgrade your plan or delete older snapshots.` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Label is required." }, { status: 400 });
    }

    const snapshotId = await captureSnapshot(user.id, parsed.data.label, "manual");

    return NextResponse.json({ id: snapshotId, message: "Snapshot created." });
  } catch (error) {
    console.error("Snapshot create error:", error);
    return NextResponse.json({ error: "Failed to create snapshot." }, { status: 500 });
  }
}

// GET - List snapshots
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const type = url.searchParams.get("type"); // optional filter

    let query = supabase
      .from("profile_snapshots")
      .select("id, label, snapshot_type, metadata, created_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq("snapshot_type", type);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get total count for pagination
    const { count } = await supabase
      .from("profile_snapshots")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user.id);

    return NextResponse.json({ snapshots: data || [], total: count || 0 });
  } catch (error) {
    console.error("Snapshot list error:", error);
    return NextResponse.json({ error: "Failed to list snapshots." }, { status: 500 });
  }
}
