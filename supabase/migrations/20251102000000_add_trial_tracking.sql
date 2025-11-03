-- Add trial tracking columns to subscriptions table
-- These columns help display trial status and send reminders without constant Stripe API calls

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS has_payment_method BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_payment_reminder_sent_at TIMESTAMPTZ;

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end ON subscriptions(trial_end) WHERE trial_end IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_reminder ON subscriptions(last_payment_reminder_sent_at) WHERE has_payment_method = FALSE;

-- Add comments
COMMENT ON COLUMN subscriptions.trial_start IS 'Start date of the trial period (from Stripe)';
COMMENT ON COLUMN subscriptions.trial_end IS 'End date of the trial period (from Stripe)';
COMMENT ON COLUMN subscriptions.has_payment_method IS 'Whether the customer has added a payment method (from Stripe)';
COMMENT ON COLUMN subscriptions.last_payment_reminder_sent_at IS 'Last time we showed a payment method reminder toast';
