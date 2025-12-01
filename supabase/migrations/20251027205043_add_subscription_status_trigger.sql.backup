-- Function to automatically set is_active based on stripe_subscription_status
CREATE OR REPLACE FUNCTION update_subscription_is_active()
RETURNS TRIGGER AS $$
BEGIN
  -- Set is_active based on stripe_subscription_status
  -- Valid statuses: active, trialing (case-insensitive)
  NEW.is_active := LOWER(NEW.stripe_subscription_status) IN ('Active', 'Trialing');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert or update
DROP TRIGGER IF EXISTS set_subscription_is_active ON subscriptions;
CREATE TRIGGER set_subscription_is_active
  BEFORE INSERT OR UPDATE OF stripe_subscription_status
  ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_is_active();

-- Update existing records to match their status
UPDATE subscriptions
SET is_active = LOWER(stripe_subscription_status) IN ('Active', 'Trialing')
WHERE stripe_subscription_status IS NOT NULL;

COMMENT ON FUNCTION update_subscription_is_active() IS 'Automatically sets is_active based on stripe_subscription_status';
