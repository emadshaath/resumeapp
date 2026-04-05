-- Phase 13: Job Tracker & Smart Apply
-- Tables for tracking job applications and status events

-- Job Applications
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  job_url TEXT,
  status TEXT NOT NULL DEFAULT 'saved' CHECK (status IN ('saved','applied','screening','interview','offer','accepted','rejected','withdrawn')),
  applied_date DATE,
  source TEXT DEFAULT 'manual',
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  location TEXT,
  remote_type TEXT CHECK (remote_type IN ('onsite','remote','hybrid')),
  parsed_data JSONB DEFAULT '{}',
  match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
  notes TEXT,
  follow_up_date DATE,
  contact_name TEXT,
  contact_email TEXT,
  resume_variant TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Job Application Events (status change history)
CREATE TABLE IF NOT EXISTS job_application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_job_applications_profile ON job_applications(profile_id);
CREATE INDEX idx_job_applications_status ON job_applications(profile_id, status);
CREATE INDEX idx_job_applications_created ON job_applications(profile_id, created_at DESC);
CREATE INDEX idx_job_events_application ON job_application_events(job_application_id);

-- RLS Policies
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_application_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own job applications"
  ON job_applications FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can manage own job events"
  ON job_application_events FOR ALL
  USING (
    job_application_id IN (
      SELECT id FROM job_applications WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    job_application_id IN (
      SELECT id FROM job_applications WHERE profile_id = auth.uid()
    )
  );
