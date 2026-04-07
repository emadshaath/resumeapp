-- Application preferences: EEO, work authorization, and common form-fill fields
-- These are stored so the extension can fill them consistently without AI guessing.
-- All fields are optional and nullable. 

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS work_authorization TEXT DEFAULT NULL,        -- 'yes' | 'no'
  ADD COLUMN IF NOT EXISTS sponsorship_required TEXT DEFAULT NULL,      -- 'yes' | 'no' | 'future'
  ADD COLUMN IF NOT EXISTS gender_identity TEXT DEFAULT NULL,           -- free text or 'prefer_not_to_say'
  ADD COLUMN IF NOT EXISTS pronouns TEXT DEFAULT NULL,                  -- 'he/him' | 'she/her' | 'they/them' | etc.
  ADD COLUMN IF NOT EXISTS race_ethnicity TEXT DEFAULT NULL,            -- free text or 'prefer_not_to_say'
  ADD COLUMN IF NOT EXISTS veteran_status TEXT DEFAULT NULL,            -- 'veteran' | 'not_veteran' | 'prefer_not_to_say'
  ADD COLUMN IF NOT EXISTS disability_status TEXT DEFAULT NULL,         -- 'yes' | 'no' | 'prefer_not_to_say'
  ADD COLUMN IF NOT EXISTS lgbtq_identity TEXT DEFAULT NULL,            -- 'yes' | 'no' | 'prefer_not_to_say'
  ADD COLUMN IF NOT EXISTS salary_expectation TEXT DEFAULT NULL,        -- e.g. '120000' or '100000-130000'
  ADD COLUMN IF NOT EXISTS notice_period TEXT DEFAULT NULL,             -- e.g. '2 weeks' | 'immediate' | '1 month'
  ADD COLUMN IF NOT EXISTS preferred_work_setting TEXT DEFAULT NULL,    -- 'remote' | 'hybrid' | 'onsite'
  ADD COLUMN IF NOT EXISTS how_heard_default TEXT DEFAULT NULL;         -- default answer for "how did you hear"
