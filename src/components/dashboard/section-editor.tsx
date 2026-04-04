"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import type { ResumeSection, Experience, Education, Skill, Certification, Project } from "@/types/database";

interface SectionContentEditorProps {
  section: ResumeSection;
  onUpdate: () => void;
}

export function SectionContentEditor({ section, onUpdate }: SectionContentEditorProps) {
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
              <div className="grid grid-cols-2 gap-3 flex-1">
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
                <div className="grid grid-cols-2 gap-2">
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
              <div className="grid grid-cols-2 gap-3 flex-1">
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
                <div className="grid grid-cols-2 gap-2">
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
        <div key={item.id} className="flex items-center gap-2">
          <Input
            value={item.name}
            onChange={(e) => updateItem(item.id, { name: e.target.value })}
            placeholder="Skill name"
            className="flex-1"
          />
          <Input
            value={item.category || ""}
            onChange={(e) => updateItem(item.id, { category: e.target.value })}
            placeholder="Category"
            className="w-36"
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
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteItem(item.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
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
              <div className="grid grid-cols-2 gap-3 flex-1">
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
              <div className="grid grid-cols-2 gap-3 flex-1">
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
