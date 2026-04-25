-- ============================================================
-- PAGE SIZE: A4 (default, matches every existing render) or US Letter.
-- New users in North America typically expect Letter; everyone else A4.
-- ============================================================
ALTER TABLE public.pdf_settings
  ADD COLUMN IF NOT EXISTS page_size TEXT NOT NULL DEFAULT 'A4'
    CHECK (page_size IN ('A4', 'LETTER'));
