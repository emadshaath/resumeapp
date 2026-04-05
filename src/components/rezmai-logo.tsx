/**
 * rezm.ai logo — a minimal document silhouette with a folded corner,
 * housing a single accent line that hints at a resume entry.
 * Pairs with the wordmark "rezm.ai" set in the brand font.
 */
export function RezmaiLogo({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="rezm.ai logo"
    >
      {/* Document body */}
      <path
        d="M6 4a2 2 0 0 1 2-2h10l8 8v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4Z"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M6 4a2 2 0 0 1 2-2h10l8 8v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Folded corner */}
      <path
        d="M18 2v6a2 2 0 0 0 2 2h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Accent lines — stylised resume rows */}
      <rect x="10" y="15" width="12" height="1.6" rx="0.8" fill="currentColor" />
      <rect x="10" y="19.5" width="8" height="1.6" rx="0.8" fill="currentColor" opacity="0.5" />
      <rect x="10" y="24" width="10" height="1.6" rx="0.8" fill="currentColor" opacity="0.3" />
    </svg>
  );
}
