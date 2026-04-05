-- ============================================================
-- PLATFORM PHONES (Twilio)
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL UNIQUE,
  twilio_sid TEXT NOT NULL,
  friendly_name TEXT,
  routing_mode TEXT NOT NULL DEFAULT 'voicemail' CHECK (routing_mode IN ('forward', 'voicemail', 'both')),
  forward_to TEXT,
  custom_greeting_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id)
);

ALTER TABLE platform_phones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own phone"
  ON platform_phones FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Owner can update own phone"
  ON platform_phones FOR UPDATE
  USING (auth.uid() = profile_id);

-- ============================================================
-- VOICEMAILS
-- ============================================================
CREATE TABLE IF NOT EXISTS voicemails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phone_id UUID NOT NULL REFERENCES platform_phones(id) ON DELETE CASCADE,
  caller_number TEXT NOT NULL,
  caller_city TEXT,
  caller_state TEXT,
  caller_country TEXT,
  call_sid TEXT NOT NULL UNIQUE,
  recording_url TEXT,
  recording_sid TEXT,
  recording_duration INTEGER,
  transcription TEXT,
  transcription_status TEXT DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'completed', 'failed')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_spam BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE voicemails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own voicemails"
  ON voicemails FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Owner can update own voicemails"
  ON voicemails FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE INDEX idx_voicemails_profile ON voicemails(profile_id, created_at DESC);
CREATE INDEX idx_voicemails_call_sid ON voicemails(call_sid);

-- Trigger for updated_at on platform_phones
CREATE TRIGGER set_platform_phones_updated_at
  BEFORE UPDATE ON platform_phones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
