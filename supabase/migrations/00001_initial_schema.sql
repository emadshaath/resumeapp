-- ============================================================
-- CORE: profiles (extends auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  headline TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  location TEXT,
  website_url TEXT,
  phone_personal TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'premium')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Public can view published profiles" ON profiles FOR SELECT USING (is_published = true);

-- ============================================================
-- RESUME SECTIONS (flexible, orderable)
-- ============================================================
CREATE TABLE public.resume_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (section_type IN (
    'summary', 'experience', 'education', 'skills',
    'certifications', 'projects', 'custom'
  )),
  title TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE resume_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access" ON resume_sections FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Public read for published" ON resume_sections FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = resume_sections.profile_id AND profiles.is_published = true));

-- ============================================================
-- EXPERIENCES
-- ============================================================
CREATE TABLE public.experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES resume_sections(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  position TEXT NOT NULL,
  location TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  description TEXT,
  highlights JSONB DEFAULT '[]',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access" ON experiences FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Public read for published" ON experiences FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = experiences.profile_id AND profiles.is_published = true));

-- ============================================================
-- EDUCATIONS
-- ============================================================
CREATE TABLE public.educations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES resume_sections(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  degree TEXT,
  field_of_study TEXT,
  location TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  gpa TEXT,
  description TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE educations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access" ON educations FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Public read for published" ON educations FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = educations.profile_id AND profiles.is_published = true));

-- ============================================================
-- SKILLS
-- ============================================================
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES resume_sections(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  proficiency TEXT CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
  category TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access" ON skills FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Public read for published" ON skills FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = skills.profile_id AND profiles.is_published = true));

-- ============================================================
-- CERTIFICATIONS
-- ============================================================
CREATE TABLE public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES resume_sections(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuing_org TEXT,
  issue_date DATE,
  expiry_date DATE,
  credential_url TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access" ON certifications FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Public read for published" ON certifications FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = certifications.profile_id AND profiles.is_published = true));

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES resume_sections(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  start_date DATE,
  end_date DATE,
  highlights JSONB DEFAULT '[]',
  technologies JSONB DEFAULT '[]',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access" ON projects FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Public read for published" ON projects FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = projects.profile_id AND profiles.is_published = true));

-- ============================================================
-- CUSTOM SECTIONS
-- ============================================================
CREATE TABLE public.custom_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES resume_sections(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE custom_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access" ON custom_sections FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Public read for published" ON custom_sections FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = custom_sections.profile_id AND profiles.is_published = true));

-- ============================================================
-- CONTACT SUBMISSIONS
-- ============================================================
CREATE TABLE public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_spam BOOLEAN DEFAULT false,
  spam_score REAL,
  ip_address INET,
  user_agent TEXT,
  captcha_passed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can read" ON contact_submissions FOR SELECT USING (auth.uid() = profile_id);

-- ============================================================
-- PAGE VIEWS (analytics)
-- ============================================================
CREATE TABLE public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  visitor_id TEXT,
  path TEXT NOT NULL DEFAULT '/',
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  ip_hash TEXT,
  session_duration INT,
  viewed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can read own analytics" ON page_views FOR SELECT USING (auth.uid() = profile_id);
CREATE INDEX idx_page_views_profile_date ON page_views(profile_id, viewed_at);

-- ============================================================
-- SEO SETTINGS
-- ============================================================
CREATE TABLE public.seo_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meta_title TEXT,
  meta_description TEXT,
  og_image_url TEXT,
  custom_keywords TEXT[],
  json_ld_overrides JSONB,
  robots_directives TEXT DEFAULT 'index, follow',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE seo_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access" ON seo_settings FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Public read for published" ON seo_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = seo_settings.profile_id AND profiles.is_published = true));

-- ============================================================
-- FUNCTION: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, slug, first_name, last_name, email)
  VALUES (
    NEW.id,
    LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), ' ', '-')),
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNCTION: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_resume_sections_updated_at BEFORE UPDATE ON resume_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_experiences_updated_at BEFORE UPDATE ON experiences FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_educations_updated_at BEFORE UPDATE ON educations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_seo_settings_updated_at BEFORE UPDATE ON seo_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
