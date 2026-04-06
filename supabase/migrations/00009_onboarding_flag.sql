-- Add onboarding_completed flag to profiles
ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
