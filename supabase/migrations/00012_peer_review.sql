-- Peer Review: shareable pseudonymized resume links with comments

-- Review links table
CREATE TABLE public.review_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  pseudonymize_options JSONB NOT NULL DEFAULT '{"name": true, "email": true, "phone": true, "location": true, "companies": true}',
  expires_at TIMESTAMPTZ NOT NULL,
  password_hash TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE review_links ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own links
CREATE POLICY "Owner full access" ON review_links
  FOR ALL USING (auth.uid() = profile_id);

-- Public can read active, non-expired links (for the review page lookup)
CREATE POLICY "Public read active links" ON review_links
  FOR SELECT USING (is_active = true AND expires_at > now());

CREATE INDEX idx_review_links_token ON review_links(token);
CREATE INDEX idx_review_links_profile ON review_links(profile_id);

-- Review comments table
CREATE TABLE public.review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_link_id UUID NOT NULL REFERENCES review_links(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  section_id UUID REFERENCES resume_sections(id) ON DELETE SET NULL,
  section_type TEXT,
  reviewer_name TEXT,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can insert comments (public reviewers via API)
CREATE POLICY "Public can insert comments" ON review_comments
  FOR INSERT WITH CHECK (true);

-- Owner can read comments on their resume
CREATE POLICY "Owner can read comments" ON review_comments
  FOR SELECT USING (auth.uid() = profile_id);

-- Service role can read comments (for public review page)
CREATE POLICY "Service role full access" ON review_comments
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_review_comments_link ON review_comments(review_link_id);
CREATE INDEX idx_review_comments_profile ON review_comments(profile_id);
