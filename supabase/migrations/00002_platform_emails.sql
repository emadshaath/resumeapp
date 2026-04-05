-- ============================================================
-- PLATFORM EMAILS
-- ============================================================
CREATE TABLE public.platform_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email_address TEXT UNIQUE NOT NULL,
  routing_mode TEXT NOT NULL DEFAULT 'forward'
    CHECK (routing_mode IN ('forward', 'inbox')),
  forward_to TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE platform_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access" ON platform_emails FOR ALL USING (auth.uid() = profile_id);

-- ============================================================
-- EMAIL MESSAGES
-- ============================================================
CREATE TABLE public.email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_email_id UUID NOT NULL REFERENCES platform_emails(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_address TEXT NOT NULL,
  from_name TEXT,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  is_read BOOLEAN DEFAULT false,
  is_spam BOOLEAN DEFAULT false,
  spam_score REAL,
  received_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access" ON email_messages FOR ALL USING (auth.uid() = profile_id);
CREATE INDEX idx_email_messages_profile ON email_messages(profile_id, received_at DESC);
