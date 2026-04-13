import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidTheme } from "@/lib/themes";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let profileTheme: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.profile_theme === "string" && isValidTheme(body.profile_theme)) {
      profileTheme = body.profile_theme;
    }
  } catch {
    // Empty or non-JSON body — optional field, ignore.
  }

  const updates: Record<string, unknown> = { onboarding_completed: true };
  if (profileTheme) updates.profile_theme = profileTheme;

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
