"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function Sheet({ open, onOpenChange, children }: SheetProps) {
  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return <>{children}</>;
}

interface SheetContentProps {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  side?: "right" | "left";
}

function SheetContent({ open, onClose, className, children, side = "right" }: SheetContentProps) {
  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={cn(
          "fixed inset-y-0 z-50 flex flex-col bg-white dark:bg-zinc-950 shadow-lg transition-transform duration-300 ease-in-out w-full sm:max-w-lg",
          side === "right" && "right-0 border-l border-zinc-200 dark:border-zinc-800",
          side === "left" && "left-0 border-r border-zinc-200 dark:border-zinc-800",
          side === "right" && (open ? "translate-x-0" : "translate-x-full"),
          side === "left" && (open ? "translate-x-0" : "-translate-x-full"),
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 z-10"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </>
  );
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-2 p-6 pb-0 text-left shrink-0", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-semibold text-zinc-900 dark:text-zinc-100", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-zinc-500 dark:text-zinc-400", className)}
      {...props}
    />
  );
}

export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription };
