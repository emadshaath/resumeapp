-- ============================================================
-- PAGE MARGIN: outer margin around the PDF page in pixels (at 96dpi). Default
-- 40 matches the previous hard-coded value so existing renders are unchanged.
-- 16-80 keeps content readable without becoming nonsense.
-- ============================================================
ALTER TABLE public.pdf_settings
  ADD COLUMN IF NOT EXISTS page_margin INTEGER NOT NULL DEFAULT 40
    CHECK (page_margin >= 16 AND page_margin <= 80);
