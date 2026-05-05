-- ============================================================
-- AI USAGE: per-call audit log + Postgres-backed token bucket for
-- short-term throttling. Replaces ad-hoc row counts on ai_reviews
-- and the in-memory rate limiter for AI endpoints.
--
-- ai_usage_events  -> every Anthropic call, ok or error, drives
--                     monthly cap counters and analytics.
-- ai_throttle_buckets -> single row per (profile, feature) for
--                     short-term spam throttling.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN (
    'ai_review',
    'ai_suggest',
    'ai_apply',
    'ai_form_answers',
    'job_parse',
    'linkedin_analyze',
    'resume_import',
    'smart_tailor'
  )),
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'error', 'rate_limited')),
  tokens_in INTEGER,
  tokens_out INTEGER,
  model TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_profile_feature_created
  ON ai_usage_events (profile_id, feature, created_at DESC);

ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai_usage_events"
  ON ai_usage_events FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Service role can insert ai_usage_events"
  ON ai_usage_events FOR INSERT
  WITH CHECK (true);


CREATE TABLE IF NOT EXISTS public.ai_throttle_buckets (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, feature)
);

ALTER TABLE ai_throttle_buckets ENABLE ROW LEVEL SECURITY;

-- Buckets are server-only state; no user-facing read policy.
CREATE POLICY "Service role manages throttle buckets"
  ON ai_throttle_buckets FOR ALL
  USING (true)
  WITH CHECK (true);


-- Atomic token-bucket bump. Returns the new count after this call.
-- Resets the window if the existing window has expired.
CREATE OR REPLACE FUNCTION public.bump_ai_throttle(
  p_profile_id UUID,
  p_feature TEXT,
  p_window_seconds INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO ai_throttle_buckets (profile_id, feature, window_start, count)
  VALUES (p_profile_id, p_feature, now(), 1)
  ON CONFLICT (profile_id, feature) DO UPDATE
  SET
    window_start = CASE
      WHEN ai_throttle_buckets.window_start < (now() - make_interval(secs => p_window_seconds))
        THEN now()
      ELSE ai_throttle_buckets.window_start
    END,
    count = CASE
      WHEN ai_throttle_buckets.window_start < (now() - make_interval(secs => p_window_seconds))
        THEN 1
      ELSE ai_throttle_buckets.count + 1
    END
  RETURNING count INTO v_count;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_ai_throttle(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_ai_throttle(UUID, TEXT, INTEGER) TO service_role;
