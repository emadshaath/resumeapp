-- Add tier_override column for manual premium grants
-- This column takes precedence over the Stripe-managed `tier` field.
-- Stripe webhooks only write to `tier`, never `tier_override`.

ALTER TABLE profiles
  ADD COLUMN tier_override TEXT DEFAULT NULL
  CHECK (tier_override IN ('free', 'pro', 'premium'));
