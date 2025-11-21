-- ============================================================================
-- ESSENTIAL FUNCTIONS - Extracted from Production
-- ============================================================================
-- Run this in STAGING after running 00_create_schema.sql
-- This replaces all placeholder functions with real implementations
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP EXISTING FUNCTIONS (to avoid parameter name conflicts)
-- ============================================================================

DROP FUNCTION IF EXISTS public.handle_user_deletion() CASCADE;
DROP FUNCTION IF EXISTS public.update_quote_creator_name_on_profile_change() CASCADE;
DROP FUNCTION IF EXISTS public.normalize_membership_role() CASCADE;
DROP FUNCTION IF EXISTS public.normalize_membership_status() CASCADE;
DROP FUNCTION IF EXISTS public.sync_subscription_user_count() CASCADE;
DROP FUNCTION IF EXISTS public.set_owner_department() CASCADE;
DROP FUNCTION IF EXISTS public.update_quote_creator_name_on_membership_change() CASCADE;
DROP FUNCTION IF EXISTS public.update_active_user_count() CASCADE;
DROP FUNCTION IF EXISTS public.create_workflow_columns_for_new_org() CASCADE;
DROP FUNCTION IF EXISTS public.create_default_workflow_columns(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.mark_stripe_quantity_for_sync() CASCADE;
DROP FUNCTION IF EXISTS public.update_subscription_is_active() CASCADE;
DROP FUNCTION IF EXISTS public.check_quote_is_main_version_and_won(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.ensure_single_main_version() CASCADE;
DROP FUNCTION IF EXISTS public.increment_quote_version() CASCADE;
DROP FUNCTION IF EXISTS public.normalize_quote_status() CASCADE;
DROP FUNCTION IF EXISTS public.track_quote_status_change() CASCADE;
DROP FUNCTION IF EXISTS public.sync_projects_from_is_on_board() CASCADE;
DROP FUNCTION IF EXISTS public.set_quote_creator_name() CASCADE;
DROP FUNCTION IF EXISTS public.sync_project_on_quote_status_change() CASCADE;
DROP FUNCTION IF EXISTS public.update_quote_analytics_fields() CASCADE;
DROP FUNCTION IF EXISTS public.sync_quote_on_board_status() CASCADE;
DROP FUNCTION IF EXISTS public.sync_reminder_status() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_invite_tokens() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.is_active_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_org_role(uuid, uuid, text[]) CASCADE;
DROP FUNCTION IF EXISTS public.can_view_membership(uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_owner_or_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_user_organization() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_org_member_ids(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_valid_subscription(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_admin_role_in_org(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_role_in_org(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_org_ids(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_org_folder_admin(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_org_folders(uuid) CASCADE;

-- ============================================================================
-- STEP 2: CREATE ALL FUNCTIONS
-- ============================================================================

-- ============================================================================
-- CATEGORY 1: TRIGGER FUNCTIONS (Required for database triggers to work)
-- ============================================================================

-- ============================================================================
-- PROFILES TRIGGER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Update all quotes by this user to show "Deleted User"
    UPDATE public.quotes
    SET created_by_name = 'Deleted User'
    WHERE created_by = OLD.id;

    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_quote_creator_name_on_profile_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    user_status text;
    display_name text;
BEGIN
    -- Check if user's membership is active
    SELECT status INTO user_status
    FROM public.memberships
    WHERE user_id = NEW.id
      AND status = 'Active'
    LIMIT 1;

    -- Only update if user has active membership (not inactive/deactivated)
    IF user_status = 'Active' THEN
        display_name := COALESCE(NEW.full_name, NEW.email, 'Unknown User');

        UPDATE public.quotes
        SET created_by_name = display_name
        WHERE created_by = NEW.id;
    END IF;

    RETURN NEW;
END;
$function$
;

-- ============================================================================
-- MEMBERSHIPS TRIGGER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.normalize_membership_role()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Normalize role to proper capitalization
  IF NEW.role IS NOT NULL THEN
    CASE LOWER(NEW.role)
      WHEN 'admin' THEN NEW.role := 'Admin';
      WHEN 'member' THEN NEW.role := 'Member';
      WHEN 'owner' THEN NEW.role := 'Owner';
      ELSE
        -- If role doesn't match any expected value, let constraint handle it
        NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_membership_status()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Normalize status to proper capitalization
  IF NEW.status IS NOT NULL THEN
    CASE LOWER(NEW.status)
      WHEN 'active' THEN NEW.status := 'Active';
      WHEN 'pending' THEN NEW.status := 'Pending';
      WHEN 'suspended' THEN NEW.status := 'Suspended';
      WHEN 'inactive' THEN NEW.status := 'Inactive';
      ELSE
        -- If status doesn't match any expected value, let constraint handle it
        NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_subscription_user_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.set_owner_department()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- If role is Owner and department is not set, auto-assign "Executive"
  IF NEW.role = 'Owner' AND NEW.department IS NULL THEN
    NEW.department = 'Executive';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_quote_creator_name_on_membership_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    user_full_name text;
    user_email text;
    display_name text;
BEGIN
    -- Get user's full name and email
    SELECT full_name, email INTO user_full_name, user_email
    FROM public.profiles
    WHERE id = COALESCE(NEW.user_id, OLD.user_id);

    -- Determine display name based on new status
    IF TG_OP = 'DELETE' OR (NEW.status = 'Inactive') THEN
        display_name := 'Deactivated User';
    ELSE
        -- Use full_name if available, otherwise email
        display_name := COALESCE(user_full_name, user_email, 'Unknown User');
    END IF;

    -- Update all quotes created by this user in this organization
    UPDATE public.quotes
    SET created_by_name = display_name
    WHERE created_by = COALESCE(NEW.user_id, OLD.user_id)
      AND organization_id = COALESCE(NEW.organization_id, OLD.organization_id);

    RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_active_user_count()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE subscriptions
  SET number_of_active_users = (
    SELECT COUNT(*)
    FROM memberships
    WHERE organization_id = NEW.organization_id
    AND status = 'Active'
  )
  WHERE organization_id = NEW.organization_id;
  RETURN NEW;
END;
$function$
;

-- ============================================================================
-- ORGANIZATIONS TRIGGER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_workflow_columns_for_new_org()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM create_default_workflow_columns(NEW.id);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_default_workflow_columns(org_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO project_workflow_columns (organization_id, name, color, column_order, is_default)
  VALUES
    (org_id, 'Active', '#94A3B8', 0, true)
  ON CONFLICT (organization_id, name) DO NOTHING;
END;
$function$
;

-- ============================================================================
-- SUBSCRIPTIONS TRIGGER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_stripe_quantity_for_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- When number_of_users changes locally, mark for sync
  IF NEW.number_of_active_users IS DISTINCT FROM OLD.number_of_active_users THEN
    NEW.stripe_quantity_pending_sync := TRUE;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_subscription_is_active()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Set is_active based on stripe_subscription_status
  -- Case-insensitive comparison (Stripe returns lowercase, webhook capitalizes)
  -- This handles both 'active'/'Active' and 'trialing'/'Trialing'
  NEW.is_active := LOWER(NEW.stripe_subscription_status) IN ('active', 'trialing');

  RETURN NEW;
END;
$function$
;

-- ============================================================================
-- QUOTES TRIGGER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_quote_is_main_version_and_won(quote_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  is_main BOOLEAN;
  quote_status TEXT;
BEGIN
  SELECT is_main_version, status INTO is_main, quote_status
  FROM public.quotes
  WHERE id = quote_id_param;

  -- Return true only if the quote is the main version AND has Won status
  RETURN COALESCE(is_main, false) AND COALESCE(quote_status, '') = 'Won';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_single_main_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    base_num TEXT;
BEGIN
    -- Only proceed if is_main_version is being set to true
    IF NEW.is_main_version = true THEN
        -- Extract base proposal number (e.g., "P1001" from "P1001.2")
        base_num := CASE
            WHEN NEW.proposal_number ~ '\.' THEN split_part(NEW.proposal_number, '.', 1)
            ELSE NEW.proposal_number
        END;

        -- Set all other versions with the same base number to false
        UPDATE public.quotes
        SET is_main_version = false
        WHERE organization_id = NEW.organization_id
        AND id != NEW.id
        AND is_main_version = true
        AND (
            proposal_number = base_num
            OR proposal_number LIKE base_num || '.%'
        );
    END IF;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_quote_version()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.date_last_downloaded IS DISTINCT FROM OLD.date_last_downloaded
       AND NEW.date_last_downloaded IS NOT NULL THEN
        NEW.document_version := COALESCE(OLD.document_version, 0) + 1;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_quote_status()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Normalize status to proper capitalization
  IF NEW.status IS NOT NULL THEN
    CASE LOWER(NEW.status)
      WHEN 'won' THEN NEW.status := 'Won';
      WHEN 'rejected' THEN NEW.status := 'Rejected';
      WHEN 'submitted' THEN NEW.status := 'Submitted';
      WHEN 'draft' THEN NEW.status := 'Draft';
      WHEN 'incomplete' THEN NEW.status := 'Incomplete';
      WHEN 'pending' THEN NEW.status := 'Pending';
      ELSE
        -- Keep original case for unknown statuses
        NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.track_quote_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only track if status actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Insert transition record
    INSERT INTO quote_status_transitions (
      quote_id,
      organization_id,
      from_status,
      to_status,
      transitioned_by
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      OLD.status,
      NEW.status,
      auth.uid()
    );

    -- Update denormalized timestamp fields on quotes table
    IF NEW.status = 'Submitted' AND NEW.submitted_at IS NULL THEN
      NEW.submitted_at = NOW();
    ELSIF NEW.status = 'Won' THEN
      NEW.won_at = NOW();
      -- removed: NEW.closed_at = NOW();
    ELSIF NEW.status = 'Rejected' THEN
      NEW.rejected_at = NOW();
      -- removed: NEW.closed_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_projects_from_is_on_board()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  next_order INTEGER;
BEGIN
  -- When is_on_board changes from false to true, create project if it doesn't exist
  IF (NEW.is_on_board = true AND (OLD.is_on_board = false OR OLD.is_on_board IS NULL)) THEN
    -- Check if project already exists
    IF NOT EXISTS (SELECT 1 FROM projects WHERE quote_id = NEW.id) THEN
      -- Get the next board_order for the workflow_status
      SELECT COALESCE(MAX(board_order), 0) + 1 INTO next_order
      FROM projects
      WHERE organization_id = NEW.organization_id AND workflow_status = 'To Do';

      -- Insert project
      INSERT INTO projects (quote_id, organization_id, workflow_status, board_order, priority)
      VALUES (NEW.id, NEW.organization_id, 'To Do', next_order, NULL);
    END IF;
  -- When is_on_board changes from true to false, delete project if it exists
  ELSIF (NEW.is_on_board = false AND OLD.is_on_board = true) THEN
    DELETE FROM projects WHERE quote_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_quote_creator_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Only set if created_by_name is not already set
    IF NEW.created_by_name IS NULL AND NEW.created_by IS NOT NULL THEN
        -- Get the creator's name from profiles
        SELECT full_name INTO NEW.created_by_name
        FROM profiles
        WHERE id = NEW.created_by;

        -- If no name found (shouldn't happen), set to 'Unknown'
        IF NEW.created_by_name IS NULL THEN
            NEW.created_by_name := 'Unknown';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_project_on_quote_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  next_board_order INTEGER;
  deleted_status TEXT;
  deleted_order INTEGER;
BEGIN
  -- Create project ONLY if status is 'Won' AND is_on_board is true
  IF NEW.status = 'Won' AND NEW.is_on_board = true THEN
    -- Check if we're transitioning TO this state (either status changed OR is_on_board changed)
    IF (OLD.status IS NULL OR OLD.status != 'Won' OR OLD.is_on_board IS DISTINCT FROM true) THEN
      -- Get the next board_order for the Active column (1-based indexing)
      SELECT COALESCE(MAX(board_order), 0) + 1 INTO next_board_order
      FROM projects
      WHERE workflow_status = 'Active' AND organization_id = NEW.organization_id;

      INSERT INTO projects (quote_id, workflow_status, organization_id, board_order)
      VALUES (NEW.id, 'Active', NEW.organization_id, next_board_order)
      ON CONFLICT (quote_id, organization_id) DO NOTHING;
    END IF;

  -- Delete project if:
  -- 1. Status changed FROM 'Won' to something else, OR
  -- 2. is_on_board changed FROM true to false/NULL (while status is still 'Won')
  ELSIF (OLD.status = 'Won' AND NEW.status != 'Won')
     OR (OLD.is_on_board = true AND NEW.is_on_board IS DISTINCT FROM true) THEN

    -- Get info about the project before deletion
    SELECT workflow_status, board_order INTO deleted_status, deleted_order
    FROM projects
    WHERE quote_id = NEW.id AND organization_id = NEW.organization_id;

    -- Only proceed if project exists
    IF deleted_status IS NOT NULL THEN
      -- Delete the project
      DELETE FROM projects
      WHERE quote_id = NEW.id AND organization_id = NEW.organization_id;

      -- Reorder remaining projects in that column
      UPDATE projects
      SET board_order = board_order - 1
      WHERE workflow_status = deleted_status
        AND organization_id = NEW.organization_id
        AND board_order > deleted_order;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_quote_analytics_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Extract total value from price_details JSONB
  IF NEW.price_details IS NOT NULL THEN
    NEW.total_value = (NEW.price_details->>'final_selling_price')::DECIMAL;

    -- Calculate margin if we have both selling price and cost
    IF NEW.price_details->>'total_cost' IS NOT NULL AND
       NEW.price_details->>'final_selling_price' IS NOT NULL THEN
      NEW.margin_percentage = (
        ((NEW.price_details->>'final_selling_price')::DECIMAL -
         (NEW.price_details->>'total_cost')::DECIMAL) /
        NULLIF((NEW.price_details->>'final_selling_price')::DECIMAL, 0) * 100
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

-- ============================================================================
-- PROJECTS TRIGGER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_quote_on_board_status()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- When project is created, set is_on_board to true
    UPDATE quotes SET is_on_board = true WHERE id = NEW.quote_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    -- When project is deleted, set is_on_board to false
    UPDATE quotes SET is_on_board = false WHERE id = OLD.quote_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;

-- ============================================================================
-- REMINDERS TRIGGER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_reminder_status()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- If old column was updated, sync to new
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.reminder_status = NEW.status;
  END IF;

  -- If new column was updated, sync to old
  IF NEW.reminder_status IS DISTINCT FROM OLD.reminder_status THEN
    NEW.status = NEW.reminder_status;
  END IF;

  RETURN NEW;
END;
$function$
;

-- ============================================================================
-- INVITE_TOKENS TRIGGER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_invite_tokens()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  DELETE FROM public.invite_tokens
  WHERE expires_at < now() - interval '1 day';
  RETURN NULL;
END;
$function$
;

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION (Used by many tables)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF row(NEW.*) IS DISTINCT FROM row(OLD.*) THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$function$
;

-- ============================================================================
-- CATEGORY 2: RLS HELPER FUNCTIONS (Used by RLS policies)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_active_member(check_user_id uuid, check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  is_member boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.memberships
    WHERE user_id = check_user_id
    AND organization_id = check_org_id
    AND status = 'Active'
  ) INTO is_member;

  RETURN is_member;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_org_role(check_user_id uuid, check_org_id uuid, required_roles text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  has_role boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.memberships
    WHERE user_id = check_user_id
    AND organization_id = check_org_id
    AND role = ANY(required_roles)
    AND status = 'Active'
  ) INTO has_role;

  RETURN has_role;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_view_membership(check_user_id uuid, membership_user_id uuid, membership_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  can_view boolean;
BEGIN
  -- User can always see their own membership
  IF check_user_id = membership_user_id THEN
    RETURN true;
  END IF;

  -- Check if user is active member of same organization
  SELECT EXISTS(
    SELECT 1
    FROM public.memberships
    WHERE user_id = check_user_id
    AND organization_id = membership_org_id
    AND status = 'Active'
  ) INTO can_view;

  RETURN can_view;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_owner_or_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN get_current_user_role() IN ('Owner', 'Admin');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_user_organization()
RETURNS uuid
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN (
    SELECT m.organization_id
    FROM public.memberships m  -- <- fixed here
    WHERE m.user_id = auth.uid()
      AND m.status = 'Active'
    LIMIT 1
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT m.role
    FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.status = 'Active'
    LIMIT 1
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_org_member_ids(target_user_id uuid)
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT m2.user_id
  FROM public.memberships m1
  JOIN public.memberships m2 ON m1.organization_id = m2.organization_id
  WHERE m1.user_id = target_user_id
  AND m1.status = 'Active'  -- Current user must be Active
  AND m2.status IN ('Active', 'Pending');  -- Can see both Active and Pending members
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_valid_subscription(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.organization_id = org_id
    AND s.is_active = true
    AND s.access_blocked = false
    AND s.stripe_subscription_status IN ('active', 'trialing')
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_has_admin_role_in_org(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.organization_id = org_id
    AND m.role IN ('Owner', 'Admin')
    AND m.status = 'Active'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_has_role_in_org(org_id uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_org_ids(check_user_id uuid)
RETURNS TABLE(organization_id uuid)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT m.organization_id
  FROM public.memberships m
  WHERE m.user_id = check_user_id
  AND m.status = 'Active';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_org_folder_admin(check_user_id uuid, folder_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  is_admin boolean;
  org_uuid uuid;
BEGIN
  -- Convert folder name (text) to UUID
  BEGIN
    org_uuid := folder_name::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  -- Check if user is Owner/Admin in this org
  SELECT EXISTS(
    SELECT 1
    FROM public.memberships
    WHERE user_id = check_user_id
    AND organization_id = org_uuid
    AND status = 'Active'
    AND role IN ('Owner', 'Admin')
  ) INTO is_admin;

  RETURN is_admin;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_org_folders(check_user_id uuid)
RETURNS TABLE(org_folder text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT m.organization_id::text
  FROM public.memberships m
  WHERE m.user_id = check_user_id
  AND m.status = 'Active';
END;
$function$
;

-- ============================================================================
-- STEP 3: RECREATE TRIGGERS (they were dropped with CASCADE)
-- ============================================================================

-- Triggers for profiles
CREATE TRIGGER trigger_handle_user_deletion
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_deletion();

CREATE TRIGGER trigger_update_quote_creator_name_on_profile_change
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.full_name IS DISTINCT FROM NEW.full_name OR OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION update_quote_creator_name_on_profile_change();

CREATE TRIGGER update_profiles_updated_at_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Triggers for memberships
CREATE TRIGGER trigger_normalize_membership_role
  BEFORE INSERT OR UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION normalize_membership_role();

CREATE TRIGGER trigger_normalize_membership_status
  BEFORE INSERT OR UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION normalize_membership_status();

CREATE TRIGGER trigger_sync_subscription_user_count
  AFTER INSERT OR UPDATE OR DELETE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_user_count();

CREATE TRIGGER trigger_set_owner_department
  BEFORE INSERT OR UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION set_owner_department();

CREATE TRIGGER trigger_update_quote_creator_name_on_membership_change
  AFTER UPDATE OR DELETE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_creator_name_on_membership_change();

CREATE TRIGGER trigger_update_active_user_count
  AFTER INSERT OR UPDATE OR DELETE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_active_user_count();

CREATE TRIGGER update_memberships_updated_at_trigger
  BEFORE UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Triggers for organizations
CREATE TRIGGER trigger_create_workflow_columns_for_new_org
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_workflow_columns_for_new_org();

CREATE TRIGGER update_organizations_updated_at_trigger
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Triggers for subscriptions
CREATE TRIGGER trigger_mark_stripe_quantity_for_sync
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION mark_stripe_quantity_for_sync();

CREATE TRIGGER trigger_update_subscription_is_active
  BEFORE INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_is_active();

CREATE TRIGGER update_subscriptions_updated_at_trigger
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Triggers for quotes
CREATE TRIGGER trigger_ensure_single_main_version
  BEFORE INSERT OR UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_main_version();

CREATE TRIGGER trigger_increment_quote_version
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION increment_quote_version();

CREATE TRIGGER trigger_normalize_quote_status
  BEFORE INSERT OR UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION normalize_quote_status();

CREATE TRIGGER trigger_track_quote_status_change
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION track_quote_status_change();

CREATE TRIGGER trigger_sync_projects_from_is_on_board
  AFTER UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION sync_projects_from_is_on_board();

CREATE TRIGGER trigger_set_quote_creator_name
  BEFORE INSERT ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_creator_name();

CREATE TRIGGER trigger_sync_project_on_quote_status_change
  AFTER UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_on_quote_status_change();

CREATE TRIGGER trigger_update_quote_analytics_fields
  BEFORE INSERT OR UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_analytics_fields();

CREATE TRIGGER update_quotes_updated_at_trigger
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Triggers for projects
CREATE TRIGGER trigger_sync_quote_on_board_status
  AFTER INSERT OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_quote_on_board_status();

CREATE TRIGGER update_projects_updated_at_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Triggers for reminders
CREATE TRIGGER trigger_sync_reminder_status
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION sync_reminder_status();

CREATE TRIGGER update_reminders_updated_at_trigger
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Triggers for user_onboarding_progress
CREATE TRIGGER update_user_onboarding_progress_updated_at
  BEFORE UPDATE ON user_onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Triggers for invite_tokens
CREATE TRIGGER trigger_cleanup_expired_invite_tokens
  AFTER INSERT ON invite_tokens
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_expired_invite_tokens();

CREATE TRIGGER update_invite_tokens_updated_at
  BEFORE UPDATE ON invite_tokens
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- COMPLETE!
-- ============================================================================
-- All essential functions and triggers have been applied.
-- Next step: Run 04_apply_rls_policies.sql
-- ============================================================================
