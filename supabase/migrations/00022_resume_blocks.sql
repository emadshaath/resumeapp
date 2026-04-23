-- ============================================================
-- RESUME BLOCKS: per-user arrangement metadata for the block-based builder.
-- Content continues to live in resume_sections / experiences / educations /
-- skills / certifications / projects / custom_sections. A block references
-- a resume_sections row (and inherits its content) + carries visual style
-- overrides and zone/order placement.
-- ============================================================

CREATE TABLE public.resume_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'header','summary','experience','education','skills',
    'certifications','projects','custom','divider','spacer'
  )),
  zone TEXT NOT NULL DEFAULT 'main' CHECK (zone IN ('header','main','sidebar')),
  display_order INTEGER NOT NULL DEFAULT 0,
  -- Optional link to a resume_sections row for content-backed blocks.
  -- NULL for header/divider/spacer/custom-text blocks that carry their own content.
  source_section_id UUID REFERENCES public.resume_sections(id) ON DELETE SET NULL,
  -- Per-block visual overrides. See lib/blocks/types.ts for supported keys.
  style JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_resume_blocks_profile ON public.resume_blocks(profile_id);
CREATE INDEX idx_resume_blocks_profile_zone_order
  ON public.resume_blocks(profile_id, zone, display_order);

ALTER TABLE public.resume_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks"
  ON public.resume_blocks FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own blocks"
  ON public.resume_blocks FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own blocks"
  ON public.resume_blocks FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Users can delete own blocks"
  ON public.resume_blocks FOR DELETE
  USING (profile_id = auth.uid());

-- Service role can read for public PDF generation.
CREATE POLICY "Service role can read resume_blocks"
  ON public.resume_blocks FOR SELECT
  USING (true);

CREATE TRIGGER update_resume_blocks_updated_at
  BEFORE UPDATE ON public.resume_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Page-level arrangement lives on pdf_settings (already per-profile).
ALTER TABLE public.pdf_settings
  ADD COLUMN IF NOT EXISTS page_template TEXT NOT NULL DEFAULT 'single-column'
    CHECK (page_template IN ('single-column','sidebar-left')),
  ADD COLUMN IF NOT EXISTS sidebar_width INTEGER NOT NULL DEFAULT 180
    CHECK (sidebar_width >= 120 AND sidebar_width <= 260);
