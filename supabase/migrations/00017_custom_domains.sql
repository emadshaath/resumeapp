-- ============================================================
-- CUSTOM DOMAINS
-- Allows Premium users to connect their own domain to their profile.
-- ============================================================
CREATE TABLE public.custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  domain TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'failed')),
  verification_token TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access" ON custom_domains FOR ALL USING (auth.uid() = profile_id);

CREATE INDEX idx_custom_domains_profile ON custom_domains(profile_id);
CREATE INDEX idx_custom_domains_domain ON custom_domains(domain);
