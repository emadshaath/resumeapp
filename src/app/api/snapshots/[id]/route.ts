import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get full snapshot data
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("profile_snapshots")
      .select("*")
      .eq("id", id)
      .eq("profile_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Snapshot get error:", error);
    return NextResponse.json({ error: "Failed to get snapshot." }, { status: 500 });
  }
}

// DELETE - Delete a snapshot
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("profile_snapshots")
      .delete()
      .eq("id", id)
      .eq("profile_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Snapshot deleted." });
  } catch (error) {
    console.error("Snapshot delete error:", error);
    return NextResponse.json({ error: "Failed to delete snapshot." }, { status: 500 });
  }
}
