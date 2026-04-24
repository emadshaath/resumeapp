-- Phase 20: AI Auto-Apply
-- Agent-driven job discovery + review queue + dual-tier submission (extension / server).

-- Per-user discovery rules
CREATE TABLE IF NOT EXISTS public.auto_apply_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  title_keywords TEXT[] NOT NULL DEFAULT '{}',
  excluded_companies TEXT[] NOT NULL DEFAULT '{}',
  locations TEXT[] NOT NULL DEFAULT '{}',
  remote_types TEXT[] NOT NULL DEFAULT '{}',
  salary_min INTEGER,
  seniority TEXT[] NOT NULL DEFAULT '{}',
  min_match_score INTEGER NOT NULL DEFAULT 70 CHECK (min_match_score BETWEEN 0 AND 100),
  sources TEXT[] NOT NULL DEFAULT '{greenhouse,lever}',
  company_slugs JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- One row per discovered posting that matched at least one rule
CREATE TABLE IF NOT EXISTS public.auto_apply_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES auto_apply_rules(id) ON DELETE SET NULL,
  job_application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES profile_variants(id) ON DELETE SET NULL,
  match_score INTEGER CHECK (match_score BETWEEN 0 AND 100),
  ai_answers JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review','approved','submitted','failed','skipped')),
  submit_mode TEXT CHECK (submit_mode IN ('extension','server')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_id, job_application_id)
);

-- Audit / cost log
CREATE TABLE IF NOT EXISTS public.auto_apply_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES auto_apply_candidates(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_auto_apply_rules_profile ON auto_apply_rules(profile_id);
CREATE INDEX IF NOT EXISTS idx_auto_apply_candidates_profile_status
  ON auto_apply_candidates(profile_id, status);
CREATE INDEX IF NOT EXISTS idx_auto_apply_candidates_created
  ON auto_apply_candidates(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_apply_events_candidate
  ON auto_apply_events(candidate_id, created_at DESC);

-- RLS
ALTER TABLE public.auto_apply_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_apply_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_apply_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own auto_apply_rules"
  ON auto_apply_rules FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can manage own auto_apply_candidates"
  ON auto_apply_candidates FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can read own auto_apply_events"
  ON auto_apply_events FOR SELECT
  USING (
    candidate_id IN (
      SELECT id FROM auto_apply_candidates WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own auto_apply_events"
  ON auto_apply_events FOR INSERT
  WITH CHECK (
    candidate_id IN (
      SELECT id FROM auto_apply_candidates WHERE profile_id = auth.uid()
    )
  );

-- Auto-update triggers (reuse update_updated_at from earlier migrations)
CREATE TRIGGER update_auto_apply_rules_updated_at
  BEFORE UPDATE ON public.auto_apply_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_auto_apply_candidates_updated_at
  BEFORE UPDATE ON public.auto_apply_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
