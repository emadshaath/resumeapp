import { ImageResponse } from "next/og";

export const alt = "rezm.ai - Your Professional Identity, Secured";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #312E81 0%, #4F46E5 50%, #6366F1 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 32 32"
            fill="none"
          >
            <path
              d="M6 4a2 2 0 0 1 2-2h10l8 8v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4Z"
              fill="white"
              opacity="0.2"
            />
            <path
              d="M6 4a2 2 0 0 1 2-2h10l8 8v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4Z"
              stroke="white"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M18 2v6a2 2 0 0 0 2 2h6"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="10" y="15" width="12" height="1.6" rx="0.8" fill="white" />
            <rect x="10" y="19.5" width="8" height="1.6" rx="0.8" fill="white" opacity="0.6" />
            <rect x="10" y="24" width="10" height="1.6" rx="0.8" fill="white" opacity="0.35" />
          </svg>
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "white",
            letterSpacing: "-2px",
            lineHeight: 1,
          }}
        >
          rezm.ai
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.7)",
            marginTop: 16,
            letterSpacing: "-0.5px",
          }}
        >
          Your Professional Identity, Secured
        </div>

        {/* Subtle bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 18,
            color: "rgba(255,255,255,0.45)",
          }}
        >
          <span>Custom Subdomain</span>
          <span style={{ color: "rgba(255,255,255,0.25)" }}>|</span>
          <span>AI Resume Review</span>
          <span style={{ color: "rgba(255,255,255,0.25)" }}>|</span>
          <span>Secure Communication</span>
          <span style={{ color: "rgba(255,255,255,0.25)" }}>|</span>
          <span>Visitor Analytics</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
