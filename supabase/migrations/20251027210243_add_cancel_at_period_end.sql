-- Add cancel_at_period_end column to subscriptions table
-- This tracks whether a subscription is scheduled for cancellation at the end of the billing period
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'Whether the subscription is scheduled to cancel at the end of the current period';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_cancel_at_period_end ON subscriptions(cancel_at_period_end) WHERE cancel_at_period_end = true;
