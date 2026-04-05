import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { restoreSnapshot } from "@/lib/snapshots/service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Restore profile from snapshot
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify snapshot belongs to user
    const { data: snapshot } = await supabase
      .from("profile_snapshots")
      .select("id")
      .eq("id", id)
      .eq("profile_id", user.id)
      .single();

    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
    }

    const { beforeSnapshotId } = await restoreSnapshot(user.id, id);

    return NextResponse.json({
      message: "Profile restored from snapshot.",
      before_snapshot_id: beforeSnapshotId,
    });
  } catch (error) {
    console.error("Snapshot restore error:", error);
    const message = error instanceof Error ? error.message : "Failed to restore snapshot.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
