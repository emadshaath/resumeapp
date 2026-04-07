import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: "#4F46E5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 32 32"
          fill="none"
        >
          {/* Document body */}
          <path
            d="M6 4a2 2 0 0 1 2-2h10l8 8v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4Z"
            fill="white"
            opacity="0.2"
          />
          <path
            d="M6 4a2 2 0 0 1 2-2h10l8 8v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4Z"
            stroke="white"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Folded corner */}
          <path
            d="M18 2v6a2 2 0 0 0 2 2h6"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Resume lines */}
          <rect x="10" y="15" width="12" height="2" rx="1" fill="white" />
          <rect x="10" y="20" width="8" height="2" rx="1" fill="white" opacity="0.6" />
          <rect x="10" y="25" width="10" height="2" rx="1" fill="white" opacity="0.35" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
