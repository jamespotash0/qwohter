-- Simple Solution: Clean up unverified profiles after 1 week (168 hours)
-- This is much simpler than preventing profile creation

-- Step 1: Drop unused functions that are orphaned or never used

-- Drop handle_new_user (orphaned, replaced by handle_auth_user_email_sync)
-- This function was created in migration 20250725204225 but the trigger was replaced
-- in migration 20250922000000, so this function is no longer called
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop create_profile_after_verification (never used, was for prevention approach)
DROP FUNCTION IF EXISTS public.create_profile_after_verification(uuid, text, text) CASCADE;

-- Note: We're KEEPING these existing functions:
-- - handle_auth_user_email_sync() - ACTIVE trigger creating profiles on signup (NEEDED!)
-- - cleanup_expired_onboarding() - cleans up user_onboarding_progress table (USEFUL!)
-- This new cleanup_unverified_profiles() complements them

-- Step 2: Create cleanup function for unverified profiles
CREATE OR REPLACE FUNCTION public.cleanup_unverified_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    -- Delete profiles for users who:
    -- 1. Never verified their email (email_confirmed_at IS NULL)
    -- 2. Are older than 1 week (168 hours)
    -- 3. Have no membership (never completed onboarding)
    DELETE FROM public.profiles
    WHERE id IN (
        SELECT p.id
        FROM public.profiles p
        JOIN auth.users u ON p.id = u.id
        LEFT JOIN public.memberships m ON p.id = m.user_id
        WHERE u.email_confirmed_at IS NULL
        AND u.created_at < now() - interval '168 hours'
        AND m.id IS NULL
    );

    -- Also delete the auth.users entries for unverified users older than 1 week
    DELETE FROM auth.users
    WHERE email_confirmed_at IS NULL
    AND created_at < now() - interval '168 hours'
    AND id NOT IN (SELECT user_id FROM public.memberships);

    -- Log the cleanup (optional, for monitoring)
    RAISE NOTICE 'Cleanup completed at %', now();
END;
$function$;

-- Add comment explaining when to run this
COMMENT ON FUNCTION public.cleanup_unverified_profiles() IS
'Deletes profiles and auth.users for unverified users older than 168 hours.
Run daily via pg_cron: SELECT cron.schedule(''cleanup-unverified-profiles'', ''0 3 * * *'', ''SELECT public.cleanup_unverified_profiles()'');';

-- Create a view to monitor unverified profiles (useful for debugging)
CREATE OR REPLACE VIEW public.unverified_profiles_to_cleanup AS
SELECT
    p.id,
    p.email,
    p.full_name,
    p.created_at,
    u.email_confirmed_at,
    EXTRACT(HOUR FROM (now() - u.created_at)) as hours_old,
    CASE
        WHEN u.created_at < now() - interval '168 hours' THEN 'Will be deleted on next cleanup'
        ELSE 'Still within 168-hour grace period'
    END as status
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
LEFT JOIN public.memberships m ON p.id = m.user_id
WHERE u.email_confirmed_at IS NULL
AND m.id IS NULL
ORDER BY u.created_at DESC;

COMMENT ON VIEW public.unverified_profiles_to_cleanup IS
'Shows unverified profiles that will be or have been cleaned up. Use this to monitor the cleanup process.';
