"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { ResumeData } from "@/lib/pdf/types";
import type { Skill } from "@/types/database";
import {
  Save,
  Loader2,
  Plus,
  Trash2,
  Briefcase,
  GraduationCap,
  Wrench,
  Award,
  FolderOpen,
  FileText,
} from "lucide-react";

interface VariantEditorProps {
  data: ResumeData;
  onSave: (updated: ResumeData) => Promise<void>;
  saving: boolean;
}

export function VariantEditor({ data, onSave, saving }: VariantEditorProps) {
  const [draft, setDraft] = useState<ResumeData>(structuredClone(data));
  const [dirty, setDirty] = useState(false);

  function update(updater: (d: ResumeData) => void) {
    const next = structuredClone(draft);
    updater(next);
    setDraft(next);
    setDirty(true);
  }

  function getSectionIcon(type: string) {
    const className = "h-4 w-4";
    switch (type) {
      case "experience": return <Briefcase className={className} />;
      case "education": return <GraduationCap className={className} />;
      case "skills": return <Wrench className={className} />;
      case "certifications": return <Award className={className} />;
      case "projects": return <FolderOpen className={className} />;
      default: return <FileText className={className} />;
    }
  }

  const sectionExperiences = (sectionId: string) =>
    draft.experiences.filter((e) => e.section_id === sectionId);
  const sectionSkills = (sectionId: string) =>
    draft.skills.filter((s) => s.section_id === sectionId);

  return (
    <div className="space-y-6">
      {/* Save bar */}
      <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-950 z-10 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          {dirty && (
            <Badge variant="secondary" className="text-xs">
              Unsaved changes
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => onSave(draft)}
          disabled={!dirty || saving}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <Save className="h-3.5 w-3.5 mr-1" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Headline */}
      <div>
        <label className="text-xs font-medium text-zinc-500 mb-1.5 block">
          Headline
        </label>
        <Input
          value={draft.profile.headline || ""}
          onChange={(e) =>
            update((d) => {
              d.profile.headline = e.target.value;
            })
          }
          placeholder="Professional headline..."
        />
      </div>

      {/* Sections */}
      {draft.sections.map((section) => (
        <div key={section.id} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-tight uppercase text-zinc-900 dark:text-zinc-100 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 flex-1">
              {getSectionIcon(section.section_type)}
              {section.title}
            </h3>
          </div>

          {/* Summary / Custom — editable content */}
          {(section.section_type === "summary" ||
            section.section_type === "custom") && (
            <div className="space-y-2">
              {draft.customSections
                .filter((c) => c.section_id === section.id)
                .map((item) => {
                  const globalIdx = draft.customSections.indexOf(item);
                  return (
                    <textarea
                      key={item.id}
                      value={item.content || ""}
                      onChange={(e) =>
                        update((d) => {
                          d.customSections[globalIdx].content = e.target.value;
                        })
                      }
                      className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm min-h-[80px] resize-y"
                      placeholder="Summary content..."
                    />
                  );
                })}
            </div>
          )}

          {/* Experience — editable */}
          {section.section_type === "experience" && (
            <div className="space-y-4">
              {sectionExperiences(section.id)
                .sort((a, b) => {
                  if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
                  return (b.start_date || "").localeCompare(a.start_date || "");
                })
                .map((exp) => {
                  const globalIdx = draft.experiences.indexOf(exp);
                  return (
                    <div
                      key={exp.id}
                      className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            {exp.position}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {exp.company_name}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="text-[10px] font-medium text-zinc-400 mb-1 block uppercase tracking-wider">
                          Description
                        </label>
                        <textarea
                          value={exp.description || ""}
                          onChange={(e) =>
                            update((d) => {
                              d.experiences[globalIdx].description =
                                e.target.value;
                            })
                          }
                          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs min-h-[60px] resize-y"
                          placeholder="Role description..."
                        />
                      </div>

                      {/* Bullet points */}
                      <div>
                        <label className="text-[10px] font-medium text-zinc-400 mb-1 block uppercase tracking-wider">
                          Bullet Points
                        </label>
                        <div className="space-y-1.5">
                          {(exp.highlights || []).map(
                            (h: string, hIdx: number) => (
                              <div
                                key={hIdx}
                                className="flex items-start gap-1.5"
                              >
                                <span className="text-zinc-400 mt-2.5 select-none text-xs">
                                  •
                                </span>
                                <Input
                                  value={h}
                                  onChange={(e) =>
                                    update((d) => {
                                      d.experiences[globalIdx].highlights[
                                        hIdx
                                      ] = e.target.value;
                                    })
                                  }
                                  className="flex-1 text-xs h-8"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-zinc-400 hover:text-red-500 shrink-0"
                                  onClick={() =>
                                    update((d) => {
                                      d.experiences[
                                        globalIdx
                                      ].highlights.splice(hIdx, 1);
                                    })
                                  }
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-zinc-500 h-7"
                            onClick={() =>
                              update((d) => {
                                if (!d.experiences[globalIdx].highlights) {
                                  d.experiences[globalIdx].highlights = [];
                                }
                                d.experiences[globalIdx].highlights.push("");
                              })
                            }
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add bullet
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Skills — toggle visibility */}
          {section.section_type === "skills" && (
            <div className="space-y-3">
              {(() => {
                const skills = sectionSkills(section.id);
                const categories = new Map<string, Skill[]>();
                skills.forEach((skill) => {
                  const cat = skill.category || "General";
                  if (!categories.has(cat)) categories.set(cat, []);
                  categories.get(cat)!.push(skill);
                });
                return Array.from(categories.entries()).map(
                  ([category, categorySkills]) => (
                    <div key={category}>
                      {categories.size > 1 && (
                        <p className="text-xs font-medium text-zinc-500 mb-1.5">
                          {category}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {categorySkills.map((skill) => (
                          <Badge
                            key={skill.id}
                            variant="secondary"
                            className="text-xs py-0.5 px-2 cursor-default"
                          >
                            {skill.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                );
              })()}
              <p className="text-[10px] text-zinc-400">
                Skills are carried over from the variant generation. To add or
                remove skills, re-tailor the variant from the job tracker.
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
