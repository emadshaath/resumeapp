-- ============================================================
-- CONTACT VISIBILITY (part 2): add location + website toggles to match
-- the show_email / show_phone flags from migration 00024. Defaults true
-- to preserve existing behaviour.
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_location BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_website BOOLEAN NOT NULL DEFAULT true;
