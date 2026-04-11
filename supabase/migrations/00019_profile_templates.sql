-- ============================================================
-- PROFILE TEMPLATES
-- Adds layout template selection alongside the existing color theme.
-- Templates are layout components shipped with the app; theme controls color.
--
-- The Aurora template additionally supports per-profile accent color overrides
-- (the violet/pink gradient is its identity, but users can customize it).
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN profile_template TEXT NOT NULL DEFAULT 'minimal'
    CHECK (profile_template IN ('minimal', 'modern', 'executive', 'creative', 'developer', 'aurora')),
  ADD COLUMN template_accent TEXT,
  ADD COLUMN template_accent_alt TEXT;
