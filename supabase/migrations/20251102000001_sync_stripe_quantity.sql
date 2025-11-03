-- Stripe Quantity Sync Strategy
-- ================================
--
-- CURRENT BEHAVIOR:
-- - The sync_subscription_user_count trigger updates subscriptions.number_of_users locally
-- - This count is accurate and reflects active team members in real-time
-- - The local count is used for billing calculations and display
--
-- STRIPE SYNC:
-- - Stripe subscription quantity is synced via the manage-seats Edge Function
-- - This Edge Function handles proration automatically (proration_behavior: 'always_invoice')
-- - Syncing can be triggered in three ways:
--
-- 1. AUTOMATIC: Stripe webhook events (subscription.updated)
--    - When Stripe bills at period end, it uses the correct quantity
--    - No manual intervention needed for billing accuracy
--
-- 2. MANUAL: Team members management UI
--    - When adding/removing members, call manage-seats Edge Function
--    - Provides immediate Stripe sync with proration
--    - Example: After adding a member, call manage-seats with action='add'
--
-- 3. SCHEDULED: Periodic sync (optional, not yet implemented)
--    - Create a scheduled Edge Function that runs hourly
--    - Compares local number_of_users with Stripe subscription quantity
--    - Syncs any differences found
--
-- WHY NOT USE TRIGGERS?
-- - Database triggers cannot reliably call Edge Functions
-- - Requires pg_net extension and complex error handling
-- - Can cause transaction failures if Edge Function is slow/unavailable
-- - Better to handle sync at application level or via scheduled jobs
--
-- IMPLEMENTATION RECOMMENDATION:
-- - Keep current local sync trigger (fast, reliable)
-- - Add manage-seats calls in Team Management UI actions
-- - Optionally: Create a scheduled Edge Function for periodic reconciliation
-- - Result: Best of both worlds - real-time local sync + controlled Stripe sync

-- Add a flag to track when Stripe quantity needs sync
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS stripe_quantity_pending_sync BOOLEAN DEFAULT FALSE;

-- Function to mark subscription for Stripe sync
CREATE OR REPLACE FUNCTION mark_stripe_quantity_for_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- When number_of_users changes locally, mark for sync
  IF NEW.number_of_users IS DISTINCT FROM OLD.number_of_users THEN
    NEW.stripe_quantity_pending_sync := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to mark when sync is needed
DROP TRIGGER IF EXISTS mark_quantity_sync_needed ON subscriptions;
CREATE TRIGGER mark_quantity_sync_needed
BEFORE UPDATE OF number_of_users ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION mark_stripe_quantity_for_sync();

-- View to see subscriptions pending Stripe sync
CREATE OR REPLACE VIEW subscriptions_pending_sync AS
SELECT
  s.id,
  s.organization_id,
  s.stripe_subscription_id,
  s.number_of_users AS local_quantity,
  s.stripe_quantity_pending_sync,
  s.updated_at
FROM subscriptions s
WHERE s.stripe_quantity_pending_sync = TRUE
  AND s.stripe_subscription_id IS NOT NULL;

COMMENT ON VIEW subscriptions_pending_sync IS
'Shows subscriptions where local number_of_users has changed but Stripe quantity may not be synced yet.
Use this view in a scheduled Edge Function to batch-sync quantities to Stripe.';

COMMENT ON COLUMN subscriptions.stripe_quantity_pending_sync IS
'Indicates that local number_of_users has changed and Stripe subscription quantity may need to be updated.
Reset to FALSE after successfully calling manage-seats Edge Function.';
