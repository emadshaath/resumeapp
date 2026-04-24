-- ============================================================
-- CUSTOM PDF LAYOUT: add 'custom' as an allowed value for
-- pdf_settings.layout so the block-driven renderer can be selected.
-- The snapshot stored on profile_variants.pdf_settings_snapshot is JSONB
-- and has no column-level check, so no change is needed there.
-- ============================================================
ALTER TABLE public.pdf_settings DROP CONSTRAINT IF EXISTS pdf_settings_layout_check;
ALTER TABLE public.pdf_settings
  ADD CONSTRAINT pdf_settings_layout_check
  CHECK (layout IN ('classic', 'modern', 'minimal', 'executive', 'custom'));
