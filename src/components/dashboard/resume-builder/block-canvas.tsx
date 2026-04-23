"use client";

import { useMemo } from "react";
import { COLOR_THEMES } from "@/lib/pdf/types";
import type { ResumeData } from "@/lib/pdf/types";
import type { ResumeBlock } from "@/types/database";
import { renderBlockHtml, type BlockRenderContext } from "./block-renderers";
import type { StyleState } from "./style-state";

interface BlockCanvasProps {
  data: ResumeData;
  blocks: ResumeBlock[];
  style: StyleState;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
}

/**
 * A4-shaped HTML canvas that renders the user's blocks per zone, mirroring the
 * PDF custom layout. Each block is wrapped in a clickable surface so the right
 * rail can switch into block-properties mode. Pixel-similar to the PDF, not
 * pixel-perfect — the dedicated PDF preview iframe is the source of truth.
 *
 * Inline styles flow from the user's StyleState (font / color / spacing) so
 * tweaks in the right rail show up here immediately.
 */
export function BlockCanvas({
  data,
  blocks,
  style,
  selectedBlockId,
  onSelectBlock,
}: BlockCanvasProps) {
  const palette = COLOR_THEMES[style.colorTheme].palette;
  const isSidebarTemplate = style.pageTemplate === "sidebar-left";

  const sorted = useMemo(
    () => [...blocks].sort((a, b) => a.display_order - b.display_order),
    [blocks],
  );
  const headerBlocks = sorted.filter((b) => b.zone === "header");
  const mainBlocks = sorted.filter((b) => b.zone === "main");
  const sidebarBlocks = sorted.filter((b) => b.zone === "sidebar");

  const ctxMain: BlockRenderContext = { data, style, palette, inSidebar: false };
  const ctxSidebar: BlockRenderContext = { data, style, palette, inSidebar: true };

  // 40 * spacingScale matches the PDF's page padding so spacing slider effects
  // line up between canvas and PDF preview.
  const pagePadding = 40 * style.fontConfig.spacingScale;

  return (
    <div
      className="flex h-full w-full justify-center overflow-y-auto bg-zinc-200 px-4 py-6 dark:bg-zinc-900"
      onClick={() => onSelectBlock(null)}
    >
      {/* A4 sheet. 794px ≈ A4 width @ 96dpi; height grows naturally. */}
      <div
        className="relative w-full max-w-[794px] shrink-0 rounded-sm shadow-lg"
        style={{
          backgroundColor: palette.background,
          minHeight: 1123, // ≈ A4 portrait height @ 96dpi
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: pagePadding }}>
          {headerBlocks.map((b) => (
            <BlockShell
              key={b.id}
              block={b}
              selected={selectedBlockId === b.id}
              onSelect={() => onSelectBlock(b.id)}
            >
              {renderBlockHtml(b, ctxMain)}
            </BlockShell>
          ))}

          {isSidebarTemplate ? (
            <div style={{ display: "flex", gap: 18 * style.fontConfig.spacingScale }}>
              <div
                style={{
                  width: style.sidebarWidth,
                  backgroundColor: palette.sidebarBg,
                  color: palette.sidebarText,
                  padding: 18 * style.fontConfig.spacingScale,
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              >
                {sidebarBlocks.map((b) => (
                  <BlockShell
                    key={b.id}
                    block={b}
                    selected={selectedBlockId === b.id}
                    onSelect={() => onSelectBlock(b.id)}
                  >
                    {renderBlockHtml(b, ctxSidebar)}
                  </BlockShell>
                ))}
                {sidebarBlocks.length === 0 && (
                  <EmptyZoneHint label="Sidebar zone" colorOnDark />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {mainBlocks.map((b) => (
                  <BlockShell
                    key={b.id}
                    block={b}
                    selected={selectedBlockId === b.id}
                    onSelect={() => onSelectBlock(b.id)}
                  >
                    {renderBlockHtml(b, ctxMain)}
                  </BlockShell>
                ))}
                {mainBlocks.length === 0 && <EmptyZoneHint label="Main zone" />}
              </div>
            </div>
          ) : (
            <div>
              {mainBlocks.map((b) => (
                <BlockShell
                  key={b.id}
                  block={b}
                  selected={selectedBlockId === b.id}
                  onSelect={() => onSelectBlock(b.id)}
                >
                  {renderBlockHtml(b, ctxMain)}
                </BlockShell>
              ))}
              {/* Sidebar-zoned blocks fall through inline so nothing disappears. */}
              {sidebarBlocks.map((b) => (
                <BlockShell
                  key={b.id}
                  block={b}
                  selected={selectedBlockId === b.id}
                  onSelect={() => onSelectBlock(b.id)}
                >
                  {renderBlockHtml(b, ctxMain)}
                </BlockShell>
              ))}
              {mainBlocks.length === 0 && sidebarBlocks.length === 0 && (
                <EmptyZoneHint label="Empty page — add a block from the section list" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Wraps a block with a selectable outline. Adds a subtle hover ring and a
 *  bolder selected ring. Click bubbling is blocked so clicking the page
 *  background still deselects. */
function BlockShell({
  block,
  selected,
  onSelect,
  children,
}: {
  block: ResumeBlock;
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      data-block-id={block.id}
      data-block-type={block.type}
      className={`group relative cursor-pointer rounded-sm transition-shadow ${
        selected
          ? "outline outline-2 outline-brand outline-offset-2"
          : "hover:outline hover:outline-1 hover:outline-zinc-300 hover:outline-offset-2"
      }`}
    >
      {selected && (
        <div className="absolute -top-5 left-0 z-10 rounded-sm bg-brand px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-foreground">
          {block.type}
        </div>
      )}
      {children}
    </div>
  );
}

function EmptyZoneHint({ label, colorOnDark }: { label: string; colorOnDark?: boolean }) {
  return (
    <div
      className={`rounded-sm border border-dashed py-6 text-center text-xs ${
        colorOnDark
          ? "border-white/30 text-white/60"
          : "border-zinc-300 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500"
      }`}
    >
      {label}
    </div>
  );
}
