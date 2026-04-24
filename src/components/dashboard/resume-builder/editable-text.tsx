"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Finite whitelist so TS doesn't balloon on JSX.IntrinsicElements. */
export type EditableTag = "span" | "div" | "p" | "h1" | "h2" | "h3";

interface EditableTextProps {
  value: string;
  onSave: (next: string) => void | Promise<void>;
  /** Shown via CSS when the editable is empty. */
  placeholder?: string;
  /** Element tag (defaults to span for inline; use "div" for block text). */
  as?: EditableTag;
  className?: string;
  style?: React.CSSProperties;
  /** Allow Enter-newline. Default is false — Enter blurs the field. */
  multiline?: boolean;
  /** Debounce window for autosave while typing (ms). Blur also flushes. */
  debounceMs?: number;
  /** Disable editing — renders plain text without contentEditable semantics. */
  readOnly?: boolean;
  ariaLabel?: string;
}

/**
 * Inline contentEditable with a debounced save. Manages the DOM imperatively
 * (React doesn't control contentEditable content after first mount) and syncs
 * from the `value` prop only when the element isn't focused — otherwise typing
 * would fight a re-render.
 *
 * Save semantics match the section-editor autosave pattern: debounce while
 * typing, flush on blur and on Escape, Enter blurs in single-line mode.
 */
export function EditableText({
  value,
  onSave,
  placeholder,
  as = "span",
  className,
  style,
  multiline = false,
  debounceMs = 500,
  readOnly = false,
  ariaLabel,
}: EditableTextProps) {
  const ref = useRef<HTMLElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValueRef = useRef(value);

  // Initialize DOM text on mount so React doesn't try to reconcile children.
  useEffect(() => {
    if (ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync from external value changes only when the user isn't editing.
  useEffect(() => {
    latestValueRef.current = value;
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.textContent !== value) el.textContent = value;
  }, [value]);

  const commit = useCallback(
    (text: string) => {
      if (text === latestValueRef.current) return;
      latestValueRef.current = text;
      onSave(text);
    },
    [onSave],
  );

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    const text = ref.current.textContent ?? "";
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commit(text), debounceMs);
  }, [commit, debounceMs]);

  const handleBlur = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (!ref.current) return;
    commit(ref.current.textContent ?? "");
  }, [commit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Keep keystrokes contained — parents may have keyboard handlers (the
      // canvas's block shell toggles selection on Space/Enter) that would
      // otherwise swallow text input inside the editable.
      e.stopPropagation();
      if (!multiline && e.key === "Enter") {
        e.preventDefault();
        (e.currentTarget as HTMLElement).blur();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        // Restore the original value before blurring.
        if (ref.current) ref.current.textContent = latestValueRef.current;
        (e.currentTarget as HTMLElement).blur();
      }
    },
    [multiline],
  );

  // Clicking an editable shouldn't bubble up to the canvas's "deselect on
  // background click" handler — otherwise starting to edit a field would
  // deselect its block.
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const Tag = as;

  if (readOnly) {
    return (
      <Tag className={className} style={style} ref={ref as React.Ref<never>}>
        {value}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref as React.Ref<never>}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={ariaLabel ?? placeholder}
      data-placeholder={placeholder}
      onInput={handleInput}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      className={cn(
        "rounded-sm outline-none min-w-[1ch]",
        "empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400",
        "focus:bg-brand/5 focus:outline focus:outline-2 focus:outline-brand/40",
        "hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30",
        className,
      )}
      style={style}
    />
  );
}
