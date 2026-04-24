import type { SupabaseClient } from "@supabase/supabase-js";
import type { PdfSettingsSnapshot } from "@/types/database";
import { DEFAULT_FONT_CONFIG } from "./types";

/**
 * Read the user's current pdf_settings row and return it as a snapshot payload
 * safe to embed on a `profile_variants.pdf_settings_snapshot` column.
 *
 * Falls back to defaults when the user has never saved PDF settings — that way
 * a variant always has a complete, self-contained styling record.
 */
export async function snapshotPdfSettings(
  supabase: SupabaseClient,
  profileId: string,
): Promise<PdfSettingsSnapshot> {
  const { data } = await supabase
    .from("pdf_settings")
    .select("layout, color_theme, font_family, font_scale, line_height, spacing_scale")
    .eq("profile_id", profileId)
    .single();

  return {
    layout: (data?.layout as PdfSettingsSnapshot["layout"]) || "classic",
    color_theme: (data?.color_theme as PdfSettingsSnapshot["color_theme"]) || "navy",
    font_family: (data?.font_family as PdfSettingsSnapshot["font_family"]) || DEFAULT_FONT_CONFIG.fontFamily,
    font_scale: data?.font_scale ?? DEFAULT_FONT_CONFIG.fontScale,
    line_height: data?.line_height ?? DEFAULT_FONT_CONFIG.lineHeight,
    spacing_scale: data?.spacing_scale ?? DEFAULT_FONT_CONFIG.spacingScale,
  };
}
