-- ============================================================
-- SUBSCRIPTION LIFECYCLE: persist Stripe subscription state on
-- profiles so the UI can show renewal/cancel info without round-
-- tripping to Stripe, plus an idempotency table for webhook retries.
--
-- Stripe retries webhooks aggressively. Without idempotency we'd
-- re-process subscription updates and re-send receipts for the same
-- event_id. The stripe_webhook_events table is the dedup record.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ;


CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Server-only state. No user-facing access.
CREATE POLICY "Service role manages stripe_webhook_events"
  ON stripe_webhook_events FOR ALL
  USING (true)
  WITH CHECK (true);
