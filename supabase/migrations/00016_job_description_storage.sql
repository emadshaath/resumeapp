-- Phase 1: Store full job description with formatting
ALTER TABLE job_applications ADD COLUMN job_description_html TEXT;

-- Phase 2: Frozen variant snapshot (resolved resume)
ALTER TABLE profile_variants ADD COLUMN resolved_resume JSONB;

-- Phase 7: Peer review for variants
ALTER TABLE review_links ADD COLUMN variant_id UUID REFERENCES profile_variants(id) ON DELETE SET NULL;
