-- ============================================================
-- COLLAPSE PDF LAYOUTS into the block-driven Custom layout. The four
-- pre-existing layouts (classic, modern, minimal, executive) are now
-- starter templates that produce a Custom-layout block arrangement. The
-- pdf_settings.layout column collapses to a single allowed value: 'custom'.
--
-- Behaviour preservation: existing rows with layout != custom get flipped
-- to 'custom'. Their resume_blocks are not touched here — ensureBlocksSynced
-- runs on next page load and seeds the default arrangement (header + main
-- column). Users who want the Modern/Minimal/Executive look can apply the
-- matching starter from the Style panel; they keep the same content rows.
-- ============================================================

-- 1. Flip every row's layout to 'custom' before tightening the constraint.
UPDATE public.pdf_settings
  SET layout = 'custom', updated_at = now()
  WHERE layout <> 'custom';

-- 2. Replace the existing CHECK constraint with a single-value version.
ALTER TABLE public.pdf_settings DROP CONSTRAINT IF EXISTS pdf_settings_layout_check;
ALTER TABLE public.pdf_settings
  ADD CONSTRAINT pdf_settings_layout_check
  CHECK (layout = 'custom');

-- The default value already maps cleanly through; no need to alter the
-- column default. New rows inserted without a layout will continue to land
-- on 'custom' (the prior default was 'classic' but every code path that
-- writes pdf_settings now sends 'custom').
ALTER TABLE public.pdf_settings ALTER COLUMN layout SET DEFAULT 'custom';
