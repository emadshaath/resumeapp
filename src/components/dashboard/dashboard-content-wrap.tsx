"use client";

import { usePathname } from "next/navigation";

/**
 * Routes inside the dashboard that should render edge-to-edge — overriding the
 * default centered max-w-5xl content container. Anything matching by prefix.
 *
 * The Resume Builder needs the full width to fit a 3-pane (forms / preview /
 * styling) layout. PDF Studio is the same shape and is paired here so both
 * surfaces feel consistent until /dashboard/pdf gets folded into the builder.
 */
const FULL_WIDTH_PREFIXES = ["/dashboard/sections", "/dashboard/pdf"];

interface Props {
  children: React.ReactNode;
}

export function DashboardContentWrap({ children }: Props) {
  const pathname = usePathname() || "";
  const fullWidth = FULL_WIDTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (fullWidth) return <>{children}</>;
  return <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>;
}
