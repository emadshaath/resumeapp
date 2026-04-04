"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  GripVertical,
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

export default function SectionsPage() {
  const [sections, setSections] = useState<ResumeSection[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const loadSections = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data } = await supabase
      .from("resume_sections")
      .select("*")
      .eq("profile_id", user.id)
      .order("display_order");

    if (data) setSections(data as ResumeSection[]);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { loadSections(); }, [loadSections]);

  async function addSection(type: SectionType) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const typeConfig = SECTION_TYPES.find((t) => t.value === type);
    const { data, error } = await supabase
      .from("resume_sections")
      .insert({
        profile_id: user.id,
        section_type: type,
        title: typeConfig?.label || "New Section",
        display_order: sections.length,
      })
      .select()
      .single();

    if (data && !error) {
      setSections([...sections, data as ResumeSection]);
      setExpandedId(data.id);
      setShowAdd(false);
    }
  }

  async function deleteSection(id: string) {
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
    )
      return;

    const newSections = [...sections];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newSections[index], newSections[swapIndex]] = [newSections[swapIndex], newSections[index]];

    const updated = newSections.map((s, i) => ({ ...s, display_order: i }));
    setSections(updated);

    // Update both swapped sections in DB
    await Promise.all([
      supabase.from("resume_sections").update({ display_order: updated[index].display_order }).eq("id", updated[index].id),
      supabase.from("resume_sections").update({ display_order: updated[swapIndex].display_order }).eq("id", updated[swapIndex].id),
    ]);
  }

  if (loading) {
    return <div className="py-20 text-center text-zinc-500">Loading sections...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resume Sections</h1>
          <p className="text-zinc-500 mt-1">Add and organize your resume content.</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Section
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Choose Section Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {SECTION_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => addSection(type.value)}
                  className="flex flex-col items-center gap-2 rounded-lg border border-zinc-200 p-4 text-sm hover:bg-zinc-50 hover:border-zinc-300 transition-colors dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  <type.icon className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
                  {type.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {sections.length === 0 && !showAdd ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium">No sections yet</h3>
            <p className="text-sm text-zinc-500 mt-1 mb-4">
              Add sections to build your resume profile.
            </p>
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add your first section
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => {
            const typeConfig = SECTION_TYPES.find((t) => t.value === section.section_type);
            const Icon = typeConfig?.icon || FileText;
            const isExpanded = expandedId === section.id;

            return (
              <Card key={section.id} className={!section.is_visible ? "opacity-60" : ""}>
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : section.id)}
                >
                  <GripVertical className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                  <Icon className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                  <span className="font-medium text-sm flex-1">{section.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {typeConfig?.label}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); moveSection(section.id, "up"); }}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); moveSection(section.id, "down"); }}
                      disabled={index === sections.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); toggleVisibility(section.id, section.is_visible); }}
                    >
                      {section.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <CardContent className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Section Title</Label>
                        <Input
                          value={section.title}
                          onChange={(e) => updateTitle(section.id, e.target.value)}
                        />
                      </div>
                      <SectionContentEditor
                        section={section}
                        onUpdate={loadSections}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
