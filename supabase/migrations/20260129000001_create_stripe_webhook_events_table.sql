-- Track processed Stripe webhook event IDs for idempotency
-- Prevents duplicate processing when Stripe retries webhook delivery
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup during webhook processing
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id
  ON stripe_webhook_events(stripe_event_id);

-- Auto-cleanup: delete events older than 7 days (Stripe stops retrying after ~3 days)
-- Run periodically via pg_cron or manual cleanup
COMMENT ON TABLE stripe_webhook_events IS 'Tracks processed Stripe webhook events for idempotency. Safe to prune entries older than 7 days.';

-- Enable RLS with no policies — only service_role key can access this table
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
