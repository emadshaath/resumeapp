import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/avatar — Upload avatar image
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Use JPEG, PNG, WebP, or GIF." }, { status: 400 });
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large. Maximum size is 2MB." }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `${user.id}/avatar.${ext}`;

  // Delete existing avatar files first
  const { data: existingFiles } = await supabase.storage.from("avatars").list(user.id);
  if (existingFiles?.length) {
    await supabase.storage.from("avatars").remove(existingFiles.map((f) => `${user.id}/${f.name}`));
  }

  // Upload new avatar
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  // Update profile
  await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);

  return NextResponse.json({ avatar_url: avatarUrl });
}

// DELETE /api/avatar — Remove avatar
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Delete all avatar files for this user
  const { data: existingFiles } = await supabase.storage.from("avatars").list(user.id);
  if (existingFiles?.length) {
    await supabase.storage.from("avatars").remove(existingFiles.map((f) => `${user.id}/${f.name}`));
  }

  // Clear avatar_url in profile
  await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);

  return NextResponse.json({ success: true });
}
