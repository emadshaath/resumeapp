-- ============================================================
-- PROFILE SNAPSHOTS (Version History)
-- ============================================================
CREATE TABLE IF NOT EXISTS profile_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  snapshot_type TEXT NOT NULL DEFAULT 'manual' CHECK (snapshot_type IN ('manual', 'auto_linkedin', 'auto_job_optimizer', 'auto_variant', 'auto_restore')),
  snapshot_data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profile_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own snapshots"
  ON profile_snapshots FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Owner can delete own snapshots"
  ON profile_snapshots FOR DELETE
  USING (auth.uid() = profile_id);

-- Service role inserts via API routes
CREATE POLICY "Service role can insert snapshots"
  ON profile_snapshots FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_profile_snapshots_profile ON profile_snapshots(profile_id, created_at DESC);
