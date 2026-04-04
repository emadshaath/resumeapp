"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Sparkles, X } from "lucide-react";
import type { ResumeSection, Experience, Education, Skill, Certification, Project } from "@/types/database";
import type { SuggestionItem } from "@/lib/claude/schemas";

interface SectionContentEditorProps {
  section: ResumeSection;
  onUpdate: () => void;
}

function AISuggestButton({ section }: { section: ResumeSection }) {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  async function getSuggestions() {
    setLoading(true);
    setError(null);
    setSuggestions([]);
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
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
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
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {suggestions.map((s, i) => (
            <div key={i} className="mb-2 last:mb-0">
              <div className="flex items-start gap-2">
                <Badge className={`text-xs shrink-0 mt-0.5 ${typeColors[s.type] || ""}`}>
                  {s.type}
                </Badge>
                <div className="text-sm text-zinc-700 dark:text-zinc-300">
                  <p>{s.text}</p>
                  {s.example && (
                    <p className="mt-1 text-xs text-zinc-500 italic border-l-2 border-purple-300 pl-2">
                      Example: {s.example}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SectionContentEditor({ section, onUpdate }: SectionContentEditorProps) {
  return (
    <div className="space-y-4">
      {(() => {
        switch (section.section_type) {
          case "summary":
            return <SummaryEditor section={section} onUpdate={onUpdate} />;
          case "experience":
            return <ExperienceEditor section={section} onUpdate={onUpdate} />;
          case "education":
            return <EducationEditor section={section} onUpdate={onUpdate} />;
          case "skills":
            return <SkillsEditor section={section} onUpdate={onUpdate} />;
          case "certifications":
            return <CertificationsEditor section={section} onUpdate={onUpdate} />;
          case "projects":
            return <ProjectsEditor section={section} onUpdate={onUpdate} />;
          case "custom":
            return <CustomEditor section={section} onUpdate={onUpdate} />;
          default:
            return null;
        }
      })()}
      <AISuggestButton section={section} />
    </div>
  );
}

// === SUMMARY EDITOR ===
function SummaryEditor({ section, onUpdate }: SectionContentEditorProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("custom_sections")
      .select("*")
      .eq("section_id", section.id)
      .single()
      .then(({ data }) => {
        if (data) setContent(data.content || "");
      });
  }, [section.id, supabase]);

  async function save() {
    setSaving(true);
    const { data: existing } = await supabase
      .from("custom_sections")
      .select("id")
      .eq("section_id", section.id)
      .single();

    if (existing) {
      await supabase.from("custom_sections").update({ content }).eq("id", existing.id);
    } else {
      await supabase.from("custom_sections").insert({
        section_id: section.id,
        profile_id: section.profile_id,
        content,
      });
    }
    setSaving(false);
    onUpdate();
  }

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Write your professional summary..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
      />
      <Button size="sm" onClick={save} disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}

// === EXPERIENCE EDITOR ===
function ExperienceEditor({ section, onUpdate }: SectionContentEditorProps) {
  const [items, setItems] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("experiences")
      .select("*")
      .eq("section_id", section.id)
      .order("display_order");
    if (data) setItems(data as Experience[]);
    setLoading(false);
  }, [section.id, supabase]);

  useEffect(() => { load(); }, [load]);

  async function addItem() {
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
    if (data) { setItems([...items, data as Experience]); }
  }

  async function updateItem(id: string, updates: Partial<Experience>) {
    await supabase.from("experiences").update(updates).eq("id", id);
    setItems(items.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  }

  async function deleteItem(id: string) {
    await supabase.from("experiences").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
    onUpdate();
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading...</p>;

  return (
    <div className="space-y-4">
      {items.map((item) => (
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 ml-2"
                onClick={() => deleteItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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
                placeholder="Describe your role and responsibilities..."
                rows={3}
              />
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
  const supabase = createClient();

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

  async function addItem() {
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
    if (data) setItems([...items, data as Education]);
  }

  async function updateItem(id: string, updates: Partial<Education>) {
    await supabase.from("educations").update(updates).eq("id", id);
    setItems(items.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  }

  async function deleteItem(id: string) {
    await supabase.from("educations").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
    onUpdate();
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading...</p>;

  return (
    <div className="space-y-4">
      {items.map((item) => (
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 ml-2"
                onClick={() => deleteItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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
function SkillsEditor({ section, onUpdate }: SectionContentEditorProps) {
  const [items, setItems] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

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

  async function addItem() {
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
    if (data) setItems([...items, data as Skill]);
  }

  async function updateItem(id: string, updates: Partial<Skill>) {
    await supabase.from("skills").update(updates).eq("id", id);
    setItems(items.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  }

  async function deleteItem(id: string) {
    await supabase.from("skills").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading...</p>;

  return (
    <div className="space-y-3">
      {items.map((item) => (
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
function CertificationsEditor({ section, onUpdate }: SectionContentEditorProps) {
  const [items, setItems] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

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

  async function addItem() {
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
    if (data) setItems([...items, data as Certification]);
  }

  async function updateItem(id: string, updates: Partial<Certification>) {
    await supabase.from("certifications").update(updates).eq("id", id);
    setItems(items.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  }

  async function deleteItem(id: string) {
    await supabase.from("certifications").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading...</p>;

  return (
    <div className="space-y-4">
      {items.map((item) => (
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 ml-2"
                onClick={() => deleteItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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
function ProjectsEditor({ section, onUpdate }: SectionContentEditorProps) {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

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

  async function addItem() {
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
    if (data) setItems([...items, data as Project]);
  }

  async function updateItem(id: string, updates: Partial<Project>) {
    await supabase.from("projects").update(updates).eq("id", id);
    setItems(items.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  }

  async function deleteItem(id: string) {
    await supabase.from("projects").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading...</p>;

  return (
    <div className="space-y-4">
      {items.map((item) => (
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 ml-2"
                onClick={() => deleteItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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
