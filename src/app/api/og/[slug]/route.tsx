import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "edge";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, headline, location, slug")
    .eq("slug", slug)
    .single();

  const fullName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : slug;
  const headline = profile?.headline ?? "";
  const location = profile?.location ?? "";
  const initials = profile
    ? `${profile.first_name[0]}${profile.last_name[0]}`
    : slug[0]?.toUpperCase() ?? "?";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #312E81 0%, #4F46E5 50%, #6366F1 100%)",
          fontFamily: "system-ui, sans-serif",
          padding: 60,
        }}
      >
        {/* Top: brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 48,
          }}
        >
          <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
            <path
              d="M6 4a2 2 0 0 1 2-2h10l8 8v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4Z"
              fill="white"
              opacity="0.2"
            />
            <path
              d="M6 4a2 2 0 0 1 2-2h10l8 8v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4Z"
              stroke="white"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M18 2v6a2 2 0 0 0 2 2h6"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="10" y="15" width="12" height="1.6" rx="0.8" fill="white" />
            <rect x="10" y="19.5" width="8" height="1.6" rx="0.8" fill="white" opacity="0.6" />
            <rect x="10" y="24" width="10" height="1.6" rx="0.8" fill="white" opacity="0.35" />
          </svg>
          <span
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.5px",
            }}
          >
            rezm.ai
          </span>
        </div>

        {/* Centre: profile info */}
        <div style={{ display: "flex", alignItems: "center", gap: 36, flex: 1 }}>
          {/* Avatar circle */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
              fontWeight: 700,
              color: "white",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span
              style={{
                fontSize: 52,
                fontWeight: 700,
                color: "white",
                letterSpacing: "-1.5px",
                lineHeight: 1.1,
              }}
            >
              {fullName}
            </span>
            {headline && (
              <span
                style={{
                  fontSize: 26,
                  color: "rgba(255,255,255,0.75)",
                  letterSpacing: "-0.3px",
                }}
              >
                {headline}
              </span>
            )}
            {location && (
              <span
                style={{
                  fontSize: 20,
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                {location}
              </span>
            )}
          </div>
        </div>

        {/* Bottom: profile URL */}
        <div
          style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "-0.3px",
          }}
        >
          {slug}.rezm.ai
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
