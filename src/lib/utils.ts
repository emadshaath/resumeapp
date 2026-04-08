import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "billing",
  "blog",
  "contact",
  "dashboard",
  "docs",
  "help",
  "login",
  "logout",
  "mail",
  "p",
  "pricing",
  "settings",
  "signup",
  "status",
  "support",
  "www",
]);

export function isValidSlug(slug: string): boolean {
  if (slug.length < 3 || slug.length > 63) return false;
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return true;
}

export function ensureAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

/**
 * Supabase may return JSONB columns as strings. This ensures
 * the `highlights` field on Experience rows is always a string[].
 */
export function parseHighlights(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed; } catch { /* ignore */ }
  }
  return [];
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}
