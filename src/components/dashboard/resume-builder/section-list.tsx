"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Briefcase,
  GraduationCap,
  Wrench,
  Award,
  FolderOpen,
  FileText,
  AlignLeft,
  ChevronDown,
  ChevronUp,
  Layers,
  FileUp,
} from "lucide-react";
import type { ResumeSection, SectionType } from "@/types/database";
import { SectionContentEditor } from "@/components/dashboard/section-editor";

const SECTION_TYPES: { value: SectionType; label: string; icon: React.ElementType }[] = [
  { value: "summary", label: "Professional Summary", icon: AlignLeft },
  { value: "experience", label: "Work Experience", icon: Briefcase },
  { value: "education", label: "Education", icon: GraduationCap },
  { value: "skills", label: "Skills", icon: Wrench },
  { value: "certifications", label: "Certifications", icon: Award },
  { value: "projects", label: "Projects", icon: FolderOpen },
  { value: "custom", label: "Custom Section", icon: FileText },
];

interface SectionListProps {
  sections: ResumeSection[];
  setSections: (next: ResumeSection[]) => void;
  supabase: SupabaseClient;
  /** Profile user id — used as profile_id when inserting new sections. */
  profileId: string;
  /** Refetch after the section editor reports a content change. */
  onRefresh: () => void;
  /** Open the import dialog from the empty state. */
  onOpenImport: () => void;
  /** Called after a new section row is created so the parent can ensure a
   *  matching canvas block exists. */
  onSectionAdded?: (section: ResumeSection) => void;
  /** Called before a section is deleted so the parent can remove the
   *  corresponding canvas block(s). Optional — no-op if not provided. */
  onSectionDeleting?: (sectionId: string) => Promise<void> | void;
}

/**
 * Left-rail section CRUD: add, reorder, hide, delete, and inline-edit each
 * section's content via the existing SectionContentEditor. Stays narrow so it
 * can sit next to a live PDF preview without crowding it.
 */
export function SectionList({
  sections,
  setSections,
  supabase,
  profileId,
  onRefresh,
  onOpenImport,
  onSectionAdded,
  onSectionDeleting,
}: SectionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  async function addSection(type: SectionType) {
    const typeConfig = SECTION_TYPES.find((t) => t.value === type);
    const { data, error } = await supabase
      .from("resume_sections")
      .insert({
        profile_id: profileId,
        section_type: type,
        title: typeConfig?.label || "New Section",
        display_order: sections.length,
      })
      .select()
      .single();

    if (data && !error) {
      const created = data as ResumeSection;
      setSections([...sections, created]);
      setExpandedId(created.id);
      setShowAdd(false);
      onSectionAdded?.(created);
    }
  }

  async function deleteSection(id: string) {
    // Let the parent remove the corresponding canvas block first so the UI
    // doesn't flash an orphaned block between the two writes.
    await onSectionDeleting?.(id);
    const { error } = await supabase.from("resume_sections").delete().eq("id", id);
    if (!error) {
      setSections(sections.filter((s) => s.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  }

  async function toggleVisibility(id: string, isVisible: boolean) {
    await supabase.from("resume_sections").update({ is_visible: !isVisible }).eq("id", id);
    setSections(sections.map((s) => (s.id === id ? { ...s, is_visible: !isVisible } : s)));
  }

  async function updateTitle(id: string, title: string) {
    await supabase.from("resume_sections").update({ title }).eq("id", id);
    setSections(sections.map((s) => (s.id === id ? { ...s, title } : s)));
  }

  async function moveSection(id: string, direction: "up" | "down") {
    const index = sections.findIndex((s) => s.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === sections.length - 1)
    ) return;

    const next = [...sections];
    const swap = direction === "up" ? index - 1 : index + 1;
    [next[index], next[swap]] = [next[swap], next[index]];
    const updated = next.map((s, i) => ({ ...s, display_order: i }));
    setSections(updated);

    await Promise.all([
      supabase.from("resume_sections").update({ display_order: updated[index].display_order }).eq("id", updated[index].id),
      supabase.from("resume_sections").update({ display_order: updated[swap].display_order }).eq("id", updated[swap].id),
    ]);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Add Section bar */}
      <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
        <Button onClick={() => setShowAdd((v) => !v)} size="sm" className="w-full">
          <Plus className="h-4 w-4 mr-1" />
          Add Section
        </Button>

        {showAdd && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {SECTION_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => addSection(type.value)}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-zinc-200 p-2.5 text-[11px] hover:bg-zinc-50 hover:border-zinc-300 transition-colors dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <type.icon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                <span className="text-center leading-tight">{type.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sections list */}
      <div className="flex-1 overflow-y-auto p-3">
        {sections.length === 0 && !showAdd ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Layers className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
              <h3 className="text-sm font-medium">No sections yet</h3>
              <p className="mt-1 mb-3 text-xs text-zinc-500 text-center">
                Add a section or import an existing resume.
              </p>
              <div className="flex flex-col gap-2 w-full px-4">
                <Button size="sm" onClick={() => setShowAdd(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add a section
                </Button>
                <Button size="sm" variant="outline" onClick={onOpenImport}>
                  <FileUp className="h-4 w-4 mr-1" /> Import resume
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sections.map((section, index) => {
              const typeConfig = SECTION_TYPES.find((t) => t.value === section.section_type);
              const Icon = typeConfig?.icon || FileText;
              const isExpanded = expandedId === section.id;

              return (
                <Card key={section.id} className={!section.is_visible ? "opacity-60" : ""}>
                  <div
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : section.id)}
                  >
                    <Icon className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
                    <span className="font-medium text-sm flex-1 truncate min-w-0">
                      {section.title}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); moveSection(section.id, "up"); }}
                        disabled={index === 0}
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); moveSection(section.id, "down"); }}
                        disabled={index === sections.length - 1}
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); toggleVisibility(section.id, section.is_visible); }}
                        aria-label={section.is_visible ? "Hide" : "Show"}
                      >
                        {section.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <CardContent className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Section Title</Label>
                          <Input
                            value={section.title}
                            onChange={(e) => updateTitle(section.id, e.target.value)}
                          />
                        </div>
                        <SectionContentEditor section={section} onUpdate={onRefresh} />
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
