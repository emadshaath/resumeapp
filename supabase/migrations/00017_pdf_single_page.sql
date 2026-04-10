-- Add single_page option to pdf_settings for compact one-page resume generation
ALTER TABLE public.pdf_settings
  ADD COLUMN single_page BOOLEAN NOT NULL DEFAULT false;
