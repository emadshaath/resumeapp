"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Plus, Trash2, Sparkles, X, ChevronUp, ChevronDown, AlertCircle, Wand2 } from "lucide-react";
import type { ResumeSection, Experience, Education, Skill, Certification, Project } from "@/types/database";
import type { SuggestionItem } from "@/lib/claude/schemas";
import { parseHighlights } from "@/lib/utils";

interface SectionContentEditorProps {
  section: ResumeSection;
  onUpdate: () => void;
}

// ───────────────────────────────────────────────────────────────────────────
// Autosave primitives — shared across every section editor so typing shows
// consistent "Saving…" / "Saved ✓" feedback and only hits the DB once the
// user pauses, instead of firing an UPDATE per keystroke.
// ───────────────────────────────────────────────────────────────────────────

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";
const AUTOSAVE_DELAY_MS = 700;
const SAVED_LINGER_MS = 1800;

// Coalesces per-row patches (keyed by row id) into a single debounced flush.
// Used by list-style sections (experiences, educations, ...).
function useBatchedAutosave<T>(
  performSave: (batch: Map<string, Partial<T>>) => Promise<void>
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const pendingRef = useRef<Map<string, Partial<T>>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(performSave);
  saveRef.current = performSave;

  const flush = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (pendingRef.current.size === 0) return;
    const batch = pendingRef.current;
    pendingRef.current = new Map();
    setStatus("saving");
    try {
      await saveRef.current(batch);
      setStatus("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setStatus("idle"), SAVED_LINGER_MS);
    } catch {
      setStatus("error");
    }
  }, []);

  const schedule = useCallback((id: string, updates: Partial<T>) => {
    const prev = pendingRef.current.get(id) || {};
    pendingRef.current.set(id, { ...prev, ...updates });
    setStatus("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
  }, [flush]);

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (pendingRef.current.size > 0) {
        const batch = pendingRef.current;
        pendingRef.current = new Map();
        // Best-effort flush on unmount; we can't await in cleanup.
        saveRef.current(batch).catch(() => {});
      }
    };
  }, [flush]);

  return { schedule, flush, status };
}

// Simpler variant for a single dirty value (summary / custom content).
function useDebouncedAutosave(performSave: () => Promise<void>) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(performSave);
  saveRef.current = performSave;

  const flush = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    setStatus("saving");
    try {
      await saveRef.current();
      setStatus("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setStatus("idle"), SAVED_LINGER_MS);
    } catch {
      setStatus("error");
    }
  }, []);

  const schedule = useCallback(() => {
    dirtyRef.current = true;
    setStatus("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
  }, [flush]);

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (dirtyRef.current) {
        dirtyRef.current = false;
        saveRef.current().catch(() => {});
      }
    };
  }, [flush]);

  return { schedule, flush, status };
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") {
    return <span className="text-xs text-zinc-400">Autosaves as you type</span>;
  }
  if (status === "pending") {
    return <span className="text-xs text-zinc-500">Unsaved changes…</span>;
  }
  if (status === "saving") {
    return (
      <span className="text-xs text-zinc-500 inline-flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="text-xs text-green-600 dark:text-green-400 inline-flex items-center gap-1">
        <Check className="h-3 w-3" /> Saved
      </span>
    );
  }
  return (
    <span className="text-xs text-red-600 dark:text-red-400 inline-flex items-center gap-1">
      <AlertCircle className="h-3 w-3" /> Save failed — retry any edit
    </span>
  );
}


interface ProposedUpdate {
  id: string;
  fields: Record<string, unknown>;
}

interface PreviewPayload {
  section_id: string;
  section_type: string;
  section_name: string;
  current_items: Record<string, unknown>[];
  updates: ProposedUpdate[];
  inserts: Record<string, unknown>[];
  explanation: string;
}

const DIFF_IGNORED_FIELDS = new Set([
  "id",
  "section_id",
  "profile_id",
  "created_at",
  "updated_at",
  "display_order",
]);

function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined) return "(empty)";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

// Jira Rovo / Gmail "Help me write" style: the proposed text is what you see
// first. The original is tucked behind a small "Show original" disclosure so
// the preview reads like a clean draft, not a diff.
function DiffCard({
  current,
  proposed,
  label,
}: {
  current: Record<string, unknown> | null;
  proposed: Record<string, unknown>;
  label: string;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const fieldKeys = Object.keys(proposed).filter(
    (k) => !DIFF_IGNORED_FIELDS.has(k)
  );
  if (fieldKeys.length === 0) return null;

  const headerLabel =
    (current?.position as string) ||
    (current?.company_name as string) ||
    (current?.name as string) ||
    (current?.title as string) ||
    (proposed.position as string) ||
    (proposed.company_name as string) ||
    (proposed.name as string) ||
    (proposed.title as string) ||
    null;

  const hasOriginal =
    current !== null &&
    fieldKeys.some(
      (k) => formatDiffValue(current[k]) !== formatDiffValue(proposed[k])
    );

  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        {headerLabel && (
          <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate">
            · {headerLabel}
          </span>
        )}
      </div>
      <div className="px-3 py-2.5 space-y-2.5">
        {fieldKeys.map((key) => {
          const after = proposed[key];
          const displayKey = key.replace(/_/g, " ");
          return (
            <div key={key} className="text-sm">
              <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-1">
                {displayKey}
              </div>
              <div className="text-zinc-800 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed">
                {formatDiffValue(after)}
              </div>
              {showOriginal && current !== null && (
                <div className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 border-l-2 border-zinc-200 dark:border-zinc-700 pl-2 whitespace-pre-wrap">
                  <span className="text-[10px] uppercase tracking-wide text-zinc-400 mr-1">
                    Original:
                  </span>
                  {formatDiffValue(current[key])}
                </div>
              )}
            </div>
          );
        })}
        {hasOriginal && (
          <button
            type="button"
            onClick={() => setShowOriginal((v) => !v)}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline-offset-2 hover:underline"
          >
            {showOriginal ? "Hide original" : "Show original"}
          </button>
        )}
      </div>
    </div>
  );
}

function AISuggestButton({
  section,
  onUpdate,
}: {
  section: ResumeSection;
  onUpdate: () => void;
}) {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [targetedCount, setTargetedCount] = useState<number | null>(null);
  const [previewingIndex, setPreviewingIndex] = useState<number | null>(null);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [appliedIndexes, setAppliedIndexes] = useState<Set<number>>(new Set());
  const [supabase] = useState(() => createClient());

  async function getSuggestions() {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setTargetedCount(null);
    setOpen(true);

    try {
      // Gather section content for the prompt
      let content = "";
      const table =
        section.section_type === "experience" ? "experiences" :
        section.section_type === "education" ? "educations" :
        section.section_type === "skills" ? "skills" :
        section.section_type === "certifications" ? "certifications" :
        section.section_type === "projects" ? "projects" : "custom_sections";

      const { data: items } = await supabase
        .from(table)
        .select("*")
        .eq("section_id", section.id)
        .order("display_order");

      if (!items || items.length === 0) {
        setError("Add some content to this section first.");
        setLoading(false);
        return;
      }

      content = items.map((item) => {
        return Object.entries(item)
          .filter(([k, v]) => !["id", "section_id", "profile_id", "created_at", "updated_at", "display_order"].includes(k) && v != null && v !== "")
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join("\n");
      }).join("\n---\n");

      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_title: section.title,
          section_type: section.section_type,
          content,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to get suggestions.");
      } else {
        setSuggestions(data.suggestions || []);
        setTargetedCount(data.targeted?.candidate_count ?? null);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function requestPreview(index: number, suggestion: SuggestionItem) {
    setPreviewingIndex(index);
    setPreview(null);
    setPreviewError(null);
    const recText = suggestion.example
      ? `${suggestion.text}\n\nExample of improved text: ${suggestion.example}`
      : suggestion.text;
    try {
      const res = await fetch("/api/ai/apply-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendation: recText,
          section_type: section.section_type,
          section_name: section.title,
          preview: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPreviewError(data.error || "Preview failed.");
      } else {
        setPreview({
          section_id: data.section_id,
          section_type: data.section_type,
          section_name: data.section_name,
          current_items: data.current_items || [],
          updates: data.updates || [],
          inserts: data.inserts || [],
          explanation: data.explanation || "",
        });
      }
    } catch {
      setPreviewError("Network error. Please try again.");
    }
  }

  async function commitPreview() {
    if (!preview) return;
    setCommitting(true);
    try {
      const res = await fetch("/api/ai/apply-recommendation/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_id: preview.section_id,
          section_type: preview.section_type,
          updates: preview.updates,
          inserts: preview.inserts,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPreviewError(data.error || "Failed to apply.");
      } else {
        if (previewingIndex !== null) {
          setAppliedIndexes((prev) => new Set(prev).add(previewingIndex));
        }
        setPreview(null);
        setPreviewingIndex(null);
        onUpdate();
      }
    } catch {
      setPreviewError("Network error. Please try again.");
    } finally {
      setCommitting(false);
    }
  }

  function cancelPreview() {
    setPreview(null);
    setPreviewingIndex(null);
    setPreviewError(null);
  }

  const typeColors: Record<string, string> = {
    improve: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    add: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    rewrite: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    remove: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={getSuggestions}
        disabled={loading}
        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950"
      >
        {loading ? (
          <>
            <Sparkles className="h-3.5 w-3.5 mr-1 animate-pulse" />
            Getting suggestions...
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            AI Suggestions
          </>
        )}
      </Button>

      {open && (suggestions.length > 0 || error) && (
        <div className="mt-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> AI Suggestions
            </span>
            <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {targetedCount !== null && targetedCount > 0 && (
            <p className="mb-2 text-xs text-purple-700 dark:text-purple-300">
              Tailored for your {targetedCount} pending auto-apply candidate
              {targetedCount === 1 ? "" : "s"}.
            </p>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {suggestions.map((s, i) => {
            const isPreviewingThis = previewingIndex === i;
            const applied = appliedIndexes.has(i);
            return (
              <div key={i} className="mb-3 last:mb-0">
                <div className="flex items-start gap-2">
                  <Badge className={`text-xs shrink-0 mt-0.5 ${typeColors[s.type] || ""}`}>
                    {s.type}
                  </Badge>
                  <div className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">
                    <p>{s.text}</p>
                    {s.example && (
                      <p className="mt-1 text-xs text-zinc-500 italic border-l-2 border-purple-300 pl-2">
                        Example: {s.example}
                      </p>
                    )}
                    {!applied && !isPreviewingThis && s.type !== "remove" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 h-7 text-xs"
                        onClick={() => requestPreview(i, s)}
                      >
                        <Wand2 className="h-3 w-3 mr-1" />
                        Apply & review
                      </Button>
                    )}
                    {applied && (
                      <p className="mt-2 text-xs text-green-700 dark:text-green-400 inline-flex items-center gap-1">
                        <Check className="h-3 w-3" /> Applied
                      </p>
                    )}
                  </div>
                </div>
                {isPreviewingThis && (
                  <div className="mt-2 ml-7 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/40 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
                      <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                        Suggested rewrite
                      </span>
                    </div>
                    <div className="p-3">
                      {preview === null && previewError === null && (
                        <p className="text-xs text-zinc-500 inline-flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" /> Drafting changes…
                        </p>
                      )}
                      {previewError && (
                        <p className="text-sm text-red-600 dark:text-red-400">{previewError}</p>
                      )}
                      {preview && (
                        <div className="space-y-3">
                          {preview.updates.length === 0 && preview.inserts.length === 0 ? (
                            <p className="text-xs text-zinc-500">
                              No changes proposed for this suggestion.
                            </p>
                          ) : (
                            <>
                              {preview.updates.map((upd) => (
                                <DiffCard
                                  key={upd.id}
                                  current={
                                    preview.current_items.find(
                                      (it) => (it as { id: string }).id === upd.id
                                    ) || null
                                  }
                                  proposed={upd.fields}
                                  label="Update"
                                />
                              ))}
                              {preview.inserts.map((ins, j) => (
                                <DiffCard
                                  key={`ins-${j}`}
                                  current={null}
                                  proposed={ins}
                                  label="Add"
                                />
                              ))}
                            </>
                          )}
                          {preview.explanation && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                              {preview.explanation}
                            </p>
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={commitPreview}
                              disabled={
                                committing ||
                                (preview.updates.length === 0 &&
                                  preview.inserts.length === 0)
                              }
                            >
                              {committing ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Inserting…
                                </>
                              ) : (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  Insert
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs text-zinc-600 dark:text-zinc-300"
                              onClick={cancelPreview}
                              disabled={committing}
                            >
                              Discard
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SectionContentEditor({ section, onUpdate }: SectionContentEditorProps) {
  // Bumped every time an AI suggestion is committed so the sub-editor below
  // remounts and reloads its items from Supabase — the sub-editors cache item
  // state in useState and wouldn't otherwise reflect the DB write.
  const [reloadToken, setReloadToken] = useState(0);
  const editorKey = `${section.id}-${reloadToken}`;
  const handleAIApplied = useCallback(() => {
    setReloadToken((t) => t + 1);
    onUpdate();
  }, [onUpdate]);

  return (
    <div className="space-y-4">
      {(() => {
        switch (section.section_type) {
          case "summary":
            return <SummaryEditor key={editorKey} section={section} onUpdate={onUpdate} />;
          case "experience":
            return <ExperienceEditor key={editorKey} section={section} onUpdate={onUpdate} />;
          case "education":
            return <EducationEditor key={editorKey} section={section} onUpdate={onUpdate} />;
          case "skills":
            return <SkillsEditor key={editorKey} section={section} onUpdate={onUpdate} />;
          case "certifications":
            return <CertificationsEditor key={editorKey} section={section} onUpdate={onUpdate} />;
          case "projects":
            return <ProjectsEditor key={editorKey} section={section} onUpdate={onUpdate} />;
          case "custom":
            return <CustomEditor key={editorKey} section={section} onUpdate={onUpdate} />;
          default:
            return null;
        }
      })()}
      <AISuggestButton section={section} onUpdate={handleAIApplied} />
    </div>
  );
}

// === SUMMARY EDITOR ===
function SummaryEditor({ section, onUpdate }: SectionContentEditorProps) {
  const [content, setContent] = useState("");
  const [supabase] = useState(() => createClient());
  const loadedRef = useRef(false);
  const contentRef = useRef("");
  contentRef.current = content;

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("custom_sections")
      .select("content")
      .eq("section_id", section.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setContent(data.content || "");
        loadedRef.current = true;
      });
    return () => { cancelled = true; };
  }, [section.id, supabase]);

  const { schedule, status } = useDebouncedAutosave(async () => {
    const next = contentRef.current;
    const { data: existing } = await supabase
      .from("custom_sections")
      .select("id")
      .eq("section_id", section.id)
      .single();

    if (existing) {
      await supabase.from("custom_sections").update({ content: next }).eq("id", existing.id);
    } else {
      await supabase.from("custom_sections").insert({
        section_id: section.id,
        profile_id: section.profile_id,
        content: next,
      });
    }
    onUpdate();
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <SaveStatusIndicator status={status} />
      </div>
      <Textarea
        placeholder="Write your professional summary..."
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          if (loadedRef.current) schedule();
        }}
        rows={5}
      />
    </div>
  );
}

// === EXPERIENCE EDITOR ===
function ExperienceEditor({ section, onUpdate }: SectionContentEditorProps) {
  const [items, setItems] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("experiences")
      .select("*")
      .eq("section_id", section.id)
      .order("display_order");
    if (data) setItems(data.map((e: Record<string, unknown>) => ({ ...e, highlights: parseHighlights(e.highlights) })) as Experience[]);
    setLoading(false);
  }, [section.id, supabase]);

  useEffect(() => { load(); }, [load]);

  const { schedule, flush, status } = useBatchedAutosave<Experience>(async (batch) => {
    await Promise.all(
      [...batch.entries()].map(([id, updates]) =>
        supabase.from("experiences").update(updates).eq("id", id)
      )
    );
  });

  async function addItem() {
    await flush();
    const { data } = await supabase
      .from("experiences")
      .insert({
        section_id: section.id,
        profile_id: section.profile_id,
        company_name: "",
        position: "",
        start_date: new Date().toISOString().split("T")[0],
        display_order: items.length,
      })
      .select()
      .single();
    if (data) { setItems((prev) => [...prev, data as Experience]); }
  }

  function updateItem(id: string, updates: Partial<Experience>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
    schedule(id, updates);
  }

  async function moveItem(id: string, direction: "up" | "down") {
    const index = items.findIndex((i) => i.id === id);
    if ((direction === "up" && index === 0) || (direction === "down" && index === items.length - 1)) return;
    await flush();
    const newItems = [...items];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    const updated = newItems.map((i, idx) => ({ ...i, display_order: idx }));
    setItems(updated);
    await Promise.all([
      supabase.from("experiences").update({ display_order: updated[index].display_order }).eq("id", updated[index].id),
      supabase.from("experiences").update({ display_order: updated[swapIndex].display_order }).eq("id", updated[swapIndex].id),
    ]);
  }

  async function deleteItem(id: string) {
    await flush();
    await supabase.from("experiences").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
    onUpdate();
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SaveStatusIndicator status={status} />
      </div>
      {items.map((item, index) => (
        <Card key={item.id} className="bg-zinc-50 dark:bg-zinc-900">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                <div className="space-y-1">
                  <Label className="text-xs">Company</Label>
                  <Input
                    value={item.company_name}
                    onChange={(e) => updateItem(item.id, { company_name: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Position</Label>
                  <Input
                    value={item.position}
                    onChange={(e) => updateItem(item.id, { position: e.target.value })}
                    placeholder="Job title"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Location</Label>
                  <Input
                    value={item.location || ""}
                    onChange={(e) => updateItem(item.id, { location: e.target.value })}
                    placeholder="City, State"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Start</Label>
                    <Input
                      type="date"
                      value={item.start_date}
                      onChange={(e) => updateItem(item.id, { start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End</Label>
                    <Input
                      type="date"
                      value={item.end_date || ""}
                      onChange={(e) => updateItem(item.id, { end_date: e.target.value || null })}
                      disabled={item.is_current}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-0.5 ml-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(item.id, "up")} disabled={index === 0}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(item.id, "down")} disabled={index === items.length - 1}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteItem(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.is_current}
                onChange={(e) => updateItem(item.id, { is_current: e.target.checked, end_date: null })}
                className="rounded"
              />
              <Label className="text-xs">Currently working here</Label>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={item.description || ""}
                onChange={(e) => updateItem(item.id, { description: e.target.value })}
                placeholder="Describe your role and responsibilities... (supports **bold** and *italic*)"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Bullet Points</Label>
              {(item.highlights || []).map((highlight, hIdx) => (
                <div key={hIdx} className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-2.5 text-xs">•</span>
                  <Input
                    value={highlight}
                    onChange={(e) => {
                      const updated = [...(item.highlights || [])];
                      updated[hIdx] = e.target.value;
                      updateItem(item.id, { highlights: updated });
                    }}
                    placeholder="Achievement or responsibility... (supports **bold** and *italic*)"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 shrink-0"
                    onClick={() => {
                      const updated = (item.highlights || []).filter((_, i) => i !== hIdx);
                      updateItem(item.id, { highlights: updated });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const updated = [...(item.highlights || []), ""];
                  updateItem(item.id, { highlights: updated });
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Bullet
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4 mr-1" />
        Add Experience
      </Button>
    </div>
  );
}

// === EDUCATION EDITOR ===
function EducationEditor({ section, onUpdate }: SectionContentEditorProps) {
  const [items, setItems] = useState<Education[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("educations")
      .select("*")
      .eq("section_id", section.id)
      .order("display_order");
    if (data) setItems(data as Education[]);
    setLoading(false);
  }, [section.id, supabase]);

  useEffect(() => { load(); }, [load]);

  const { schedule, flush, status } = useBatchedAutosave<Education>(async (batch) => {
    await Promise.all(
      [...batch.entries()].map(([id, updates]) =>
        supabase.from("educations").update(updates).eq("id", id)
      )
    );
  });

  async function addItem() {
    await flush();
    const { data } = await supabase
      .from("educations")
      .insert({
        section_id: section.id,
        profile_id: section.profile_id,
        institution: "",
        display_order: items.length,
      })
      .select()
      .single();
    if (data) setItems((prev) => [...prev, data as Education]);
  }

  function updateItem(id: string, updates: Partial<Education>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
    schedule(id, updates);
  }

  async function moveItem(id: string, direction: "up" | "down") {
    const index = items.findIndex((i) => i.id === id);
    if ((direction === "up" && index === 0) || (direction === "down" && index === items.length - 1)) return;
    await flush();
    const newItems = [...items];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    const updated = newItems.map((i, idx) => ({ ...i, display_order: idx }));
    setItems(updated);
    await Promise.all([
      supabase.from("educations").update({ display_order: updated[index].display_order }).eq("id", updated[index].id),
      supabase.from("educations").update({ display_order: updated[swapIndex].display_order }).eq("id", updated[swapIndex].id),
    ]);
  }

  async function deleteItem(id: string) {
    await flush();
    await supabase.from("educations").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
    onUpdate();
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SaveStatusIndicator status={status} />
      </div>
      {items.map((item, index) => (
        <Card key={item.id} className="bg-zinc-50 dark:bg-zinc-900">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                <div className="space-y-1">
                  <Label className="text-xs">Institution</Label>
                  <Input
                    value={item.institution}
                    onChange={(e) => updateItem(item.id, { institution: e.target.value })}
                    placeholder="University / School"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Degree</Label>
                  <Input
                    value={item.degree || ""}
                    onChange={(e) => updateItem(item.id, { degree: e.target.value })}
                    placeholder="e.g. Bachelor of Science"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Field of Study</Label>
                  <Input
                    value={item.field_of_study || ""}
                    onChange={(e) => updateItem(item.id, { field_of_study: e.target.value })}
                    placeholder="e.g. Computer Science"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">GPA</Label>
                  <Input
                    value={item.gpa || ""}
                    onChange={(e) => updateItem(item.id, { gpa: e.target.value })}
                    placeholder="e.g. 3.8/4.0"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Start</Label>
                    <Input
                      type="date"
                      value={item.start_date || ""}
                      onChange={(e) => updateItem(item.id, { start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End</Label>
                    <Input
                      type="date"
                      value={item.end_date || ""}
                      onChange={(e) => updateItem(item.id, { end_date: e.target.value || null })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-0.5 ml-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(item.id, "up")} disabled={index === 0}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(item.id, "down")} disabled={index === items.length - 1}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteItem(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4 mr-1" />
        Add Education
      </Button>
    </div>
  );
}

// === SKILLS EDITOR ===
function SkillsEditor({ section }: SectionContentEditorProps) {
  const [items, setItems] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("skills")
      .select("*")
      .eq("section_id", section.id)
      .order("display_order");
    if (data) setItems(data as Skill[]);
    setLoading(false);
  }, [section.id, supabase]);

  useEffect(() => { load(); }, [load]);

  const { schedule, flush, status } = useBatchedAutosave<Skill>(async (batch) => {
    await Promise.all(
      [...batch.entries()].map(([id, updates]) =>
        supabase.from("skills").update(updates).eq("id", id)
      )
    );
  });

  async function addItem() {
    await flush();
    const { data } = await supabase
      .from("skills")
      .insert({
        section_id: section.id,
        profile_id: section.profile_id,
        name: "",
        display_order: items.length,
      })
      .select()
      .single();
    if (data) setItems((prev) => [...prev, data as Skill]);
  }

  function updateItem(id: string, updates: Partial<Skill>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
    schedule(id, updates);
  }

  async function moveItem(id: string, direction: "up" | "down") {
    const index = items.findIndex((i) => i.id === id);
    if ((direction === "up" && index === 0) || (direction === "down" && index === items.length - 1)) return;
    await flush();
    const newItems = [...items];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    const updated = newItems.map((i, idx) => ({ ...i, display_order: idx }));
    setItems(updated);
    await Promise.all([
      supabase.from("skills").update({ display_order: updated[index].display_order }).eq("id", updated[index].id),
      supabase.from("skills").update({ display_order: updated[swapIndex].display_order }).eq("id", updated[swapIndex].id),
    ]);
  }

  async function deleteItem(id: string) {
    await flush();
    await supabase.from("skills").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading...</p>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <SaveStatusIndicator status={status} />
      </div>
      {items.map((item, index) => (
        <div key={item.id} className="flex flex-col sm:flex-row gap-2">
          <Input
            value={item.name}
            onChange={(e) => updateItem(item.id, { name: e.target.value })}
            placeholder="Skill name"
            className="flex-1"
          />
          <div className="flex items-center gap-2">
            <Input
              value={item.category || ""}
              onChange={(e) => updateItem(item.id, { category: e.target.value })}
              placeholder="Category"
              className="w-full sm:w-36"
            />
            <select
              value={item.proficiency || ""}
              onChange={(e) => updateItem(item.id, { proficiency: (e.target.value || null) as Skill["proficiency"] })}
              className="h-10 rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Level</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => moveItem(item.id, "up")} disabled={index === 0}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => moveItem(item.id, "down")} disabled={index === items.length - 1}>
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 shrink-0" onClick={() => deleteItem(item.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4 mr-1" />
        Add Skill
      </Button>
    </div>
  );
}

// === CERTIFICATIONS EDITOR ===
function CertificationsEditor({ section }: SectionContentEditorProps) {
  const [items, setItems] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("certifications")
      .select("*")
      .eq("section_id", section.id)
      .order("display_order");
    if (data) setItems(data as Certification[]);
    setLoading(false);
  }, [section.id, supabase]);

  useEffect(() => { load(); }, [load]);

  const { schedule, flush, status } = useBatchedAutosave<Certification>(async (batch) => {
    await Promise.all(
      [...batch.entries()].map(([id, updates]) =>
        supabase.from("certifications").update(updates).eq("id", id)
      )
    );
  });

  async function addItem() {
    await flush();
    const { data } = await supabase
      .from("certifications")
      .insert({
        section_id: section.id,
        profile_id: section.profile_id,
        name: "",
        display_order: items.length,
      })
      .select()
      .single();
    if (data) setItems((prev) => [...prev, data as Certification]);
  }

  function updateItem(id: string, updates: Partial<Certification>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
    schedule(id, updates);
  }

  async function moveItem(id: string, direction: "up" | "down") {
    const index = items.findIndex((i) => i.id === id);
    if ((direction === "up" && index === 0) || (direction === "down" && index === items.length - 1)) return;
    await flush();
    const newItems = [...items];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    const updated = newItems.map((i, idx) => ({ ...i, display_order: idx }));
    setItems(updated);
    await Promise.all([
      supabase.from("certifications").update({ display_order: updated[index].display_order }).eq("id", updated[index].id),
      supabase.from("certifications").update({ display_order: updated[swapIndex].display_order }).eq("id", updated[swapIndex].id),
    ]);
  }

  async function deleteItem(id: string) {
    await flush();
    await supabase.from("certifications").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SaveStatusIndicator status={status} />
      </div>
      {items.map((item, index) => (
        <Card key={item.id} className="bg-zinc-50 dark:bg-zinc-900">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                <div className="space-y-1">
                  <Label className="text-xs">Certification Name</Label>
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(item.id, { name: e.target.value })}
                    placeholder="e.g. AWS Solutions Architect"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Issuing Organization</Label>
                  <Input
                    value={item.issuing_org || ""}
                    onChange={(e) => updateItem(item.id, { issuing_org: e.target.value })}
                    placeholder="e.g. Amazon Web Services"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Issue Date</Label>
                  <Input
                    type="date"
                    value={item.issue_date || ""}
                    onChange={(e) => updateItem(item.id, { issue_date: e.target.value || null })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Credential URL</Label>
                  <Input
                    type="url"
                    value={item.credential_url || ""}
                    onChange={(e) => updateItem(item.id, { credential_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex flex-col items-center gap-0.5 ml-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(item.id, "up")} disabled={index === 0}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(item.id, "down")} disabled={index === items.length - 1}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteItem(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4 mr-1" />
        Add Certification
      </Button>
    </div>
  );
}

// === PROJECTS EDITOR ===
function ProjectsEditor({ section }: SectionContentEditorProps) {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("section_id", section.id)
      .order("display_order");
    if (data) setItems(data as Project[]);
    setLoading(false);
  }, [section.id, supabase]);

  useEffect(() => { load(); }, [load]);

  const { schedule, flush, status } = useBatchedAutosave<Project>(async (batch) => {
    await Promise.all(
      [...batch.entries()].map(([id, updates]) =>
        supabase.from("projects").update(updates).eq("id", id)
      )
    );
  });

  async function addItem() {
    await flush();
    const { data } = await supabase
      .from("projects")
      .insert({
        section_id: section.id,
        profile_id: section.profile_id,
        name: "",
        display_order: items.length,
      })
      .select()
      .single();
    if (data) setItems((prev) => [...prev, data as Project]);
  }

  function updateItem(id: string, updates: Partial<Project>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
    schedule(id, updates);
  }

  async function moveItem(id: string, direction: "up" | "down") {
    const index = items.findIndex((i) => i.id === id);
    if ((direction === "up" && index === 0) || (direction === "down" && index === items.length - 1)) return;
    await flush();
    const newItems = [...items];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    const updated = newItems.map((i, idx) => ({ ...i, display_order: idx }));
    setItems(updated);
    await Promise.all([
      supabase.from("projects").update({ display_order: updated[index].display_order }).eq("id", updated[index].id),
      supabase.from("projects").update({ display_order: updated[swapIndex].display_order }).eq("id", updated[swapIndex].id),
    ]);
  }

  async function deleteItem(id: string) {
    await flush();
    await supabase.from("projects").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SaveStatusIndicator status={status} />
      </div>
      {items.map((item, index) => (
        <Card key={item.id} className="bg-zinc-50 dark:bg-zinc-900">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                <div className="space-y-1">
                  <Label className="text-xs">Project Name</Label>
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(item.id, { name: e.target.value })}
                    placeholder="Project name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">URL</Label>
                  <Input
                    type="url"
                    value={item.url || ""}
                    onChange={(e) => updateItem(item.id, { url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex flex-col items-center gap-0.5 ml-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(item.id, "up")} disabled={index === 0}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(item.id, "down")} disabled={index === items.length - 1}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteItem(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={item.description || ""}
                onChange={(e) => updateItem(item.id, { description: e.target.value })}
                placeholder="What does this project do?"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4 mr-1" />
        Add Project
      </Button>
    </div>
  );
}

// === CUSTOM SECTION EDITOR ===
function CustomEditor({ section, onUpdate }: SectionContentEditorProps) {
  return <SummaryEditor section={section} onUpdate={onUpdate} />;
}
