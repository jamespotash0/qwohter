-- Add current_period_start column to subscriptions table
-- This tracks when the current billing period started
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN subscriptions.current_period_start IS 'Start date of the current billing period (from Stripe)';
