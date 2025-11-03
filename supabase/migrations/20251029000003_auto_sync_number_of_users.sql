-- Function to sync number_of_active_users in subscriptions table with ACTIVE member count ONLY
-- This function recounts ALL members with status='Active' and updates the subscription
-- It does NOT simply increment/decrement, it performs a full recount for accuracy
CREATE OR REPLACE FUNCTION sync_subscription_user_count()
RETURNS TRIGGER AS $$
DECLARE
  target_org_id UUID;
  active_count INTEGER;
BEGIN
  -- Get the organization_id from the affected row
  target_org_id := COALESCE(NEW.organization_id, OLD.organization_id);

  -- Count ONLY Active members (not Pending, not Inactive, not Suspended)
  SELECT COUNT(*)
  INTO active_count
  FROM memberships
  WHERE organization_id = target_org_id
    AND status = 'Active';

  -- Update the subscription's number_of_active_users to match active member count
  UPDATE subscriptions
  SET number_of_active_users = active_count,
      updated_at = NOW()
  WHERE organization_id = target_org_id;

  -- Log for debugging
  RAISE NOTICE 'Synced user count for org %: % active members', target_org_id, active_count;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on memberships INSERT
-- Fires when: New member row is created (typically with status='Pending')
-- Effect: Recounts active members (usually no change unless inserted as 'Active')
CREATE TRIGGER sync_user_count_on_insert
AFTER INSERT ON memberships
FOR EACH ROW
EXECUTE FUNCTION sync_subscription_user_count();

-- Trigger on memberships UPDATE (when status changes)
-- Fires when: Member status changes (e.g., Pending→Active, Active→Inactive)
-- Effect: Recounts active members
-- Examples:
--   - Pending → Active: number_of_active_users INCREASES
--   - Active → Inactive: number_of_active_users DECREASES
--   - Active → Suspended: number_of_active_users DECREASES
CREATE TRIGGER sync_user_count_on_update
AFTER UPDATE OF status ON memberships
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION sync_subscription_user_count();

-- Trigger on memberships DELETE
-- Fires when: Member is completely removed from the organization
-- Effect: Recounts remaining active members (decreases if deleted member was Active)
CREATE TRIGGER sync_user_count_on_delete
AFTER DELETE ON memberships
FOR EACH ROW
EXECUTE FUNCTION sync_subscription_user_count();

-- Add comments
COMMENT ON FUNCTION sync_subscription_user_count IS
'Automatically updates subscriptions.number_of_active_users to match ACTIVE member count only.
Triggers on INSERT, UPDATE (status change), and DELETE of memberships.
Only members with status=''Active'' are counted. Pending, Inactive, and Suspended members are excluded.';

COMMENT ON TRIGGER sync_user_count_on_insert ON memberships IS
'Recounts active members when new membership is created';

COMMENT ON TRIGGER sync_user_count_on_update ON memberships IS
'Recounts active members when membership status changes (e.g., Pending→Active, Active→Inactive)';

COMMENT ON TRIGGER sync_user_count_on_delete ON memberships IS
'Recounts active members when membership is deleted';
