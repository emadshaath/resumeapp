"use client";

import { usePathname } from "next/navigation";

/**
 * Routes inside the dashboard that should render edge-to-edge — overriding the
 * default centered max-w-5xl content container. Anything matching by prefix.
 *
 * The Resume Builder is the only full-width route: its 3-pane layout
 * (forms / canvas / style) needs every pixel of the main area.
 */
const FULL_WIDTH_PREFIXES = ["/dashboard/sections"];

interface Props {
  children: React.ReactNode;
}

export function DashboardContentWrap({ children }: Props) {
  const pathname = usePathname() || "";
  const fullWidth = FULL_WIDTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (fullWidth) return <>{children}</>;
  return <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>;
}
