import type { Tier } from "@/types/database";

export type TemplateId =
  | "minimal"
  | "modern"
  | "executive"
  | "creative"
  | "developer"
  | "aurora";

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  tagline: string;
  description: string;
  tier: Tier; // minimum tier required
  /** Whether this template supports custom accent colors via template_accent / template_accent_alt */
  supportsCustomAccent?: boolean;
  /** Default accent colors when supportsCustomAccent is true */
  defaultAccent?: string;
  defaultAccentAlt?: string;
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "minimal",
    name: "Minimal",
    tagline: "Clean & Professional",
    description: "A timeless single-column layout that puts your content first.",
    tier: "free",
  },
  {
    id: "modern",
    name: "Modern",
    tagline: "Sidebar Layout",
    description: "Two-column design with skills and contact info in a sidebar.",
    tier: "pro",
  },
  {
    id: "executive",
    name: "Executive",
    tagline: "Formal & Traditional",
    description: "Serif typography and refined spacing for senior roles.",
    tier: "pro",
  },
  {
    id: "creative",
    name: "Creative",
    tagline: "Bold & Distinctive",
    description: "Asymmetric layout with large display headlines and strong color blocks.",
    tier: "premium",
  },
  {
    id: "developer",
    name: "Developer",
    tagline: "Terminal Inspired",
    description: "Monospace type and code-comment headers for engineers.",
    tier: "premium",
  },
  {
    id: "aurora",
    name: "Aurora",
    tagline: "Premium Product Feel",
    description: "Card-based layout with a soft violet/pink gradient. Customize the accent colors to match your brand.",
    tier: "premium",
    supportsCustomAccent: true,
    defaultAccent: "#7c4dff",
    defaultAccentAlt: "#ff54b0",
  },
];

export const DEFAULT_TEMPLATE: TemplateId = "minimal";

export function getTemplate(id: string): TemplateDefinition {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function isValidTemplate(id: string): id is TemplateId {
  return TEMPLATES.some((t) => t.id === id);
}

const TIER_LEVEL: Record<Tier, number> = { free: 0, pro: 1, premium: 2 };

/**
 * Whether a user with the given tier can use a given template.
 */
export function canUseTemplate(tier: Tier, templateId: string): boolean {
  const template = getTemplate(templateId);
  return TIER_LEVEL[tier] >= TIER_LEVEL[template.tier];
}

/**
 * If the user's selected template is no longer available (e.g. tier downgrade),
 * fall back to a template they can use.
 */
export function resolveTemplate(tier: Tier, templateId: string): TemplateId {
  return canUseTemplate(tier, templateId)
    ? (templateId as TemplateId)
    : DEFAULT_TEMPLATE;
}
