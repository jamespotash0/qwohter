-- Comprehensive RLS Policies for New Schema
-- This migration creates all necessary tables and Row Level Security policies

-- First, create the new tables that don't exist yet
CREATE TABLE IF NOT EXISTS public.user_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step text NOT NULL,
  completed_steps text[] DEFAULT '{}',
  session_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.organization_creation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp timestamptz DEFAULT now(),
  ip_address text,
  status text CHECK (status IN ('Success', 'Failed', 'Rate_Limited')),
  error_message text
);

-- -- Add email column to profiles if it doesn't exist
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text UNIQUE;

-- Update profiles table to ensure email is populated from auth.users
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS trigger AS $$
BEGIN
  -- Auto-populate email from auth metadata when profile is created
  IF NEW.email IS NULL THEN
    NEW.email := NEW.id::text; -- Will be updated by trigger below
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync email from auth.users
CREATE OR REPLACE FUNCTION handle_auth_user_email_sync()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Create profile with email when user signs up
    INSERT INTO public.profiles (id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, now(), now())
    ON CONFLICT (id) DO UPDATE SET
      email = NEW.email,
      updated_at = now();
  ELSIF TG_OP = 'UPDATE' AND OLD.email IS DISTINCT FROM NEW.email THEN
    -- Update profile email when auth email changes
    UPDATE public.profiles
    SET email = NEW.email, updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger to ensure it's up to date
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_auth_user_email_sync();

-- Drop existing conflicting functions first
DROP FUNCTION IF EXISTS current_user_organization();
DROP FUNCTION IF EXISTS approve_member(uuid);
DROP FUNCTION IF EXISTS reject_member(uuid);
DROP FUNCTION IF EXISTS update_member_role(uuid, text);
DROP FUNCTION IF EXISTS update_org_creator_profile(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS user_has_admin_role_in_org(uuid);
DROP FUNCTION IF EXISTS user_has_role_in_org(uuid, text);

-- Helper function to get current user's organization ID (replaces existing)
CREATE OR REPLACE FUNCTION get_current_user_organization()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT m.organization_id
    FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.status = 'Active'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user's role in organization
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT m.role
    FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.status = 'Active'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is owner/admin
CREATE OR REPLACE FUNCTION is_owner_or_admin()
RETURNS boolean AS $$
BEGIN
  RETURN get_current_user_role() IN ('Owner', 'Admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_creation_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

DROP POLICY IF EXISTS "organizations_select_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_delete_policy" ON public.organizations;

DROP POLICY IF EXISTS "memberships_select_policy" ON public.memberships;
DROP POLICY IF EXISTS "memberships_insert_policy" ON public.memberships;
DROP POLICY IF EXISTS "memberships_update_policy" ON public.memberships;
DROP POLICY IF EXISTS "memberships_delete_policy" ON public.memberships;

DROP POLICY IF EXISTS "quotes_select_policy" ON public.quotes;
DROP POLICY IF EXISTS "quotes_insert_policy" ON public.quotes;
DROP POLICY IF EXISTS "quotes_update_policy" ON public.quotes;
DROP POLICY IF EXISTS "quotes_delete_policy" ON public.quotes;

-- PROFILES TABLE POLICIES
-- Any member can view profiles in their organization + their own
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT USING (
  auth.uid() = id OR -- Own profile
  EXISTS (
    SELECT 1 FROM public.memberships m1, public.memberships m2
    WHERE m1.user_id = auth.uid()
    AND m2.user_id = profiles.id
    AND m1.organization_id = m2.organization_id
    AND m1.status = 'Active'
    AND m2.status = 'Active'
  )
);

-- Users can insert their own profile (during signup)
CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- No one can delete profiles (soft delete via memberships if needed)
CREATE POLICY "profiles_delete_policy" ON public.profiles
FOR DELETE USING (false);

-- ORGANIZATIONS TABLE POLICIES
-- Anyone can view organizations (for joining via code)
CREATE POLICY "organizations_select_policy" ON public.organizations
FOR SELECT USING (true);

-- Only authenticated users can create organizations (rate limiting handled in app)
CREATE POLICY "organizations_insert_policy" ON public.organizations
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only owners can update organization data
CREATE POLICY "organizations_update_policy" ON public.organizations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.organization_id = organizations.id
    AND m.user_id = auth.uid()
    AND m.role = 'Owner'
    AND m.status = 'Active'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.organization_id = organizations.id
    AND m.user_id = auth.uid()
    AND m.role = 'Owner'
    AND m.status = 'Active'
  )
);

-- Only owners can delete organizations
CREATE POLICY "organizations_delete_policy" ON public.organizations
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.organization_id = organizations.id
    AND m.user_id = auth.uid()
    AND m.role = 'Owner'
    AND m.status = 'Active'
  )
);

-- memberships TABLE POLICIES
-- Members can view memberships in their organization + owners/admins can see pending
CREATE POLICY "memberships_select_policy" ON public.memberships
FOR SELECT USING (
  user_id = auth.uid() OR -- Own memberships
  (
    organization_id = get_current_user_organization() AND
    (
      status = 'Active' OR -- All active members visible to org members
      (status IN ('Pending', 'Suspended') AND is_owner_or_admin()) -- Pending/suspended only to admins
    )
  )
);

-- Service role and authenticated users can create memberships (during signup/invite)
CREATE POLICY "memberships_insert_policy" ON public.memberships
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR -- Creating own memberships
    is_owner_or_admin() -- Admins/owners can invite others
  )
);

-- Owners/admins can update memberships, users can update their own status for joining
CREATE POLICY "memberships_update_policy" ON public.memberships
FOR UPDATE USING (
  user_id = auth.uid() OR -- Own memberships (for accepting invites)
  (
    organization_id = get_current_user_organization() AND
    is_owner_or_admin()
  )
) WITH CHECK (
  user_id = auth.uid() OR
  (
    organization_id = get_current_user_organization() AND
    is_owner_or_admin()
  )
);

-- Owners/admins can remove memberships
CREATE POLICY "memberships_delete_policy" ON public.memberships
FOR DELETE USING (
  user_id = auth.uid() OR -- Users can leave organization
  (
    organization_id = get_current_user_organization() AND
    is_owner_or_admin()
  )
);

-- QUOTES TABLE POLICIES
-- Any active member can view quotes in their organization
CREATE POLICY "quotes_select_policy" ON public.quotes
FOR SELECT USING (
  organization_id IS NULL AND auth.uid() = created_by OR -- Personal quotes
  (
    organization_id = get_current_user_organization() AND
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
      AND m.organization_id = quotes.organization_id
      AND m.status = 'Active'
    )
  )
);

-- Any active member can create quotes
CREATE POLICY "quotes_insert_policy" ON public.quotes
FOR INSERT WITH CHECK (
  organization_id IS NULL AND auth.uid() = created_by OR -- Personal quotes
  (
    organization_id = get_current_user_organization() AND
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
      AND m.organization_id = quotes.organization_id
      AND m.status = 'Active'
    )
  )
);

-- Any active member can update quotes in their organization
CREATE POLICY "quotes_update_policy" ON public.quotes
FOR UPDATE USING (
  organization_id IS NULL AND auth.uid() = created_by OR -- Personal quotes
  (
    organization_id = get_current_user_organization() AND
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
      AND m.organization_id = quotes.organization_id
      AND m.status = 'Active'
    )
  )
) WITH CHECK (
  organization_id IS NULL AND auth.uid() = created_by OR
  (
    organization_id = get_current_user_organization() AND
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
      AND m.organization_id = quotes.organization_id
      AND m.status = 'Active'
    )
  )
);

-- Only admins/owners can delete quotes
CREATE POLICY "quotes_delete_policy" ON public.quotes
FOR DELETE USING (
  organization_id IS NULL AND auth.uid() = created_by OR -- Own personal quotes
  (
    organization_id = get_current_user_organization() AND
    is_owner_or_admin()
  )
);
COMMENT ON POLICY "quotes_delete_policy" ON public.quotes IS 'Only admins and owners can delete quotes in organization';

-- USER ONBOARDING PROGRESS POLICIES
-- Users can only access their own onboarding progress
CREATE POLICY "onboarding_select_policy" ON public.user_onboarding_progress
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "onboarding_insert_policy" ON public.user_onboarding_progress
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "onboarding_update_policy" ON public.user_onboarding_progress
FOR UPDATE USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "onboarding_delete_policy" ON public.user_onboarding_progress
FOR DELETE USING (user_id = auth.uid());

-- ORGANIZATION CREATION LOG POLICIES
-- Users can only view their own creation logs, admins can view all
CREATE POLICY "creation_log_select_policy" ON public.organization_creation_log
FOR SELECT USING (
  user_id = auth.uid() OR
  is_owner_or_admin()
);

-- Only authenticated users can insert logs (service manages this)
CREATE POLICY "creation_log_insert_policy" ON public.organization_creation_log
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- No updates to logs
CREATE POLICY "creation_log_update_policy" ON public.organization_creation_log
FOR UPDATE USING (false);

-- Only system/admins can delete old logs
CREATE POLICY "creation_log_delete_policy" ON public.organization_creation_log
FOR DELETE USING (is_owner_or_admin());

-- Function to cleanup expired onboarding records
CREATE OR REPLACE FUNCTION cleanup_expired_onboarding()
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_onboarding_progress
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate updated memberships management functions with capitalized enums
CREATE OR REPLACE FUNCTION approve_member(member_id uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE public.memberships
  SET status = 'Active',
      joined_at = now(),
      updated_at = now()
  WHERE id = member_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_member(member_id uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE public.memberships
  SET status = 'Suspended',
      updated_at = now()
  WHERE id = member_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_member_role(member_id uuid, new_role text)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  -- Validate role
  IF new_role NOT IN ('Owner', 'Admin', 'Member') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid role');
  END IF;

  UPDATE public.memberships
  SET role = new_role,
      updated_at = now()
  WHERE id = member_id;

  IF FOUND THEN
    SELECT json_build_object('success', true, 'role', new_role) INTO result;
  ELSE
    SELECT json_build_object('success', false, 'error', 'Member not found') INTO result;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_org_creator_profile(
  user_id uuid,
  org_id uuid DEFAULT NULL::uuid,
  role_value text DEFAULT 'Admin'::text,
  status_value text DEFAULT 'Active'::text
)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  -- Validate inputs
  IF role_value NOT IN ('Owner', 'Admin', 'Member') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid role');
  END IF;

  IF status_value NOT IN ('Pending', 'Active', 'Suspended') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid status');
  END IF;

  UPDATE public.memberships
  SET role = role_value,
      status = status_value,
      updated_at = now()
  WHERE user_id = update_org_creator_profile.user_id
    AND (org_id IS NULL OR organization_id = org_id);

  IF FOUND THEN
    SELECT json_build_object('success', true, 'role', role_value, 'status', status_value) INTO result;
  ELSE
    SELECT json_build_object('success', false, 'error', 'memberships not found') INTO result;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_has_admin_role_in_org(org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.organization_id = org_id
    AND m.role IN ('Owner', 'Admin')
    AND m.status = 'Active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_has_role_in_org(org_id uuid, required_role text)
RETURNS boolean AS $$
BEGIN
  -- Validate role input
  IF required_role NOT IN ('Owner', 'Admin', 'Member') THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.organization_id = org_id
    AND m.role = required_role
    AND m.status = 'Active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at triggers for new tables (consistent with existing pattern)
DROP TRIGGER IF EXISTS update_memberships_updated_at ON public.memberships;
CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS update_user_onboarding_progress_updated_at ON public.user_onboarding_progress;
CREATE TRIGGER update_user_onboarding_progress_updated_at
  BEFORE UPDATE ON public.user_onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Note: organization_creation_log doesn't need updated_at trigger as it's append-only

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create indexes for performance (avoiding duplicates with existing indexes)
-- Note: Skip indexes that already exist to avoid conflicts

-- New indexes for memberships table (only if memberships table doesn't exist yet)
CREATE INDEX IF NOT EXISTS idx_memberships_user_org ON public.memberships(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_status ON public.memberships(organization_id, status);

-- Skip idx_quotes_* since you already have idx_quotes_quote_source, id_quotes_status, etc.
-- Skip idx_organizations_code since you already have organizations_organization_code_key

-- New indexes for onboarding progress
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON public.user_onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_expires_at ON public.user_onboarding_progress(expires_at);

-- New indexes for creation log
CREATE INDEX IF NOT EXISTS idx_creation_log_user_timestamp ON public.organization_creation_log(user_id, timestamp);

-- Comment on policies for documentation
COMMENT ON POLICY "profiles_select_policy" ON public.profiles IS 'Users can view their own profile and profiles of people in their organization';
COMMENT ON POLICY "organizations_select_policy" ON public.organizations IS 'Anyone can view organizations (needed for joining via code)';
COMMENT ON POLICY "memberships_update_policy" ON public.memberships IS 'Owners/admins can manage memberships, users can accept invites';
COMMENT ON POLICY "quotes_delete_policy" ON public.quotes IS 'Only admins and owners can delete quotes in organization';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'RLS policies created successfully!';
  RAISE NOTICE 'Tables secured: profiles, organizations, memberships, quotes, user_onboarding_progress, organization_creation_log';
  RAISE NOTICE 'Permissions: Organizations (owner-managed), Quotes (member read/write, admin/owner delete), Profiles (member access), memberships (admin-managed)';
END $$;