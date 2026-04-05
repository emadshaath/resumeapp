-- AI Reviews table for storing Claude-powered resume analysis results
CREATE TABLE IF NOT EXISTS ai_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL DEFAULT 'full' CHECK (review_type IN ('full', 'section')),
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  ats_score INTEGER CHECK (ats_score >= 0 AND ats_score <= 100),
  recommendations JSONB NOT NULL DEFAULT '{}',
  raw_response JSONB,
  model_used TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying reviews by profile and type
CREATE INDEX idx_ai_reviews_profile ON ai_reviews(profile_id, review_type, created_at DESC);

-- RLS
ALTER TABLE ai_reviews ENABLE ROW LEVEL SECURITY;

-- Owner can view their own reviews
CREATE POLICY "Users can view own reviews"
  ON ai_reviews FOR SELECT
  USING (profile_id = auth.uid());

-- Insert via service role only (API routes)
CREATE POLICY "Service role can insert reviews"
  ON ai_reviews FOR INSERT
  WITH CHECK (true);
