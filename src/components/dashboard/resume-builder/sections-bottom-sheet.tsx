"use client";

import { useEffect } from "react";
import { Layers, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionsBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

/**
 * Mobile-only affordance: a floating button bottom-right that opens a bottom
 * sheet hosting the section list. The section list itself is unchanged —
 * this component is just the launcher + sheet chrome.
 *
 * Hidden above the `lg` breakpoint (desktop shows the section list inline
 * in the left rail).
 */
export function SectionsBottomSheet({ open, onOpenChange, children }: SectionsBottomSheetProps) {
  // Close on Escape, prevent body scroll while open.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handler);
    };
  }, [open, onOpenChange]);

  return (
    <div className="lg:hidden">
      {/* Floating launcher button */}
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className={cn(
          "fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-medium text-brand-foreground shadow-lg transition-all",
          "hover:bg-brand-hover active:scale-95",
          // Hide while the sheet is open to avoid overlap.
          open && "pointer-events-none opacity-0",
        )}
        aria-label="Open sections menu"
      >
        <Layers className="h-4 w-4" />
        Sections
      </button>

      {/* Backdrop */}
      <div
        onClick={() => onOpenChange(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Bottom sheet panel */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex h-[80vh] flex-col rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-zinc-950",
          open ? "translate-y-0" : "translate-y-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Resume sections"
      >
        {/* Handle + close */}
        <div className="relative flex items-center justify-center border-b border-zinc-200 pb-2 pt-3 dark:border-zinc-800">
          <div className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-2 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Close sections menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
