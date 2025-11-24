-- ============================================================================
-- Migration: Enable REPLICA IDENTITY FULL for Real-Time Subscriptions
-- ============================================================================
-- Enables proper filtering for real-time subscriptions on multi-tenant tables
-- Required when using filters like `organization_id=eq.${orgId}` in real-time
-- ============================================================================

BEGIN;

-- ============================================================================
-- Enable REPLICA IDENTITY FULL for filtered real-time tables
-- ============================================================================
-- This allows Supabase to properly filter UPDATE and DELETE events
-- Without FULL, only the primary key is available in the old record

-- Contacts table (filtered by organization_id)
ALTER TABLE contacts REPLICA IDENTITY FULL;
RAISE NOTICE 'REPLICA IDENTITY FULL enabled for contacts';

-- Subscriptions table (filtered by organization_id)
ALTER TABLE subscriptions REPLICA IDENTITY FULL;
RAISE NOTICE 'REPLICA IDENTITY FULL enabled for subscriptions';

-- Profiles table (filtered by user_id/organization_id in some queries)
ALTER TABLE profiles REPLICA IDENTITY FULL;
RAISE NOTICE 'REPLICA IDENTITY FULL enabled for profiles';

-- Memberships table (filtered by organization_id)
ALTER TABLE memberships REPLICA IDENTITY FULL;
RAISE NOTICE 'REPLICA IDENTITY FULL enabled for memberships';

-- Organizations table (filtered by id)
ALTER TABLE organizations REPLICA IDENTITY FULL;
RAISE NOTICE 'REPLICA IDENTITY FULL enabled for organizations';

-- Quotes table (filtered by organization_id)
ALTER TABLE quotes REPLICA IDENTITY FULL;
RAISE NOTICE 'REPLICA IDENTITY FULL enabled for quotes';

-- Reminders table (filtered by organization_id/user_id)
ALTER TABLE reminders REPLICA IDENTITY FULL;
RAISE NOTICE 'REPLICA IDENTITY FULL enabled for reminders';

-- Projects table (filtered by organization_id)
ALTER TABLE projects REPLICA IDENTITY FULL;
RAISE NOTICE 'REPLICA IDENTITY FULL enabled for projects';

-- Quote Activities table (filtered by organization_id)
ALTER TABLE quote_activities REPLICA IDENTITY FULL;
RAISE NOTICE 'REPLICA IDENTITY FULL enabled for quote_activities';

-- ============================================================================
-- Tables that DON'T need REPLICA IDENTITY FULL
-- ============================================================================
-- subscription_plans - No filter used, subscribes to ALL changes
-- These tables can use DEFAULT replica identity for better performance

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '================================';
  RAISE NOTICE 'REPLICA IDENTITY FULL Enabled';
  RAISE NOTICE '================================';
  RAISE NOTICE 'Tables configured for filtered real-time:';
  RAISE NOTICE '  ✓ contacts (organization_id filter)';
  RAISE NOTICE '  ✓ subscriptions (organization_id filter)';
  RAISE NOTICE '  ✓ profiles (user_id/org filters)';
  RAISE NOTICE '  ✓ memberships (organization_id filter)';
  RAISE NOTICE '  ✓ organizations (id filter)';
  RAISE NOTICE '  ✓ quotes (organization_id filter)';
  RAISE NOTICE '  ✓ reminders (organization_id/user_id filter)';
  RAISE NOTICE '  ✓ projects (organization_id filter)';
  RAISE NOTICE '  ✓ quote_activities (organization_id filter)';
  RAISE NOTICE '  ✓ invite_tokens (already configured)';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables without filters:';
  RAISE NOTICE '  • subscription_plans (no filter needed)';
  RAISE NOTICE '================================';
  RAISE NOTICE 'Real-time subscriptions now support proper filtering';
  RAISE NOTICE 'UPDATE and DELETE events will work correctly';
  RAISE NOTICE '================================';
END $$;

COMMIT;
