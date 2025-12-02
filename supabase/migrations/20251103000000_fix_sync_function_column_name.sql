-- Fix sync_subscription_user_count function to use correct column name
-- Changes number_of_users to number_of_active_users

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

-- Update the comment to reflect the correct column name
COMMENT ON FUNCTION sync_subscription_user_count IS
'Automatically updates subscriptions.number_of_active_users to match ACTIVE member count only.
Triggers on INSERT, UPDATE (status change), and DELETE of memberships.
Only members with status=''Active'' are counted. Pending, Inactive, and Suspended members are excluded.';
