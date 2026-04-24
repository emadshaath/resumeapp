"use client";

import { useMemo } from "react";
import {
  DndContext,
  type DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { COLOR_THEMES } from "@/lib/pdf/types";
import type { ResumeData } from "@/lib/pdf/types";
import type { ResumeBlock } from "@/types/database";
import { renderBlockHtml, type BlockRenderContext, type SaveFieldFn } from "./block-renderers";
import type { StyleState } from "./style-state";

interface BlockCanvasProps {
  data: ResumeData;
  blocks: ResumeBlock[];
  style: StyleState;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  /** Persist a single text field change from an inline editor. */
  saveField: SaveFieldFn;
  /** Called after a drag-reorder with the full new block list. Parent
   *  persists via PUT /api/resume/blocks. */
  onReorder: (nextBlocks: ResumeBlock[]) => void;
  /** Disable inline editing (e.g. during an explicit read-only preview). */
  editable?: boolean;
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
  saveField,
  onReorder,
  editable = true,
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

  const ctxMain: BlockRenderContext = { data, style, palette, inSidebar: false, saveField, editable };
  const ctxSidebar: BlockRenderContext = { data, style, palette, inSidebar: true, saveField, editable };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(evt: DragEndEvent) {
    const { active, over } = evt;
    if (!over || active.id === over.id) return;

    const activeBlock = blocks.find((b) => b.id === active.id);
    const overBlock = blocks.find((b) => b.id === over.id);
    if (!activeBlock || !overBlock) return;
    // Only reorder within the same zone — cross-zone moves happen via the
    // right-rail Zone picker so we don't have to manage drop-target zones.
    if (activeBlock.zone !== overBlock.zone) return;

    const zoneBlocks = blocks
      .filter((b) => b.zone === activeBlock.zone)
      .sort((a, b) => a.display_order - b.display_order);
    const oldIndex = zoneBlocks.findIndex((b) => b.id === active.id);
    const newIndex = zoneBlocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reorderedZone = arrayMove(zoneBlocks, oldIndex, newIndex).map((b, i) => ({
      ...b,
      display_order: i,
    }));

    // Merge the reordered zone back into the full block list, preserving other
    // zones' order.
    const other = blocks.filter((b) => b.zone !== activeBlock.zone);
    onReorder([...other, ...reorderedZone]);
  }

  // 40 * spacingScale matches the PDF's page padding so spacing slider effects
  // line up between canvas and PDF preview.
  const pagePadding = 40 * style.fontConfig.spacingScale;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
            {/* Header zone — single sortable context, usually one block. */}
            <SortableContext items={headerBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              {headerBlocks.map((b) => (
                <SortableBlockShell
                  key={b.id}
                  block={b}
                  selected={selectedBlockId === b.id}
                  onSelect={() => onSelectBlock(b.id)}
                >
                  {renderBlockHtml(b, ctxMain)}
                </SortableBlockShell>
              ))}
            </SortableContext>

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
                  <SortableContext items={sidebarBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                    {sidebarBlocks.map((b) => (
                      <SortableBlockShell
                        key={b.id}
                        block={b}
                        selected={selectedBlockId === b.id}
                        onSelect={() => onSelectBlock(b.id)}
                      >
                        {renderBlockHtml(b, ctxSidebar)}
                      </SortableBlockShell>
                    ))}
                  </SortableContext>
                  {sidebarBlocks.length === 0 && <EmptyZoneHint label="Sidebar zone" colorOnDark />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <SortableContext items={mainBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                    {mainBlocks.map((b) => (
                      <SortableBlockShell
                        key={b.id}
                        block={b}
                        selected={selectedBlockId === b.id}
                        onSelect={() => onSelectBlock(b.id)}
                      >
                        {renderBlockHtml(b, ctxMain)}
                      </SortableBlockShell>
                    ))}
                  </SortableContext>
                  {mainBlocks.length === 0 && <EmptyZoneHint label="Main zone" />}
                </div>
              </div>
            ) : (
              <div>
                <SortableContext items={mainBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  {mainBlocks.map((b) => (
                    <SortableBlockShell
                      key={b.id}
                      block={b}
                      selected={selectedBlockId === b.id}
                      onSelect={() => onSelectBlock(b.id)}
                    >
                      {renderBlockHtml(b, ctxMain)}
                    </SortableBlockShell>
                  ))}
                </SortableContext>
                {/* Sidebar-zoned blocks fall through inline so nothing
                    disappears; keep them sortable as their own group. */}
                <SortableContext items={sidebarBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  {sidebarBlocks.map((b) => (
                    <SortableBlockShell
                      key={b.id}
                      block={b}
                      selected={selectedBlockId === b.id}
                      onSelect={() => onSelectBlock(b.id)}
                    >
                      {renderBlockHtml(b, ctxMain)}
                    </SortableBlockShell>
                  ))}
                </SortableContext>
                {mainBlocks.length === 0 && sidebarBlocks.length === 0 && (
                  <EmptyZoneHint label="Empty page — add a block from the section list" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DndContext>
  );
}

/**
 * Draggable block wrapper. Uses @dnd-kit's useSortable for reorder within the
 * enclosing SortableContext (zone-scoped). Keeps click-to-select, hover/focus
 * ring, and type badge from the original BlockShell.
 *
 * The drag handle is an explicit grip icon — activating drag from the block
 * body would conflict with inline editing (clicking text to edit would drag).
 */
function SortableBlockShell({
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
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
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

      {/* Drag handle — small grip icon floated to the left, shown on hover or
          when selected. Intentionally not absolute-positioned inside the
          content so the layout doesn't jump on hover. */}
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag ${block.type} block`}
        onClick={(e) => e.stopPropagation()}
        className={`absolute -left-6 top-1 z-10 hidden h-6 w-5 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 group-hover:flex ${
          selected ? "flex" : ""
        }`}
        style={{ touchAction: "none", cursor: "grab" }}
      >
        <GripVertical className="h-4 w-4" />
      </button>

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
