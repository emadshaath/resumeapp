-- ============================================================
-- VARIANT PDF SNAPSHOT: freeze the user's PDF styling onto each variant at
-- creation time so that later global style changes don't silently re-skin a
-- variant that was already tailored and used for a job application.
-- ============================================================
ALTER TABLE public.profile_variants
  ADD COLUMN IF NOT EXISTS pdf_settings_snapshot JSONB;

-- Shape stored inside the JSONB:
-- {
--   "layout": "classic" | "modern" | "minimal" | "executive",
--   "color_theme": "navy" | "teal" | "charcoal",
--   "font_family": "Helvetica" | "Times-Roman" | "Courier" | "Inter" | "Merriweather" | "Source Sans Pro",
--   "font_scale": 0.80 – 1.25,
--   "line_height": 1.15 – 1.85,
--   "spacing_scale": 0.80 – 1.30
-- }
-- Legacy rows remain NULL and fall back to the user's live pdf_settings at
-- download time.
