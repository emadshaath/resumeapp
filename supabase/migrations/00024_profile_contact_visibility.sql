-- ============================================================
-- CONTACT VISIBILITY: per-user flags for hiding email / phone from
-- the resume and public profile page.
-- Defaults true so existing users see no behavioural change.
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_email BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_phone BOOLEAN NOT NULL DEFAULT true;
