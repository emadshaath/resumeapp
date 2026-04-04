import { createAdminClient } from "@/lib/supabase/admin";

export type SnapshotType = "manual" | "auto_linkedin" | "auto_job_optimizer" | "auto_variant" | "auto_restore";

export interface SnapshotData {
  profile: Record<string, unknown>;
  sections: Record<string, unknown>[];
  experiences: Record<string, unknown>[];
  educations: Record<string, unknown>[];
  skills: Record<string, unknown>[];
  certifications: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  custom_sections: Record<string, unknown>[];
}

/**
 * Captures a full snapshot of all profile data and stores it.
 */
export async function captureSnapshot(
  profileId: string,
  label: string,
  type: SnapshotType = "manual",
  metadata: Record<string, unknown> = {}
): Promise<string> {
  const admin = createAdminClient();

  // Fetch all profile data
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
    admin.from("profiles").select("*").eq("id", profileId).single(),
    admin.from("resume_sections").select("*").eq("profile_id", profileId).order("display_order"),
    admin.from("experiences").select("*").eq("profile_id", profileId).order("display_order"),
    admin.from("educations").select("*").eq("profile_id", profileId).order("display_order"),
    admin.from("skills").select("*").eq("profile_id", profileId).order("display_order"),
    admin.from("certifications").select("*").eq("profile_id", profileId).order("display_order"),
    admin.from("projects").select("*").eq("profile_id", profileId).order("display_order"),
    admin.from("custom_sections").select("*").eq("profile_id", profileId).order("display_order"),
  ]);

  const snapshotData: SnapshotData = {
    profile: profile || {},
    sections: sections || [],
    experiences: experiences || [],
    educations: educations || [],
    skills: skills || [],
    certifications: certifications || [],
    projects: projects || [],
    custom_sections: customSections || [],
  };

  const { data, error } = await admin
    .from("profile_snapshots")
    .insert({
      profile_id: profileId,
      label,
      snapshot_type: type,
      snapshot_data: snapshotData,
      metadata,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to capture snapshot: ${error.message}`);
  return data.id;
}

/**
 * Restores profile data from a snapshot.
 * Creates an auto-snapshot of the current state before restoring.
 */
export async function restoreSnapshot(
  profileId: string,
  snapshotId: string
): Promise<{ beforeSnapshotId: string }> {
  const admin = createAdminClient();

  // Get the snapshot to restore
  const { data: snapshot, error: fetchError } = await admin
    .from("profile_snapshots")
    .select("snapshot_data, label")
    .eq("id", snapshotId)
    .eq("profile_id", profileId)
    .single();

  if (fetchError || !snapshot) {
    throw new Error("Snapshot not found.");
  }

  const data = snapshot.snapshot_data as SnapshotData;

  // Capture current state before restoring
  const beforeSnapshotId = await captureSnapshot(
    profileId,
    `Before restoring "${snapshot.label}"`,
    "auto_restore"
  );

  // Delete all existing content
  await Promise.all([
    admin.from("experiences").delete().eq("profile_id", profileId),
    admin.from("educations").delete().eq("profile_id", profileId),
    admin.from("skills").delete().eq("profile_id", profileId),
    admin.from("certifications").delete().eq("profile_id", profileId),
    admin.from("projects").delete().eq("profile_id", profileId),
    admin.from("custom_sections").delete().eq("profile_id", profileId),
  ]);

  // Delete sections after content (due to FK constraints)
  await admin.from("resume_sections").delete().eq("profile_id", profileId);

  // Restore profile fields (skip system fields)
  const profileData = data.profile;
  if (profileData && typeof profileData === "object") {
    const { id: _id, created_at: _ca, updated_at: _ua, stripe_customer_id: _sc, stripe_subscription_id: _ss, tier: _t, email: _e, ...restorableFields } = profileData as Record<string, unknown>;
    await admin.from("profiles").update(restorableFields).eq("id", profileId);
  }

  // Restore sections — need to map old IDs to new IDs
  const sectionIdMap = new Map<string, string>();

  if (data.sections.length > 0) {
    for (const section of data.sections) {
      const oldId = section.id as string;
      const { id: _id, created_at: _ca, updated_at: _ua, ...sectionFields } = section;
      const { data: newSection } = await admin
        .from("resume_sections")
        .insert({ ...sectionFields, profile_id: profileId })
        .select("id")
        .single();
      if (newSection) sectionIdMap.set(oldId, newSection.id);
    }
  }

  // Helper to restore content with mapped section IDs
  async function restoreContent(table: string, items: Record<string, unknown>[]) {
    if (items.length === 0) return;
    const mapped = items
      .map((item) => {
        const newSectionId = sectionIdMap.get(item.section_id as string);
        if (!newSectionId) return null;
        const { id: _id, created_at: _ca, updated_at: _ua, ...fields } = item;
        return { ...fields, profile_id: profileId, section_id: newSectionId };
      })
      .filter(Boolean);

    if (mapped.length > 0) {
      await admin.from(table).insert(mapped);
    }
  }

  await Promise.all([
    restoreContent("experiences", data.experiences),
    restoreContent("educations", data.educations),
    restoreContent("skills", data.skills),
    restoreContent("certifications", data.certifications),
    restoreContent("projects", data.projects),
    restoreContent("custom_sections", data.custom_sections),
  ]);

  return { beforeSnapshotId };
}

/**
 * Computes a human-readable diff summary between two snapshots.
 */
export function diffSnapshots(
  a: SnapshotData,
  b: SnapshotData
): DiffResult {
  const changes: DiffChange[] = [];

  // Compare profile fields
  const profileA = a.profile as Record<string, unknown>;
  const profileB = b.profile as Record<string, unknown>;
  const profileFields = ["first_name", "last_name", "headline", "location", "slug", "is_published"];

  for (const field of profileFields) {
    if (profileA[field] !== profileB[field]) {
      changes.push({
        type: "modified",
        category: "profile",
        field,
        from: String(profileA[field] ?? ""),
        to: String(profileB[field] ?? ""),
      });
    }
  }

  // Compare sections count
  if (a.sections.length !== b.sections.length) {
    changes.push({
      type: a.sections.length > b.sections.length ? "removed" : "added",
      category: "sections",
      field: "count",
      from: String(a.sections.length),
      to: String(b.sections.length),
    });
  }

  // Compare content counts
  const tables = ["experiences", "educations", "skills", "certifications", "projects", "custom_sections"] as const;
  for (const table of tables) {
    const countA = a[table].length;
    const countB = b[table].length;
    if (countA !== countB) {
      changes.push({
        type: countA > countB ? "removed" : "added",
        category: table,
        field: "count",
        from: String(countA),
        to: String(countB),
      });
    }
  }

  return {
    changes,
    summary: changes.length === 0
      ? "No differences found."
      : `${changes.length} change${changes.length > 1 ? "s" : ""} detected.`,
  };
}

export interface DiffChange {
  type: "added" | "removed" | "modified";
  category: string;
  field: string;
  from: string;
  to: string;
}

export interface DiffResult {
  changes: DiffChange[];
  summary: string;
}
