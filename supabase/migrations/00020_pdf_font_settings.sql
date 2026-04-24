-- ============================================================
-- PDF FONT SETTINGS: extend pdf_settings with typography & spacing controls
-- for the live PDF Studio editor
-- ============================================================
ALTER TABLE public.pdf_settings
  ADD COLUMN IF NOT EXISTS font_family TEXT NOT NULL DEFAULT 'Helvetica'
    CHECK (font_family IN (
      'Helvetica',
      'Times-Roman',
      'Courier',
      'Inter',
      'Merriweather',
      'Source Sans Pro'
    )),
  ADD COLUMN IF NOT EXISTS font_scale REAL NOT NULL DEFAULT 1.0
    CHECK (font_scale >= 0.80 AND font_scale <= 1.25),
  ADD COLUMN IF NOT EXISTS line_height REAL NOT NULL DEFAULT 1.45
    CHECK (line_height >= 1.15 AND line_height <= 1.85),
  ADD COLUMN IF NOT EXISTS spacing_scale REAL NOT NULL DEFAULT 1.0
    CHECK (spacing_scale >= 0.80 AND spacing_scale <= 1.30);
