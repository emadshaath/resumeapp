"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

export function JobDescriptionDisplay({ html }: { html: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <FileText className="h-3.5 w-3.5" />
        Saved copy — the original posting may no longer be available
      </div>
      <div className="relative">
        <div
          className={`prose prose-sm dark:prose-invert max-w-none prose-headings:text-base prose-headings:font-semibold prose-p:my-1.5 prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1 overflow-hidden ${
            !expanded ? "max-h-[300px]" : ""
          }`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {!expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-zinc-950 to-transparent" />
        )}
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-brand hover:text-brand-hover font-medium transition-colors"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" />
            Show less
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            Show more
          </>
        )}
      </button>
    </div>
  );
}
