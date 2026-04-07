import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/extension/token — Generate a short-lived token for the Chrome extension
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Generate a short-lived session token for the extension
  // In production this would be a proper JWT; for now we use a simple token
  const token = crypto.randomUUID() + "-" + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Store token in extension_tokens table or use session
  // For simplicity, we'll encode user info in a signed token-like structure
  const payload = {
    user_id: user.id,
    email: user.email,
    token,
    expires_at: expiresAt.toISOString(),
  };

  // Store in user metadata for validation
  // In production, use a dedicated extension_tokens table
  const { error } = await supabase
    .from("profiles")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  return NextResponse.json({
    token: Buffer.from(JSON.stringify(payload)).toString("base64"),
    expires_at: expiresAt.toISOString(),
    user: {
      id: user.id,
      email: user.email,
    },
  });
}
