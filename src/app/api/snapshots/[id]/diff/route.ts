import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { diffSnapshots, type SnapshotData } from "@/lib/snapshots/service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Diff this snapshot against current profile state
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the snapshot
    const { data: snapshot } = await supabase
      .from("profile_snapshots")
      .select("snapshot_data")
      .eq("id", id)
      .eq("profile_id", user.id)
      .single();

    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
    }

    // Get current state
    const admin = createAdminClient();
    const [
      { data: profile },
      { data: sections },
      { data: experiences },
      { data: educations },
      { data: skills },
      { data: certifications },
      { data: projects },
      { data: customSections },
    ] = await Promise.all([
      admin.from("profiles").select("*").eq("id", user.id).single(),
      admin.from("resume_sections").select("*").eq("profile_id", user.id),
      admin.from("experiences").select("*").eq("profile_id", user.id),
      admin.from("educations").select("*").eq("profile_id", user.id),
      admin.from("skills").select("*").eq("profile_id", user.id),
      admin.from("certifications").select("*").eq("profile_id", user.id),
      admin.from("projects").select("*").eq("profile_id", user.id),
      admin.from("custom_sections").select("*").eq("profile_id", user.id),
    ]);

    const currentState: SnapshotData = {
      profile: profile || {},
      sections: sections || [],
      experiences: experiences || [],
      educations: educations || [],
      skills: skills || [],
      certifications: certifications || [],
      projects: projects || [],
      custom_sections: customSections || [],
    };

    const diff = diffSnapshots(snapshot.snapshot_data as SnapshotData, currentState);

    return NextResponse.json(diff);
  } catch (error) {
    console.error("Snapshot diff error:", error);
    return NextResponse.json({ error: "Failed to compute diff." }, { status: 500 });
  }
}
