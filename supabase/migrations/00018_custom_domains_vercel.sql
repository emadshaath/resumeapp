-- ============================================================
-- CUSTOM DOMAINS: Vercel integration
-- Stores the verification challenges returned by Vercel's Domains API
-- so the dashboard can show exact CNAME/TXT records for the user to add.
-- ============================================================
ALTER TABLE public.custom_domains
  ADD COLUMN vercel_verification JSONB;
