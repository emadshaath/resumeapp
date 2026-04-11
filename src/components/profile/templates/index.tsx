import { resolveTemplate } from "@/lib/templates/registry";
import { getEffectiveTier } from "@/lib/stripe/feature-gate";
import type { Tier } from "@/types/database";
import type { TemplateProps } from "./types";
import { MinimalTemplate } from "./minimal";
import { ModernTemplate } from "./modern";
import { ExecutiveTemplate } from "./executive";
import { CreativeTemplate } from "./creative";
import { DeveloperTemplate } from "./developer";
import { AuroraTemplate } from "./aurora";

/**
 * Renders the appropriate template for the profile.
 * Falls back to Minimal if the user's selected template is no longer
 * available for their current tier (e.g. after a downgrade).
 */
export function TemplateRenderer(props: TemplateProps) {
  const effectiveTier = getEffectiveTier(
    props.profile.tier as Tier,
    props.profile.tier_override as Tier | null
  );
  const templateId = resolveTemplate(effectiveTier, props.profile.profile_template);

  switch (templateId) {
    case "modern":
      return <ModernTemplate {...props} />;
    case "executive":
      return <ExecutiveTemplate {...props} />;
    case "creative":
      return <CreativeTemplate {...props} />;
    case "developer":
      return <DeveloperTemplate {...props} />;
    case "aurora":
      return <AuroraTemplate {...props} />;
    case "minimal":
    default:
      return <MinimalTemplate {...props} />;
  }
}
