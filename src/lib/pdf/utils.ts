export function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function formatDateRange(start: string | null, end: string | null, isCurrent: boolean): string {
  const s = formatDate(start);
  const e = isCurrent ? "Present" : formatDate(end);
  if (!s && !e) return "";
  if (!s) return e;
  return `${s} – ${e}`;
}

import type { Skill } from "@/types/database";

export function groupSkillsByCategory(skills: Skill[]) {
  const map = new Map<string, Skill[]>();
  for (const skill of skills) {
    const cat = skill.category || "General";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(skill);
  }
  return map;
}
