-- Remove trigger_link_contact_to_member - it was causing "user_id does not exist" errors
-- The trigger tries to access contacts.user_id column which doesn't exist

DROP TRIGGER IF EXISTS trigger_link_contact_to_member ON memberships;

COMMENT ON FUNCTION link_contact_to_member IS 'Function exists but trigger disabled - was causing errors because contacts.user_id column does not exist';
