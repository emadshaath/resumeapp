import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 36,
          background: "linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="110"
          height="110"
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
      </div>
    ),
    { ...size }
  );
}
