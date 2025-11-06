-- Add billing_interval column to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(20) DEFAULT 'monthly';

COMMENT ON COLUMN subscriptions.billing_interval IS 'Billing interval from Stripe: monthly or yearly';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_interval ON subscriptions(billing_interval);
