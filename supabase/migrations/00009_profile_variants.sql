-- Phase 10: Smart Tailor Engine
-- profile_variants table + variant_id on job_applications

CREATE TABLE public.profile_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  variant_data JSONB NOT NULL DEFAULT '{}',
  match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
  source TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'manual')),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profile_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own variants"
  ON profile_variants FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Users can insert own variants"
  ON profile_variants FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Users can update own variants"
  ON profile_variants FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "Users can delete own variants"
  ON profile_variants FOR DELETE USING (profile_id = auth.uid());

CREATE INDEX idx_profile_variants_profile ON profile_variants(profile_id);
CREATE INDEX idx_profile_variants_job ON profile_variants(job_application_id);

-- Add variant_id to job_applications
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES profile_variants(id) ON DELETE SET NULL;

-- Trigger to ensure only one default variant per profile
CREATE OR REPLACE FUNCTION public.enforce_single_default_variant()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.profile_variants
    SET is_default = false
    WHERE profile_id = NEW.profile_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_variant_default_change
  BEFORE INSERT OR UPDATE ON public.profile_variants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_default_variant();

-- Auto-update updated_at
CREATE TRIGGER update_profile_variants_updated_at
  BEFORE UPDATE ON public.profile_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
