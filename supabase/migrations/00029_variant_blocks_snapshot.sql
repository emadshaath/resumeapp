-- ============================================================
-- VARIANT BLOCK SNAPSHOT: freeze the user's resume_blocks arrangement onto
-- each variant at creation time so editing the canvas later doesn't silently
-- re-skin a variant that was already tailored and used in a job application.
--
-- pdf_settings_snapshot already freezes typography + colour; this column
-- closes the matching loophole on layout/arrangement.
-- ============================================================
ALTER TABLE public.profile_variants
  ADD COLUMN IF NOT EXISTS blocks_snapshot JSONB;

-- Shape stored inside the JSONB:
--   ResumeBlock[] — one entry per block, with type, zone, display_order,
--   source_section_id, and style. Mirrors the shape of public.resume_blocks
--   minus the bookkeeping columns (id, profile_id, created_at, updated_at).
-- Legacy rows remain NULL and fall back to the user's live resume_blocks at
-- download time (matching today's behaviour).
