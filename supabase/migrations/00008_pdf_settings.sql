-- ============================================================
-- PDF SETTINGS: per-user layout and theme preferences for PDF resume generation
-- ============================================================
CREATE TABLE public.pdf_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  layout TEXT NOT NULL DEFAULT 'classic' CHECK (layout IN ('classic', 'modern', 'minimal', 'executive')),
  color_theme TEXT NOT NULL DEFAULT 'navy' CHECK (color_theme IN ('navy', 'teal', 'charcoal')),
  show_on_profile BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_id)
);

ALTER TABLE pdf_settings ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own PDF settings
CREATE POLICY "Users can view own pdf_settings"
  ON pdf_settings FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own pdf_settings"
  ON pdf_settings FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own pdf_settings"
  ON pdf_settings FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete own pdf_settings"
  ON pdf_settings FOR DELETE
  USING (auth.uid() = profile_id);

-- Service role can read for public PDF generation
CREATE POLICY "Service role can read pdf_settings"
  ON pdf_settings FOR SELECT
  USING (true);
