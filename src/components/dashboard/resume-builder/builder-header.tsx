"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Loader2,
  Check,
  Sparkles,
  FileUp,
  History,
  Link2,
  Wand2,
  Eye,
  PencilLine,
  SlidersHorizontal,
} from "lucide-react";

export type BuilderView = "edit" | "design" | "style";

interface BuilderHeaderProps {
  // Style/save state
  saving: boolean;
  saved: boolean;
  dirty: boolean;
  onSave: () => void;

  // Download
  downloading: boolean;
  onDownload: () => void;

  // View toggle (used on tablet/mobile to swap between the three panels)
  view: BuilderView;
  onViewChange: (v: BuilderView) => void;

  // Drawer triggers
  onOpenImport: () => void;
  onOpenAIReview: () => void;
  onOpenLinkedIn: () => void;
  onOpenHistory: () => void;
}

/**
 * Top toolbar for the unified Resume Builder. Hosts every action that used to
 * live in the old `/dashboard/sections` toolbar plus the Save/Download buttons
 * that previously lived in the PDF Studio header.
 */
export function BuilderHeader({
  saving,
  saved,
  dirty,
  onSave,
  downloading,
  onDownload,
  view,
  onViewChange,
  onOpenImport,
  onOpenAIReview,
  onOpenLinkedIn,
  onOpenHistory,
}: BuilderHeaderProps) {
  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950 sm:px-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand" />
        <h1 className="text-sm font-semibold tracking-tight sm:text-base">Resume Builder</h1>
      </div>

      {/* Mobile/tablet view toggle — hidden on desktop where everything fits.
          Three buttons mirror the three desktop columns so every pane is
          reachable on small screens. */}
      <div className="ml-2 inline-flex rounded-md border border-zinc-200 dark:border-zinc-800 lg:hidden">
        <TogglePill active={view === "edit"} onClick={() => onViewChange("edit")} icon={PencilLine} label="Edit" />
        <TogglePill active={view === "design"} onClick={() => onViewChange("design")} icon={Eye} label="Design" />
        <TogglePill active={view === "style"} onClick={() => onViewChange("style")} icon={SlidersHorizontal} label="Style" />
      </div>

      <div className="flex-1" />

      {/* Tools: drawers and import */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onOpenImport} aria-label="Import resume">
          <FileUp className="h-4 w-4" />
          <span className="ml-1 hidden md:inline">Import</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenAIReview} aria-label="AI review">
          <Wand2 className="h-4 w-4" />
          <span className="ml-1 hidden md:inline">AI Review</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenLinkedIn} aria-label="LinkedIn sync">
          <Link2 className="h-4 w-4" />
          <span className="ml-1 hidden lg:inline">LinkedIn</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenHistory} aria-label="Version history">
          <History className="h-4 w-4" />
          <span className="ml-1 hidden lg:inline">History</span>
        </Button>
      </div>

      <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

      {/* Save status + Save + Download */}
      {saved && (
        <Badge variant="secondary" className="gap-1">
          <Check className="h-3 w-3" /> Saved
        </Badge>
      )}
      {!saved && dirty && (
        <span className="hidden text-xs text-zinc-500 sm:inline">Unsaved style changes</span>
      )}
      <Button size="sm" variant="outline" onClick={onSave} disabled={saving || !dirty}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1" /> : null}
        <span className="hidden sm:inline">Save style</span>
        <span className="sm:hidden">Save</span>
      </Button>
      <Button size="sm" onClick={onDownload} disabled={downloading}>
        {downloading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1" />
        ) : (
          <Download className="h-3.5 w-3.5 sm:mr-1" />
        )}
        <span className="hidden sm:inline">Download PDF</span>
      </Button>
    </header>
  );
}

function TogglePill({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-brand text-brand-foreground"
          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      <Icon className="h-3 w-3" /> {label}
    </button>
  );
}
