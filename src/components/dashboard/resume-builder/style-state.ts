import type {
  PdfLayout,
  PdfColorTheme,
  PdfFontConfig,
  PdfFontFamily,
  PdfSettings,
} from "@/lib/pdf/types";
import { DEFAULT_FONT_CONFIG } from "@/lib/pdf/types";
import type { PageTemplate } from "@/types/database";

/**
 * The full set of values controlled by the StylePanel. Holding all of them
 * in one shape lets the Studio and Builder share a single useState<StyleState>
 * and one onChange handler.
 */
export interface StyleState {
  layout: PdfLayout;
  colorTheme: PdfColorTheme;
  pageTemplate: PageTemplate;
  sidebarWidth: number;
  showOnProfile: boolean;
  fontConfig: PdfFontConfig;
}

export const DEFAULT_STYLE_STATE: StyleState = {
  layout: "classic",
  colorTheme: "navy",
  pageTemplate: "single-column",
  sidebarWidth: 180,
  showOnProfile: false,
  fontConfig: { ...DEFAULT_FONT_CONFIG },
};

/** Build a StyleState from a saved pdf_settings row, falling back to defaults. */
export function styleStateFromSettings(s: PdfSettings | null): StyleState {
  if (!s) return { ...DEFAULT_STYLE_STATE };
  return {
    layout: (s.layout as PdfLayout) || "classic",
    colorTheme: (s.color_theme as PdfColorTheme) || "navy",
    pageTemplate: (s.page_template as PageTemplate) || "single-column",
    sidebarWidth: s.sidebar_width ?? 180,
    showOnProfile: s.show_on_profile ?? false,
    fontConfig: {
      fontFamily: (s.font_family as PdfFontFamily) || DEFAULT_FONT_CONFIG.fontFamily,
      fontScale: s.font_scale ?? DEFAULT_FONT_CONFIG.fontScale,
      lineHeight: s.line_height ?? DEFAULT_FONT_CONFIG.lineHeight,
      spacingScale: s.spacing_scale ?? DEFAULT_FONT_CONFIG.spacingScale,
    },
  };
}

/** Stable string fingerprint of a StyleState — used to detect dirty state. */
export function styleFingerprint(s: StyleState): string {
  return [
    s.layout,
    s.colorTheme,
    s.pageTemplate,
    String(s.sidebarWidth),
    s.showOnProfile ? "1" : "0",
    s.fontConfig.fontFamily,
    s.fontConfig.fontScale.toFixed(2),
    s.fontConfig.lineHeight.toFixed(2),
    s.fontConfig.spacingScale.toFixed(2),
  ].join("|");
}

/** Body payload for POST /api/pdf/settings derived from a StyleState. */
export function styleStateToSavePayload(s: StyleState) {
  return {
    layout: s.layout,
    color_theme: s.colorTheme,
    show_on_profile: s.showOnProfile,
    font_family: s.fontConfig.fontFamily,
    font_scale: s.fontConfig.fontScale,
    line_height: s.fontConfig.lineHeight,
    spacing_scale: s.fontConfig.spacingScale,
    page_template: s.pageTemplate,
    sidebar_width: s.sidebarWidth,
  };
}

/** Query string for /api/autofill/resume.pdf?... derived from a StyleState. */
export function styleStateToDownloadQuery(s: StyleState): URLSearchParams {
  return new URLSearchParams({
    layout: s.layout,
    theme: s.colorTheme,
    font: s.fontConfig.fontFamily,
    fontScale: String(s.fontConfig.fontScale),
    lineHeight: String(s.fontConfig.lineHeight),
    spacingScale: String(s.fontConfig.spacingScale),
    pageTemplate: s.pageTemplate,
    sidebarWidth: String(s.sidebarWidth),
  });
}
