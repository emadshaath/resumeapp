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
