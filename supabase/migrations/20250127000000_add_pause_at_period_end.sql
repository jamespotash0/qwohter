-- Add pause_at_period_end column to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS pause_at_period_end BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN subscriptions.pause_at_period_end IS 'Whether the subscription is scheduled to pause at the end of the current period';

CREATE INDEX IF NOT EXISTS idx_subscriptions_pause_at_period_end ON subscriptions(pause_at_period_end) WHERE pause_at_period_end = true;
