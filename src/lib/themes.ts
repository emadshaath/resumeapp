export interface ThemeDefinition {
  id: string;
  name: string;
  tagline: string;
}

export const THEMES: ThemeDefinition[] = [
  { id: "midnight-indigo", name: "Midnight Indigo", tagline: "Bold & Professional" },
  { id: "ocean-teal", name: "Ocean Teal", tagline: "Fresh & Approachable" },
  { id: "emerald-pro", name: "Emerald Pro", tagline: "Clean & Trustworthy" },
  { id: "electric-blue", name: "Electric Blue", tagline: "Modern & Technical" },
  { id: "warm-neutral", name: "Warm Neutral", tagline: "Minimal & Elegant" },
];

export const DEFAULT_THEME = "midnight-indigo";

export function isValidTheme(id: string): boolean {
  return THEMES.some((t) => t.id === id);
}

/** Server-side accessible theme colors (extracted from globals.css) */
export const THEME_CSS_VARS: Record<string, { heroFrom: string; heroTo: string; brand: string }> = {
  "midnight-indigo": { heroFrom: "#312E81", heroTo: "#4F46E5", brand: "#4F46E5" },
  "ocean-teal": { heroFrom: "#115E59", heroTo: "#0D9488", brand: "#0D9488" },
  "emerald-pro": { heroFrom: "#064E3B", heroTo: "#059669", brand: "#059669" },
  "electric-blue": { heroFrom: "#1E3A8A", heroTo: "#2563EB", brand: "#2563EB" },
  "warm-neutral": { heroFrom: "#292524", heroTo: "#44403C", brand: "#292524" },
};
