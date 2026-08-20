-- Qwohter (new version) -- functions, triggers, RLS policies, grants,
-- publications, cron jobs and seed data.
-- Purged of every quote-era object and of document_templates.
--
-- STEP 2 of 3.  Apply after new-app-tables.sql, before new-app-storage.sql.
--
-- Cron job URLs point at project iukfjhzmjgvtxefhhshd.
--    They invoke edge functions by absolute URL, so this ref MUST match the
--    project this file is applied to. Applying it elsewhere would fire this
--    database's scheduled jobs at another project's functions, silently.
--
-- Requires the vault secret `service_role_key` to exist:
--    SELECT vault.create_secret('<service-role-key>', 'service_role_key');
-- Statements: 1298

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
COMMENT ON SCHEMA "public" IS 'Standard public schema with search_path hardening applied to all SECURITY DEFINER functions (migration 20260121000004)';
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE OR REPLACE FUNCTION "internal"."get_org_member_ids"("p_org_id" "uuid") RETURNS "uuid"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT ARRAY_AGG(user_id)
    FROM memberships
    WHERE organization_id = p_org_id
    AND status IN ('Active', 'Pending');
$$;
ALTER FUNCTION "internal"."get_org_member_ids"("p_org_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."approve_member"("member_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    member_org_id uuid;
    current_user_role text;
BEGIN
    -- Get the member's organization from memberships table
    SELECT organization_id INTO member_org_id
    FROM public.memberships
    WHERE user_id = member_id;

    IF member_org_id IS NULL THEN
        RAISE EXCEPTION 'Membership not found';
    END IF;

    -- Get current user's role in the organization
    SELECT role INTO current_user_role
    FROM public.memberships
    WHERE user_id = auth.uid()
    AND organization_id = member_org_id
    AND status = 'Active';

    -- Check if current user is admin/owner of that organization
    IF current_user_role NOT IN ('Admin', 'Owner') THEN
        RAISE EXCEPTION 'Only Admins and Owners can approve members';
    END IF;

    -- Approve the member in memberships table
    UPDATE public.memberships
    SET status = 'Active',
        updated_at = NOW()
    WHERE user_id = member_id
    AND organization_id = member_org_id
    AND status = 'Pending';

    RETURN true;
END;
$$;
ALTER FUNCTION "public"."approve_member"("member_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."approve_member"("member_id" "uuid") IS 'Approves a pending member by updating their status to Active in the memberships table';
CREATE OR REPLACE FUNCTION "public"."attempt_org_creation"("p_profile_id" "uuid", "p_ip" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    recent_attempts int;
BEGIN
    -- Count successful org creations in the last 10 minutes for this profile
    SELECT COUNT(*) INTO recent_attempts
    FROM organization_creation_log
    WHERE profile_id = p_profile_id
      AND timestamp > now() - interval '10 minutes'
      AND status = 'success';

    IF recent_attempts >= 1 THEN
        -- Log failed attempt
        INSERT INTO organization_creation_log(profile_id, ip_address, status)
        VALUES (p_profile_id, p_ip, 'failed');
        RETURN 'limit reached';
    ELSE
        -- Log success (you would also create the org here)
        INSERT INTO organization_creation_log(profile_id, ip_address, status)
        VALUES (p_profile_id, p_ip, 'success');
        RETURN 'allowed';
    END IF;
END;
$$;
ALTER FUNCTION "public"."attempt_org_creation"("p_profile_id" "uuid", "p_ip" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."auto_generate_task_reference"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Reference is generated app-side with retry logic
  -- Only fallback to database generation if somehow NULL
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    -- Simple fallback: use a UUID prefix if somehow no reference was provided
    NEW.reference := 'TSK-' || EXTRACT(EPOCH FROM NOW())::INTEGER;
  END IF;

  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."auto_generate_task_reference"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."auto_generate_task_reference"() IS 'Fallback reference generation - primary generation is app-side with retry';
CREATE OR REPLACE FUNCTION "public"."auto_join_pending_invite"("p_user_id" "uuid", "p_user_email" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_invite invite_tokens%ROWTYPE;
  v_org_name text;
  v_membership_id uuid;
BEGIN
  -- Find the most recent valid pending invite for this email
  SELECT * INTO v_invite
  FROM invite_tokens
  WHERE LOWER(email) = LOWER(p_user_email)
    AND is_used = false
    AND revoked_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- Get org name for the toast message
  SELECT name INTO v_org_name
  FROM organizations
  WHERE id = v_invite.organization_id;

  -- Check if membership already exists (edge case: duplicate processing)
  IF EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = p_user_id
      AND organization_id = v_invite.organization_id
  ) THEN
    UPDATE invite_tokens SET is_used = true, updated_at = now() WHERE id = v_invite.id;
    RETURN jsonb_build_object('found', true, 'already_member', true, 'organization_name', v_org_name);
  END IF;

  -- Create membership (Active, Invited)
  INSERT INTO memberships (user_id, organization_id, role, status, join_type, invited_by, joined_at)
  VALUES (p_user_id, v_invite.organization_id, v_invite.role, 'Active', 'Invited', v_invite.created_by, now())
  RETURNING id INTO v_membership_id;

  -- Mark token as used
  UPDATE invite_tokens SET is_used = true, updated_at = now() WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'found', true,
    'joined', true,
    'organization_id', v_invite.organization_id,
    'organization_name', v_org_name,
    'membership_id', v_membership_id,
    'role', v_invite.role
  );
END;
$$;
ALTER FUNCTION "public"."auto_join_pending_invite"("p_user_id" "uuid", "p_user_email" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."auto_join_pending_invite"("p_user_id" "uuid", "p_user_email" "text") IS 'Auto-joins a user to an organization if they have a valid pending invite. Called from MainLayout when user has no membership.';
CREATE OR REPLACE FUNCTION "public"."block_access"("org_id" "uuid", "reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.subscriptions
  SET access_blocked = true,
      access_blocked_reason = reason,
      updated_at = now()
  WHERE organization_id = org_id;
END;
$$;
ALTER FUNCTION "public"."block_access"("org_id" "uuid", "reason" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."block_access"("org_id" "uuid", "reason" "text") IS 'Security: Admin-only billing function. EXECUTE revoked from all roles except service_role.';
CREATE OR REPLACE FUNCTION "public"."can_view_membership"("check_user_id" "uuid", "membership_user_id" "uuid", "membership_org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;
ALTER FUNCTION "public"."can_view_membership"("check_user_id" "uuid", "membership_user_id" "uuid", "membership_org_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."can_view_membership"("check_user_id" "uuid", "membership_user_id" "uuid", "membership_org_id" "uuid") IS 'Check if user can view a membership. SECURITY DEFINER bypasses RLS to prevent recursion.';
CREATE OR REPLACE FUNCTION "public"."cancel_scheduled_notification"("p_entity_type" "text", "p_entity_id" "uuid", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  cancelled_count INTEGER;
BEGIN
  UPDATE scheduled_notifications
  SET status = 'cancelled', updated_at = NOW()
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND status = 'pending'
    AND (p_user_id IS NULL OR user_id = p_user_id);

  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  RETURN cancelled_count;
END;
$$;
ALTER FUNCTION "public"."cancel_scheduled_notification"("p_entity_type" "text", "p_entity_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_auth_rate_limit"("p_identifier" "text", "p_identifier_type" "text", "p_attempt_type" "text", "p_max_attempts" integer DEFAULT 5, "p_window_minutes" integer DEFAULT 15, "p_block_duration_minutes" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_record auth_rate_limits%ROWTYPE;
    v_window_start timestamptz;
    v_is_blocked boolean := false;
    v_remaining_attempts integer;
    v_blocked_until timestamptz;
BEGIN
    v_window_start := now() - (p_window_minutes || ' minutes')::interval;

    -- Get existing rate limit record
    SELECT * INTO v_record
    FROM auth_rate_limits
    WHERE identifier = p_identifier
      AND identifier_type = p_identifier_type
      AND attempt_type = p_attempt_type
      AND first_attempt_at > v_window_start
    ORDER BY first_attempt_at DESC
    LIMIT 1;

    -- Check if currently blocked
    IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > now() THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'blocked', true,
            'blocked_until', v_record.blocked_until,
            'message', 'Too many attempts. Please try again later.'
        );
    END IF;

    -- Calculate remaining attempts
    IF v_record.id IS NOT NULL THEN
        v_remaining_attempts := p_max_attempts - v_record.attempt_count;
    ELSE
        v_remaining_attempts := p_max_attempts;
    END IF;

    RETURN jsonb_build_object(
        'allowed', v_remaining_attempts > 0,
        'blocked', false,
        'remaining_attempts', GREATEST(v_remaining_attempts, 0),
        'message', CASE
            WHEN v_remaining_attempts <= 0 THEN 'Too many attempts. Please try again later.'
            WHEN v_remaining_attempts <= 2 THEN format('%s attempts remaining', v_remaining_attempts)
            ELSE NULL
        END
    );
END;
$$;
ALTER FUNCTION "public"."check_auth_rate_limit"("p_identifier" "text", "p_identifier_type" "text", "p_attempt_type" "text", "p_max_attempts" integer, "p_window_minutes" integer, "p_block_duration_minutes" integer) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."check_auth_rate_limit"("p_identifier" "text", "p_identifier_type" "text", "p_attempt_type" "text", "p_max_attempts" integer, "p_window_minutes" integer, "p_block_duration_minutes" integer) IS '@omit';
CREATE OR REPLACE FUNCTION "public"."check_due_notifications"() RETURNS TABLE("notification_type" "text", "user_id" "uuid", "organization_id" "uuid", "title" "text", "message" "text", "link" "text", "metadata" "jsonb", "scheduled_notification_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_timestamp_utc TIMESTAMPTZ;
  current_date_utc DATE;
BEGIN
  current_timestamp_utc := NOW() AT TIME ZONE 'UTC';
  current_date_utc := current_timestamp_utc::DATE;

  -- ==========================================================================
  -- Return all pending scheduled notifications that are due
  -- ==========================================================================
  RETURN QUERY
  SELECT
    sn.notification_type::TEXT,
    sn.user_id,
    sn.organization_id,
    sn.title::TEXT,
    COALESCE(sn.message, '')::TEXT as message,
    sn.link::TEXT,
    sn.metadata || jsonb_build_object('scheduled_notification_id', sn.id) as metadata,
    sn.id as scheduled_notification_id
  FROM scheduled_notifications sn
  WHERE sn.status = 'Pending'
    AND sn.scheduled_for <= current_timestamp_utc
    -- For recurring: check if already sent today
    AND (
      sn.recurrence = 'Once'
      OR sn.last_sent_at IS NULL
      OR (sn.last_sent_at AT TIME ZONE 'UTC')::DATE < current_date_utc
    )
    -- For recurring: check if still within recurrence window
    AND (
      sn.recurrence = 'Once'
      OR sn.recurrence_end_date IS NULL
      OR current_date_utc <= sn.recurrence_end_date
    );
END;
$$;
ALTER FUNCTION "public"."check_due_notifications"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."check_due_notifications"() IS 'Returns scheduled notifications that are due to be sent. Checks scheduled_notifications table.';
CREATE OR REPLACE FUNCTION "public"."check_invite_rate_limit"("p_ip_address" "inet", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_invite_token" "text" DEFAULT NULL::"text", "p_window_minutes" integer DEFAULT 5, "p_max_attempts" integer DEFAULT 5) RETURNS TABLE("allowed" boolean, "attempts_used" integer, "window_reset_at" timestamp with time zone, "reason" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_ip_attempts INT;
  v_user_attempts INT;
  v_token_attempts INT;
BEGIN
  -- Calculate time window start
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  -- Count IP-based attempts in window
  SELECT COUNT(*) INTO v_ip_attempts
  FROM invite_token_attempts
  WHERE ip_address = p_ip_address
    AND attempted_at >= v_window_start
    AND success = FALSE;  -- Only count failed attempts

  -- Check IP rate limit
  IF v_ip_attempts >= p_max_attempts THEN
    RETURN QUERY SELECT
      FALSE,
      v_ip_attempts,
      v_window_start + (p_window_minutes || ' minutes')::INTERVAL,
      'Too many failed attempts from this IP address. Please try again later.';
    RETURN;
  END IF;

  -- If user_id provided, check user-based attempts
  IF p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_attempts
    FROM invite_token_attempts
    WHERE user_id = p_user_id
      AND attempted_at >= v_window_start
      AND success = FALSE;

    IF v_user_attempts >= p_max_attempts THEN
      RETURN QUERY SELECT
        FALSE,
        v_user_attempts,
        v_window_start + (p_window_minutes || ' minutes')::INTERVAL,
        'Too many failed attempts. Please try again later.';
      RETURN;
    END IF;
  END IF;

  -- If token provided, check token-specific attempts (prevent token scanning)
  IF p_invite_token IS NOT NULL THEN
    SELECT COUNT(*) INTO v_token_attempts
    FROM invite_token_attempts
    WHERE invite_token = p_invite_token
      AND attempted_at >= v_window_start
      AND success = FALSE;

    -- Lower threshold for individual tokens (prevents brute force)
    IF v_token_attempts >= (p_max_attempts / 2) THEN
      RETURN QUERY SELECT
        FALSE,
        v_token_attempts,
        v_window_start + (p_window_minutes || ' minutes')::INTERVAL,
        'This invitation link has been attempted too many times. Please contact the sender.';
      RETURN;
    END IF;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT
    TRUE,
    v_ip_attempts,
    v_window_start + (p_window_minutes || ' minutes')::INTERVAL,
    'Allowed';
END;
$$;
ALTER FUNCTION "public"."check_invite_rate_limit"("p_ip_address" "inet", "p_user_id" "uuid", "p_invite_token" "text", "p_window_minutes" integer, "p_max_attempts" integer) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_login_rate_limit"("p_email" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_window_start timestamptz;
    v_attempt_count integer;
    v_blocked_until timestamptz;
    v_max_attempts constant integer := 5;
    v_window_minutes constant integer := 15;
    v_block_minutes constant integer := 30;
BEGIN
    v_window_start := NOW() - (v_window_minutes || ' minutes')::interval;

    -- Check if currently blocked
    SELECT blocked_until INTO v_blocked_until
    FROM auth_rate_limits
    WHERE identifier = LOWER(p_email)
      AND identifier_type = 'email'
      AND attempt_type = 'login'
      AND blocked_until > NOW()
    LIMIT 1;

    IF v_blocked_until IS NOT NULL THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'blocked', true,
            'blocked_until', v_blocked_until,
            'remaining_seconds', EXTRACT(EPOCH FROM (v_blocked_until - NOW()))::integer,
            'message', 'Account temporarily locked. Please try again later.'
        );
    END IF;

    -- Count recent failed attempts
    SELECT COALESCE(SUM(attempt_count), 0) INTO v_attempt_count
    FROM auth_rate_limits
    WHERE identifier = LOWER(p_email)
      AND identifier_type = 'email'
      AND attempt_type = 'login'
      AND first_attempt_at > v_window_start;

    IF v_attempt_count >= v_max_attempts THEN
        -- Block the user
        UPDATE auth_rate_limits
        SET blocked_until = NOW() + (v_block_minutes || ' minutes')::interval
        WHERE identifier = LOWER(p_email)
          AND identifier_type = 'email'
          AND attempt_type = 'login'
          AND first_attempt_at > v_window_start;

        -- Log security event
        INSERT INTO security_audit_log (event_type, details)
        VALUES ('login_blocked', jsonb_build_object(
            'email', p_email,
            'attempt_count', v_attempt_count,
            'blocked_until', NOW() + (v_block_minutes || ' minutes')::interval
        ));

        RETURN jsonb_build_object(
            'allowed', false,
            'blocked', true,
            'blocked_until', NOW() + (v_block_minutes || ' minutes')::interval,
            'remaining_seconds', v_block_minutes * 60,
            'message', 'Account temporarily locked due to too many failed attempts.'
        );
    END IF;

    RETURN jsonb_build_object(
        'allowed', true,
        'blocked', false,
        'remaining_attempts', v_max_attempts - v_attempt_count,
        'message', CASE
            WHEN v_max_attempts - v_attempt_count <= 2 THEN
                format('%s attempts remaining', v_max_attempts - v_attempt_count)
            ELSE NULL
        END
    );
END;
$$;
ALTER FUNCTION "public"."check_login_rate_limit"("p_email" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."check_login_rate_limit"("p_email" "text") IS '@omit';
CREATE OR REPLACE FUNCTION "public"."check_org_creation_rate_limit"("p_user_id" "uuid", "p_ip_address" "inet" DEFAULT NULL::"inet") RETURNS TABLE("allowed" boolean, "user_attempts_used" integer, "ip_attempts_used" integer, "user_reset_at" timestamp with time zone, "ip_reset_at" timestamp with time zone, "reason" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_one_day_ago TIMESTAMPTZ;
  v_one_hour_ago TIMESTAMPTZ;
  v_user_attempts INT;
  v_ip_attempts INT;
  v_max_user_attempts INT := 3;  -- Max 3 orgs per day per user
  v_max_ip_attempts INT := 10;   -- Max 10 orgs per hour per IP
BEGIN
  v_one_day_ago := NOW() - INTERVAL '24 hours';
  v_one_hour_ago := NOW() - INTERVAL '1 hour';

  -- Count user-based successful attempts in last 24 hours
  SELECT COUNT(*) INTO v_user_attempts
  FROM organization_creation_log
  WHERE user_id = p_user_id
    AND timestamp >= v_one_day_ago
    AND status = 'Success';

  -- Check user rate limit
  IF v_user_attempts >= v_max_user_attempts THEN
    RETURN QUERY SELECT
      FALSE,
      v_user_attempts,
      0,
      v_one_day_ago + INTERVAL '24 hours',
      NOW(),
      'Maximum 3 organizations per day limit reached';
    RETURN;
  END IF;

  -- If IP provided, check IP-based attempts
  IF p_ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO v_ip_attempts
    FROM organization_creation_log
    WHERE ip_address = p_ip_address::TEXT
      AND timestamp >= v_one_hour_ago;

    IF v_ip_attempts >= v_max_ip_attempts THEN
      RETURN QUERY SELECT
        FALSE,
        v_user_attempts,
        v_ip_attempts,
        v_one_day_ago + INTERVAL '24 hours',
        v_one_hour_ago + INTERVAL '1 hour',
        'Too many creation attempts from this network';
      RETURN;
    END IF;
  ELSE
    v_ip_attempts := 0;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT
    TRUE,
    v_user_attempts,
    v_ip_attempts,
    v_one_day_ago + INTERVAL '24 hours',
    v_one_hour_ago + INTERVAL '1 hour',
    'Allowed';
END;
$$;
ALTER FUNCTION "public"."check_org_creation_rate_limit"("p_user_id" "uuid", "p_ip_address" "inet") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."check_org_creation_rate_limit"("p_user_id" "uuid", "p_ip_address" "inet") IS 'Check if user can create an organization based on rate limits (3/day per user, 10/hour per IP)';
CREATE OR REPLACE FUNCTION "public"."check_otp_rate_limit"("p_email" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_window_start timestamptz;
    v_attempt_count integer;
    v_blocked_until timestamptz;
    v_max_attempts constant integer := 3;
    v_window_minutes constant integer := 10;
    v_block_minutes constant integer := 60;
BEGIN
    v_window_start := NOW() - (v_window_minutes || ' minutes')::interval;

    -- Check if currently blocked
    SELECT blocked_until INTO v_blocked_until
    FROM auth_rate_limits
    WHERE identifier = LOWER(p_email)
      AND identifier_type = 'email'
      AND attempt_type = 'otp'
      AND blocked_until > NOW()
    LIMIT 1;

    IF v_blocked_until IS NOT NULL THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'blocked', true,
            'blocked_until', v_blocked_until,
            'remaining_seconds', EXTRACT(EPOCH FROM (v_blocked_until - NOW()))::integer,
            'message', 'Too many verification attempts. Please try again later.'
        );
    END IF;

    -- Count recent attempts
    SELECT COALESCE(SUM(attempt_count), 0) INTO v_attempt_count
    FROM auth_rate_limits
    WHERE identifier = LOWER(p_email)
      AND identifier_type = 'email'
      AND attempt_type = 'otp'
      AND first_attempt_at > v_window_start;

    IF v_attempt_count >= v_max_attempts THEN
        -- Block the user
        INSERT INTO auth_rate_limits (identifier, identifier_type, attempt_type, attempt_count, blocked_until)
        VALUES (LOWER(p_email), 'email', 'otp', v_attempt_count, NOW() + (v_block_minutes || ' minutes')::interval)
        ON CONFLICT DO NOTHING;

        RETURN jsonb_build_object(
            'allowed', false,
            'blocked', true,
            'blocked_until', NOW() + (v_block_minutes || ' minutes')::interval,
            'remaining_seconds', v_block_minutes * 60,
            'message', 'Too many verification attempts. Please try again in 1 hour.'
        );
    END IF;

    RETURN jsonb_build_object(
        'allowed', true,
        'blocked', false,
        'remaining_attempts', v_max_attempts - v_attempt_count,
        'message', CASE
            WHEN v_max_attempts - v_attempt_count <= 1 THEN 'Last attempt before lockout'
            ELSE NULL
        END
    );
END;
$$;
ALTER FUNCTION "public"."check_otp_rate_limit"("p_email" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."check_otp_rate_limit"("p_email" "text") IS '@omit';
CREATE OR REPLACE FUNCTION "public"."check_project_linked_to_main_version_and_won"("p_proposal_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  is_main BOOLEAN;
  item_status TEXT;
BEGIN
  IF p_proposal_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT is_main_version, status INTO is_main, item_status
  FROM public.proposals
  WHERE id = p_proposal_id;

  RETURN COALESCE(is_main, false) AND COALESCE(item_status, '') = 'Won';
END;
$$;
ALTER FUNCTION "public"."check_project_linked_to_main_version_and_won"("p_proposal_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."check_project_linked_to_main_version_and_won"("p_proposal_id" "uuid") IS 'Checks that a project is linked to a proposal with is_main_version=true AND status=Won';
CREATE OR REPLACE FUNCTION "public"."check_proposal_is_main_version_and_won"("proposal_id_param" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  is_main BOOLEAN;
  proposal_status TEXT;
BEGIN
  SELECT is_main_version, status INTO is_main, proposal_status
  FROM public.proposals
  WHERE id = proposal_id_param;

  -- Return true only if the proposal is the main version AND has Won status
  RETURN COALESCE(is_main, false) AND COALESCE(proposal_status, '') = 'Won';
END;
$$;
ALTER FUNCTION "public"."check_proposal_is_main_version_and_won"("proposal_id_param" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."cleanup_all_expired_data"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_invite_tokens_deleted INT := 0;
  v_invite_attempts_deleted INT := 0;
  v_creation_log_deleted INT := 0;
  v_onboarding_deleted INT := 0;
  v_profiles_deleted INT := 0;
  v_auth_rate_limits_deleted INT := 0;
  v_result JSONB;
BEGIN
  SELECT cleanup_invite_tokens() INTO v_invite_tokens_deleted;
  SELECT cleanup_invite_token_attempts() INTO v_invite_attempts_deleted;
  SELECT cleanup_organization_creation_log() INTO v_creation_log_deleted;
  SELECT cleanup_expired_onboarding() INTO v_onboarding_deleted;
  SELECT cleanup_unverified_profiles() INTO v_profiles_deleted;
  SELECT cleanup_auth_rate_limits() INTO v_auth_rate_limits_deleted;

  v_result := jsonb_build_object(
    'invite_tokens_deleted', v_invite_tokens_deleted,
    'invite_attempts_deleted', v_invite_attempts_deleted,
    'creation_log_deleted', v_creation_log_deleted,
    'onboarding_deleted', v_onboarding_deleted,
    'profiles_deleted', v_profiles_deleted,
    'auth_rate_limits_deleted', v_auth_rate_limits_deleted,
    'total_deleted', v_invite_tokens_deleted + v_invite_attempts_deleted + v_creation_log_deleted + v_onboarding_deleted + v_profiles_deleted + v_auth_rate_limits_deleted,
    'cleaned_at', NOW()
  );

  IF (v_result->>'total_deleted')::INT > 0 THEN
    RAISE NOTICE 'Cleanup complete: %', v_result;
  END IF;

  RETURN v_result;
END;
$$;
ALTER FUNCTION "public"."cleanup_all_expired_data"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."cleanup_all_expired_data"() IS 'Master cleanup function that runs all maintenance tasks. Scheduled daily at 3 AM UTC.';
CREATE OR REPLACE FUNCTION "public"."cleanup_all_rate_limiting_logs"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  invite_attempts_deleted INTEGER;
  org_creation_deleted INTEGER;
  signup_invites_deleted INTEGER;
  invite_tokens_deleted INTEGER;
BEGIN
  -- Clean up invite token attempts (rate limiting logs)
  SELECT cleanup_invite_token_attempts() INTO invite_attempts_deleted;

  -- Clean up organization creation logs (rate limiting logs)
  SELECT cleanup_organization_creation_log() INTO org_creation_deleted;

  -- Clean up expired/revoked signup invites
  SELECT cleanup_signup_invites() INTO signup_invites_deleted;

  -- Clean up expired/revoked invite tokens
  SELECT cleanup_invite_tokens() INTO invite_tokens_deleted;

  RETURN jsonb_build_object(
    'invite_token_attempts_deleted', invite_attempts_deleted,
    'organization_creation_log_deleted', org_creation_deleted,
    'signup_invites_deleted', signup_invites_deleted,
    'invite_tokens_deleted', invite_tokens_deleted,
    'total_deleted', invite_attempts_deleted + org_creation_deleted + signup_invites_deleted + invite_tokens_deleted,
    'cleaned_at', NOW()
  );
END;
$$;
ALTER FUNCTION "public"."cleanup_all_rate_limiting_logs"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."cleanup_all_rate_limiting_logs"() IS 'Master cleanup function for all rate limiting tables. Scheduled daily at 3:30 AM UTC via pg_cron.';
CREATE OR REPLACE FUNCTION "public"."cleanup_auth_rate_limits"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  WITH deleted AS (
    DELETE FROM auth_rate_limits
    WHERE created_at < NOW() - INTERVAL '7 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  RETURN deleted_count;
EXCEPTION
  WHEN undefined_table THEN RETURN 0;
  WHEN undefined_column THEN
    -- Try with different timestamp column name
    BEGIN
      WITH deleted AS (
        DELETE FROM auth_rate_limits
        WHERE timestamp < NOW() - INTERVAL '7 days'
        RETURNING 1
      )
      SELECT COUNT(*) INTO deleted_count FROM deleted;
      RETURN deleted_count;
    EXCEPTION WHEN OTHERS THEN RETURN 0;
    END;
END;
$$;
ALTER FUNCTION "public"."cleanup_auth_rate_limits"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."cleanup_expired_invite_tokens"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM public.invite_tokens
  WHERE expires_at < now() - interval '1 day';
  RETURN NULL;
END;
$$;
ALTER FUNCTION "public"."cleanup_expired_invite_tokens"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."cleanup_expired_invite_tokens"() IS 'Security: Internal cron function. EXECUTE revoked from all roles except service_role.';
CREATE OR REPLACE FUNCTION "public"."cleanup_expired_onboarding"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Delete expired onboarding progress entries
    DELETE FROM public.user_onboarding_progress
    WHERE expires_at < now();

    -- Also delete auth.users that were never verified and are older than 48 hours
    -- This requires checking if they have a profile (verified) or not (unverified)
    DELETE FROM auth.users
    WHERE id IN (
        SELECT u.id
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.id
        WHERE p.id IS NULL
        AND u.created_at < now() - interval '48 hours'
        AND u.email_confirmed_at IS NULL
    );
END;
$$;
ALTER FUNCTION "public"."cleanup_expired_onboarding"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."cleanup_expired_onboarding"() IS 'Run daily via pg_cron to clean up expired onboarding entries and unverified users';
CREATE OR REPLACE FUNCTION "public"."cleanup_expired_rate_limits"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_deleted integer;
BEGIN
    DELETE FROM auth_rate_limits
    WHERE first_attempt_at < NOW() - interval '24 hours'
       OR (blocked_until IS NOT NULL AND blocked_until < NOW() - interval '1 hour');

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;
ALTER FUNCTION "public"."cleanup_expired_rate_limits"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."cleanup_invite_token_attempts"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete attempts older than 7 days
  WITH deleted AS (
    DELETE FROM invite_token_attempts
    WHERE created_at < NOW() - INTERVAL '7 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  IF deleted_count > 0 THEN
    RAISE NOTICE 'Invite token attempts cleanup: % records deleted', deleted_count;
  END IF;

  RETURN deleted_count;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Table invite_token_attempts does not exist, skipping';
    RETURN 0;
END;
$$;
ALTER FUNCTION "public"."cleanup_invite_token_attempts"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."cleanup_invite_token_attempts"() IS 'Cleans up invite token attempt records older than 7 days. Called by cleanup_all_rate_limiting_logs.';
CREATE OR REPLACE FUNCTION "public"."cleanup_invite_tokens"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  expired_count INTEGER := 0;
  revoked_count INTEGER := 0;
  total_deleted INTEGER := 0;
BEGIN
  -- 1. Delete expired tokens
  WITH deleted_expired AS (
    DELETE FROM invite_tokens
    WHERE expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM deleted_expired;

  -- 2. Delete revoked tokens older than 30 days
  WITH deleted_revoked AS (
    DELETE FROM invite_tokens
    WHERE revoked_at IS NOT NULL
      AND revoked_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO revoked_count FROM deleted_revoked;

  total_deleted := expired_count + revoked_count;

  -- Log the cleanup (optional - can be viewed in Supabase logs)
  IF total_deleted > 0 THEN
    RAISE NOTICE 'Invite token cleanup: % expired, % old revoked, % total deleted',
      expired_count, revoked_count, total_deleted;
  END IF;

  RETURN total_deleted;
END;
$$;
ALTER FUNCTION "public"."cleanup_invite_tokens"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."cleanup_signup_invites"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  expired_count INTEGER := 0;
  revoked_count INTEGER := 0;
  used_count INTEGER := 0;
  total_deleted INTEGER := 0;
BEGIN
  -- 1. Delete expired & unused signup invites
  WITH deleted_expired AS (
    DELETE FROM signup_invites
    WHERE expires_at < NOW()
      AND is_used = false
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM deleted_expired;

  -- 2. Delete revoked signup invites older than 30 days
  WITH deleted_revoked AS (
    DELETE FROM signup_invites
    WHERE revoked_at IS NOT NULL
      AND revoked_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO revoked_count FROM deleted_revoked;

  -- 3. Delete used signup invites older than 90 days (keep for audit trail)
  WITH deleted_used AS (
    DELETE FROM signup_invites
    WHERE is_used = true
      AND used_at IS NOT NULL
      AND used_at < NOW() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO used_count FROM deleted_used;

  total_deleted := expired_count + revoked_count + used_count;

  IF total_deleted > 0 THEN
    RAISE NOTICE 'Signup invite cleanup: % expired, % old revoked, % old used, % total deleted',
      expired_count, revoked_count, used_count, total_deleted;
  END IF;

  RETURN total_deleted;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Table signup_invites does not exist, skipping';
    RETURN 0;
END;
$$;
ALTER FUNCTION "public"."cleanup_signup_invites"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."cleanup_invite_tokens"() IS 'Cleans up expired invite tokens and revoked tokens older than 30 days. Scheduled to run daily at 3 AM UTC.';
CREATE OR REPLACE FUNCTION "public"."cleanup_old_invite_attempts"("p_days_to_keep" integer DEFAULT 30) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  DELETE FROM invite_token_attempts
  WHERE attempted_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % old invite attempts', v_deleted_count;
  RETURN v_deleted_count;
END;
$$;
ALTER FUNCTION "public"."cleanup_old_invite_attempts"("p_days_to_keep" integer) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."cleanup_old_qb_requests"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM quickbooks_request_queue
  WHERE queue_status IN ('ompleted', 'Failed')
  AND completed_at < NOW() - INTERVAL '30 days';
END;
$$;
ALTER FUNCTION "public"."cleanup_old_qb_requests"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."cleanup_org_rate_limits"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    DELETE FROM public.organization_creation_rate_limit 
    WHERE created_at < now() - interval '1 hour';
END;
$$;
ALTER FUNCTION "public"."cleanup_org_rate_limits"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."cleanup_organization_creation_log"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete logs older than 7 days
  WITH deleted AS (
    DELETE FROM organization_creation_log
    WHERE timestamp < NOW() - INTERVAL '7 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  IF deleted_count > 0 THEN
    RAISE NOTICE 'Organization creation log cleanup: % records deleted', deleted_count;
  END IF;

  RETURN deleted_count;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Table organization_creation_log does not exist, skipping';
    RETURN 0;
END;
$$;
ALTER FUNCTION "public"."cleanup_organization_creation_log"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."cleanup_organization_creation_log"() IS 'Cleans up organization creation log records older than 7 days. Called by cleanup_all_rate_limiting_logs.';
CREATE OR REPLACE FUNCTION "public"."cleanup_unverified_profiles"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;
ALTER FUNCTION "public"."cleanup_unverified_profiles"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."cleanup_unverified_profiles"() IS 'Deletes profiles and auth.users for unverified users older than 168 hours.
Run daily via pg_cron: SELECT cron.schedule(''cleanup-unverified-profiles'', ''0 3 * * *'', ''SELECT public.cleanup_unverified_profiles()'');';
CREATE OR REPLACE FUNCTION "public"."clear_auth_rate_limit"("p_email" "text", "p_attempt_type" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    DELETE FROM auth_rate_limits
    WHERE identifier = LOWER(p_email)
      AND identifier_type = 'email'
      AND attempt_type = p_attempt_type;
END;
$$;
ALTER FUNCTION "public"."clear_auth_rate_limit"("p_email" "text", "p_attempt_type" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."clear_auth_rate_limit"("p_email" "text", "p_attempt_type" "text") IS '@omit';
CREATE OR REPLACE FUNCTION "public"."create_default_task_columns"("org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO public.task_board_columns (organization_id, name, slug, color, position, is_default)
    VALUES
        (org_id, 'To-Do', 'todo', '#94A3B8', 0, true),       -- Slate gray
        (org_id, 'In Progress', 'in_progress', '#3B82F6', 1, true), -- Blue
        (org_id, 'Completed', 'done', '#10B981', 2, true)    -- Green
    ON CONFLICT (organization_id, slug) DO NOTHING;
END;
$$;
ALTER FUNCTION "public"."create_default_task_columns"("org_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."create_default_workflow_columns"("org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO project_workflow_columns (organization_id, name, color, column_order, is_default)
  VALUES
    (org_id, 'Active', '#3B82F6', 0, true),     -- Blue
    (org_id, 'Completed', '#10B981', 1, true)   -- Green
  ON CONFLICT (organization_id, name) DO NOTHING;
END;
$$;
ALTER FUNCTION "public"."create_default_workflow_columns"("org_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."create_org_with_owner"("org_name" "text", "found_via" "text" DEFAULT NULL::"text", "industry" "text" DEFAULT NULL::"text", "owner_id" "uuid" DEFAULT "auth"."uid"(), "org_prefix" "text" DEFAULT NULL::"text") RETURNS TABLE("org_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_org_id uuid;
  computed_prefix text;
  cleaned_name text;
  words text[];
BEGIN
  -- Generate prefix from org_name if not provided
  IF org_prefix IS NULL OR org_prefix = '' THEN
    cleaned_name := regexp_replace(
      regexp_replace(upper(trim(org_name)), '[-_]', ' ', 'g'),
      '[^A-Z ]', '', 'g'
    );
    words := regexp_split_to_array(trim(cleaned_name), '\s+');

    IF array_length(words, 1) = 1 THEN
      computed_prefix := LEFT(regexp_replace(upper(trim(org_name)), '[^A-Z]', '', 'g'), 3);
    ELSIF array_length(words, 1) > 1 THEN
      computed_prefix :=
        COALESCE(LEFT(words[1], 1), '') ||
        COALESCE(LEFT(words[2], 1), '') ||
        COALESCE(LEFT(words[3], 1), '');
    END IF;

    IF computed_prefix IS NULL OR computed_prefix = '' THEN
      computed_prefix := 'TSK';
    END IF;
  ELSE
    computed_prefix := UPPER(org_prefix);
  END IF;

  -- Insert organization with industry, found_via, and org_prefix
  INSERT INTO organizations (
    name,
    industry,
    found_via,
    org_prefix,
    created_at,
    updated_at
  ) VALUES (
    org_name,
    industry,
    found_via,
    computed_prefix,
    now(),
    now()
  )
  RETURNING id INTO new_org_id;

  -- Insert owner membership
  INSERT INTO memberships (
    user_id,
    organization_id,
    role,
    status,
    join_type,
    joined_at,
    created_at,
    updated_at
  ) VALUES (
    owner_id,
    new_org_id,
    'Owner',
    'Active',
    'Direct',
    now(),
    now(),
    now()
  );

  -- Return the organization ID
  RETURN QUERY SELECT new_org_id;
END;
$$;
ALTER FUNCTION "public"."create_org_with_owner"("org_name" "text", "found_via" "text", "industry" "text", "owner_id" "uuid", "org_prefix" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."create_org_with_owner"("org_name" "text", "found_via" "text", "industry" "text", "owner_id" "uuid", "org_prefix" "text") IS 'Creates organization with owner membership. org_prefix is a Jira-style prefix for task references.';
CREATE OR REPLACE FUNCTION "public"."create_workflow_columns_for_new_org"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM create_default_workflow_columns(NEW.id);
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."create_workflow_columns_for_new_org"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."enforce_query_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- This is a placeholder - actual enforcement happens at application level
    -- and via Supabase settings
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."enforce_query_limit"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."ensure_single_main_version_for_proposals"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
        UPDATE public.proposals
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
$$;
ALTER FUNCTION "public"."ensure_single_main_version_for_proposals"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."ensure_single_main_version_for_proposals"() IS 'Ensures only one proposal per base proposal number can have is_main_version = true. When setting a proposal as main version, all other versions in the same group are automatically set to false.';
CREATE OR REPLACE FUNCTION "public"."generate_next_proposal_number"("p_form_id" "uuid", "p_starting_number" character varying) RETURNS character varying
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_prefix VARCHAR;
  v_starting_num INTEGER;
  v_max_num INTEGER;
  v_next_num INTEGER;
  v_num_length INTEGER;
BEGIN
  -- Parse the starting number to extract prefix and numeric part
  -- Examples: "Q1200" -> prefix="Q", num=1200
  --           "ER-2025-001" -> prefix="ER-2025-", num=1
  --           "SR001" -> prefix="SR", num=1

  -- Extract numeric part from the end of the string
  v_starting_num := CAST(regexp_replace(p_starting_number, '^.*?(\d+)$', '\1') AS INTEGER);

  -- Extract prefix (everything before the final number)
  v_prefix := regexp_replace(p_starting_number, '\d+$', '');

  -- Get the length of the numeric part (for zero-padding)
  v_num_length := length(regexp_replace(p_starting_number, '^.*?(\d+)$', '\1'));

  -- Find the highest number used for proposals from this form
  SELECT COALESCE(MAX(
    CAST(regexp_replace(proposal_number, '^.*?(\d+)$', '\1') AS INTEGER)
  ), v_starting_num - 1)
  INTO v_max_num
  FROM proposals
  WHERE form_id = p_form_id
    AND proposal_number ~ ('^' || v_prefix || '\d+$');

  -- Increment to get next number
  v_next_num := v_max_num + 1;

  -- Construct the full proposal number with proper zero-padding
  RETURN v_prefix || LPAD(v_next_num::VARCHAR, v_num_length, '0');
END;
$_$;
ALTER FUNCTION "public"."generate_next_proposal_number"("p_form_id" "uuid", "p_starting_number" character varying) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."generate_next_proposal_number"("p_form_id" "uuid", "p_starting_number" character varying) IS 'Generates the next proposal number by incrementing from the form''s starting number (e.g., Q1200 -> Q1201 -> Q1202)';
CREATE OR REPLACE FUNCTION "public"."generate_proposal_version"("p_parent_proposal_number" character varying, "p_organization_id" "uuid") RETURNS character varying
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_main_number VARCHAR;
  v_highest_version INTEGER;
  v_next_version INTEGER;
BEGIN
  -- Extract main number (strip any existing version suffix)
  -- Examples: "SR-1005" -> "SR-1005"
  --           "SR-1005.1" -> "SR-1005"
  --           "Q1200.2" -> "Q1200"
  v_main_number := regexp_replace(p_parent_proposal_number, '\.\d+$', '');

  -- Find the highest version number for this base proposal number
  -- Look for all proposals with the same main number (with or without version suffix)
  -- Extract version number from proposal_number strings
  SELECT COALESCE(
    MAX(
      CASE
        WHEN proposal_number ~ ('^' || v_main_number || '\.\d+$') THEN
          -- Has version suffix, extract it
          CAST(regexp_replace(proposal_number, '^.*\.(\d+)$', '\1') AS INTEGER)
        ELSE
          -- No version suffix, version 1
          1
      END
    ),
    0
  )
  INTO v_highest_version
  FROM proposals
  WHERE organization_id = p_organization_id
    AND proposal_number ~ ('^' || v_main_number || '(\.\d+)?$');

  -- Increment to get next version
  v_next_version := v_highest_version + 1;

  -- Construct the versioned proposal number
  -- First version (revision) gets .2 suffix, original has no suffix or .1
  -- Examples: SR-1005 -> SR-1005.2 (first revision)
  --           SR-1005.2 -> SR-1005.3 (second revision)
  IF v_next_version = 1 THEN
    -- This shouldn't happen if called correctly, but handle it
    RETURN v_main_number;
  ELSE
    RETURN v_main_number || '.' || v_next_version;
  END IF;
END;
$_$;
ALTER FUNCTION "public"."generate_proposal_version"("p_parent_proposal_number" character varying, "p_organization_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."generate_proposal_version"("p_parent_proposal_number" character varying, "p_organization_id" "uuid") IS 'Generates a new version number for a proposal revision (e.g., SR-1005 -> SR-1005.2 -> SR-1005.3)';
CREATE OR REPLACE FUNCTION "public"."generate_task_reference"("org_id" "uuid", "task_title" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  org_name TEXT;
  initials TEXT;
  words TEXT[];
  word TEXT;
  next_num INTEGER;
  new_ref TEXT;
BEGIN
  -- Get organization name
  SELECT name INTO org_name
  FROM public.organizations
  WHERE id = org_id;

  -- Fallback if org not found
  IF org_name IS NULL OR org_name = '' THEN
    org_name := 'TASK';
  END IF;

  -- Split org name into words and get initials (max 3 characters)
  words := string_to_array(upper(trim(org_name)), ' ');
  initials := '';

  FOREACH word IN ARRAY words LOOP
    IF length(word) > 0 THEN
      initials := initials || left(word, 1);
    END IF;
    EXIT WHEN length(initials) >= 3;
  END LOOP;

  -- If single word and less than 3 chars, take more letters
  IF array_length(words, 1) = 1 AND length(initials) < 3 THEN
    initials := upper(left(trim(org_name), 3));
  END IF;

  -- Ensure we have at least 2 characters
  IF length(initials) < 2 THEN
    initials := upper(left(trim(org_name), 2));
  END IF;

  -- Find the next number for this organization (sequential across all tasks)
  SELECT COALESCE(MAX(
    CAST(
      REGEXP_REPLACE(reference, '^[A-Z]+-', '') AS INTEGER
    )
  ), 0) + 1 INTO next_num
  FROM public.project_tasks
  WHERE organization_id = org_id
    AND reference ~ '^[A-Z]+-[0-9]+$';

  new_ref := initials || '-' || next_num;

  RETURN new_ref;
END;
$_$;
ALTER FUNCTION "public"."generate_task_reference"("org_id" "uuid", "task_title" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."generate_task_reference"("org_id" "uuid", "task_title" "text") IS 'Generates task reference from organization name (e.g., CW-1 for Contemporary Walls)';
CREATE OR REPLACE FUNCTION "public"."get_current_user_organization"() RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (
    SELECT m.organization_id
    FROM public.memberships m  -- <- fixed here
    WHERE m.user_id = auth.uid()
      AND m.status = 'Active'
    LIMIT 1
  );
END;
$$;
ALTER FUNCTION "public"."get_current_user_organization"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_current_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (
    SELECT m.role
    FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.status = 'Active'
    LIMIT 1
  );
END;
$$;
ALTER FUNCTION "public"."get_current_user_role"() OWNER TO "postgres";
COMMENT ON COLUMN "public"."available_integrations"."platform_requirement" IS 'Platform requirement label (e.g., "Windows Only", "Mac Only", "Windows/Mac")';
CREATE OR REPLACE FUNCTION "public"."get_integrations_for_plan"("plan_name" "text") RETURNS SETOF "public"."available_integrations"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM available_integrations
  WHERE is_enabled = true
    AND (required_plan IS NULL OR required_plan = plan_name OR plan_name = 'Enterprise')
  ORDER BY display_order, name;
END;
$$;
ALTER FUNCTION "public"."get_integrations_for_plan"("plan_name" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_model_configuration"("p_model_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'model_id', pm.id,
        'model_name', pm.name,
        'series_id', ps.id,
        'series_name', ps.name,
        'product_line_id', pl.id,
        'product_line_name', pl.name,
        'option_groups', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', og.id,
                    'name', og.name,
                    'slug', og.slug,
                    'field_type', og.field_type,
                    'input_type', og.input_type,
                    'allowed_values', (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id', ov.id,
                                'value', ov.value
                            ) ORDER BY COALESCE(mav.sort_order, ov.sort_order)
                        ), '[]'::jsonb)
                        FROM pc_model_allowed_values mav
                        JOIN pc_option_values ov ON ov.id = mav.option_value_id
                        WHERE mav.model_option_id = mo.id
                        AND ov.is_active = true
                    ),
                    'default_value', COALESCE(
                        (SELECT ov.value FROM pc_option_values ov WHERE ov.id = mo.default_value_id),
                        mo.default_input_value
                    ),
                    'ui_metadata', jsonb_build_object(
                        'display_order', mo.display_order,
                        'display_group', mo.display_group,
                        'grid_span', mo.grid_span,
                        'placeholder', mo.placeholder,
                        'help_text', mo.help_text,
                        'is_required', mo.is_required,
                        'is_multi_select', mo.is_multi_select,
                        'is_manual_select', mo.is_manual_select,
                        'is_visible', mo.is_visible,
                        'min_value', mo.min_value,
                        'max_value', mo.max_value,
                        'step_value', mo.step_value
                    )
                ) ORDER BY mo.display_order
            ), '[]'::jsonb)
            FROM pc_model_options mo
            JOIN pc_option_groups og ON og.id = mo.option_group_id
            WHERE mo.model_id = pm.id
        ),
        'rules', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', r.id,
                    'name', r.name,
                    'description', r.description,
                    'priority', r.priority,
                    'condition', r.condition,
                    'effect', r.effect
                ) ORDER BY r.priority DESC
            ), '[]'::jsonb)
            FROM pc_rules r
            WHERE r.model_id = pm.id
            AND r.is_active = true
        )
    ) INTO v_result
    FROM product_models pm
    LEFT JOIN product_series ps ON ps.id = pm.product_series_id
    LEFT JOIN product_line pl ON pl.id = pm.product_line_id
    WHERE pm.id = p_model_id;

    RETURN v_result;
END;
$$;
ALTER FUNCTION "public"."get_model_configuration"("p_model_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_org_member_ids"("target_user_id" "uuid") RETURNS TABLE("user_id" "uuid")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT m2.user_id
  FROM public.memberships m1
  JOIN public.memberships m2 ON m1.organization_id = m2.organization_id
  WHERE m1.user_id = target_user_id
  AND m1.status = 'Active'  -- Current user must be Active
  AND m2.status IN ('Active', 'Pending');  -- Can see both Active and Pending members
END;
$$;
ALTER FUNCTION "public"."get_org_member_ids"("target_user_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_org_member_ids"("target_user_id" "uuid") IS 'Get user IDs of all members (Active and Pending) in same organization(s). SECURITY DEFINER bypasses RLS.';
CREATE OR REPLACE FUNCTION "public"."get_organization_pending_ai_suggestions"("org_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(ai_pending_suggestions_count), 0)::INTEGER
    FROM public.proposals
    WHERE organization_id = org_id
  );
END;
$$;
ALTER FUNCTION "public"."get_organization_pending_ai_suggestions"("org_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_remaining_org_creations"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_used INT;
  v_max INT := 3;
BEGIN
  SELECT COUNT(*) INTO v_used
  FROM organization_creation_log
  WHERE user_id = p_user_id
    AND timestamp >= NOW() - INTERVAL '24 hours'
    AND status = 'Success';

  RETURN GREATEST(0, v_max - v_used);
END;
$$;
ALTER FUNCTION "public"."get_remaining_org_creations"("p_user_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_remaining_org_creations"("p_user_id" "uuid") IS 'Get number of organizations user can still create today';
CREATE OR REPLACE FUNCTION "public"."get_user_org_folders"("check_user_id" "uuid") RETURNS TABLE("org_folder" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT m.organization_id::text
  FROM public.memberships m
  WHERE m.user_id = check_user_id
  AND m.status = 'Active';
END;
$$;
ALTER FUNCTION "public"."get_user_org_folders"("check_user_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_user_org_folders"("check_user_id" "uuid") IS 'Get organization folder names for user. SECURITY DEFINER bypasses RLS.';
CREATE OR REPLACE FUNCTION "public"."get_user_org_ids"("check_user_id" "uuid") RETURNS TABLE("organization_id" "uuid")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT m.organization_id
  FROM public.memberships m
  WHERE m.user_id = check_user_id
  AND m.status = 'Active';
END;
$$;
ALTER FUNCTION "public"."get_user_org_ids"("check_user_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_user_org_ids"("check_user_id" "uuid") IS 'Get all organization IDs where user is active member. SECURITY DEFINER bypasses RLS.';
CREATE OR REPLACE FUNCTION "public"."get_value_set"("p_slug" character varying) RETURNS TABLE("id" "uuid", "slug" character varying, "name" character varying, "category" character varying, "manufacturer_id" "uuid", "values" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    cvs.id,
    cvs.slug,
    cvs.name,
    cvs.category,
    cvs.manufacturer_id,
    cvs."values",
    cvs.created_at,
    cvs.updated_at
  FROM config_value_sets cvs
  WHERE cvs.slug = p_slug;
$$;
ALTER FUNCTION "public"."get_value_set"("p_slug" character varying) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_value_set"("p_slug" character varying) IS 'Get a config_value_set by its slug. Returns the complete value set record.';
CREATE OR REPLACE FUNCTION "public"."get_value_sets_by_slugs"("p_slugs" character varying[]) RETURNS TABLE("id" "uuid", "slug" character varying, "name" character varying, "category" character varying, "manufacturer_id" "uuid", "values" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    cvs.id,
    cvs.slug,
    cvs.name,
    cvs.category,
    cvs.manufacturer_id,
    cvs."values",
    cvs.created_at,
    cvs.updated_at
  FROM config_value_sets cvs
  WHERE cvs.slug = ANY(p_slugs);
$$;
ALTER FUNCTION "public"."get_value_sets_by_slugs"("p_slugs" character varying[]) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."handle_auth_user_email_sync"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;
ALTER FUNCTION "public"."handle_auth_user_email_sync"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."handle_proposal_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only proceed if status actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN

    -- Log the status change to audit table
    INSERT INTO proposal_status_transitions (
      proposal_id,
      organization_id,
      from_status,
      to_status,
      transitioned_by,
      transitioned_at,
      notes
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      OLD.status,
      NEW.status,
      auth.uid(),
      NOW(),
      CASE
        WHEN OLD.status IS NULL THEN 'Proposal created'
        ELSE 'Status changed from ' || COALESCE(OLD.status, 'null') || ' to ' || NEW.status
      END
    );

    -- Update timestamp fields based on new status (CASE-INSENSITIVE)
    IF LOWER(COALESCE(NEW.status, '')) = 'submitted' AND NEW.submitted_at IS NULL THEN
      NEW.submitted_at = NOW();
    ELSIF LOWER(COALESCE(NEW.status, '')) = 'won' AND NEW.won_at IS NULL THEN
      NEW.won_at = NOW();
    ELSIF LOWER(COALESCE(NEW.status, '')) = 'rejected' AND NEW.rejected_at IS NULL THEN
      NEW.rejected_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."handle_proposal_status_change"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."handle_rpc_error"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Log the actual error internally
    INSERT INTO public.security_audit_log (event_type, details)
    VALUES ('rpc_error', jsonb_build_object(
        'function', TG_TABLE_NAME,
        'error', SQLERRM
    ));

    -- Return generic error
    RAISE EXCEPTION 'Operation not permitted';
END;
$$;
ALTER FUNCTION "public"."handle_rpc_error"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF row(NEW.*) IS DISTINCT FROM row(OLD.*) THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."handle_updated_at"() IS 'Generic trigger function to update updated_at timestamp.
Includes optimization: only updates if row actually changed.
Used by all tables with updated_at columns.

Tables using this function (12 total):
- memberships
- organizations
- profiles
- proposals
- subscription_plans
- subscriptions
- form_definitions
- form_submissions
- project_workflow_columns
- projects
- user_onboarding_progress
- reminders

Replaced functions:
- update_updated_at_column (removed)
- update_reminders_updated_at (removed)
';
CREATE OR REPLACE FUNCTION "public"."handle_user_deletion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Update all proposals by this user to show "Deleted User"
    UPDATE public.proposals
    SET created_by_name = 'Deleted User'
    WHERE created_by = OLD.id;

    -- Update all contacts created by this user to show "Deleted User"
    UPDATE public.contacts
    SET created_by_name = 'Deleted User'
    WHERE created_by = OLD.id;

    RETURN OLD;
END;
$$;
ALTER FUNCTION "public"."handle_user_deletion"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."has_org_role"("check_user_id" "uuid", "check_org_id" "uuid", "required_roles" "text"[]) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;
ALTER FUNCTION "public"."has_org_role"("check_user_id" "uuid", "check_org_id" "uuid", "required_roles" "text"[]) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."has_org_role"("check_user_id" "uuid", "check_org_id" "uuid", "required_roles" "text"[]) IS 'Check if user has specific role(s) in organization. SECURITY DEFINER bypasses RLS.';
CREATE OR REPLACE FUNCTION "public"."has_valid_subscription"("org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.organization_id = org_id
    AND s.access_blocked = false
    AND (
      -- Normal active access
      (s.is_active = true AND LOWER(s.stripe_subscription_status) IN ('active', 'trialing'))
      OR
      -- Grace period access
      (s.grace_period_end IS NOT NULL AND s.grace_period_end > now())
    )
  );
END;
$$;
ALTER FUNCTION "public"."has_valid_subscription"("org_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."invoke_notification_email_edge_function"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  edge_function_url TEXT;
  anon_key TEXT;
  request_id BIGINT;
BEGIN
  -- Construct the Edge Function URL using the project reference
  -- This is the hosted Supabase URL
  edge_function_url := 'https://iukfjhzmjgvtxefhhshd.supabase.co/functions/v1/check-due-notifications';

  -- Get the anon key from vault (or use service_role for internal calls)
  -- Note: For internal cron calls, we can use the service_role key stored in vault
  SELECT decrypted_secret INTO anon_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  -- If no vault secret, try using a hardcoded approach (less secure but works)
  IF anon_key IS NULL THEN
    -- Fall back to just calling without auth (Edge Function should handle this)
    -- The Edge Function can verify the request is from cron via other means
    RAISE NOTICE 'No service_role_key in vault, calling Edge Function without auth header';

    SELECT net.http_post(
      url := edge_function_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{"source": "pg_cron"}'::jsonb
    ) INTO request_id;
  ELSE
    -- Call with proper authorization
    SELECT net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := '{"source": "pg_cron"}'::jsonb
    ) INTO request_id;
  END IF;

  RAISE NOTICE 'Invoked check-due-notifications Edge Function, request_id: %', request_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail - in-app notifications should still work
    RAISE WARNING 'Failed to invoke Edge Function: %', SQLERRM;
END;
$$;
ALTER FUNCTION "public"."invoke_notification_email_edge_function"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."invoke_notification_email_edge_function"() IS 'Invokes the check-due-notifications Edge Function via HTTP to send emails. Called by process_all_due_notifications.';
CREATE OR REPLACE FUNCTION "public"."invoke_signature_reminders_edge_function"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  edge_function_url TEXT;
  service_key TEXT;
  request_id BIGINT;
BEGIN
  edge_function_url := 'https://iukfjhzmjgvtxefhhshd.supabase.co/functions/v1/signature-reminders';

  -- Get service_role key from vault
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF service_key IS NULL THEN
    RAISE NOTICE 'No service_role_key in vault, calling without auth header';
    SELECT net.http_post(
      url := edge_function_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{"source": "pg_cron"}'::jsonb
    ) INTO request_id;
  ELSE
    SELECT net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := '{"source": "pg_cron"}'::jsonb
    ) INTO request_id;
  END IF;

  RAISE NOTICE 'Invoked signature-reminders Edge Function, request_id: %', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to invoke signature-reminders Edge Function: %', SQLERRM;
END;
$$;
ALTER FUNCTION "public"."invoke_signature_reminders_edge_function"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."invoke_signature_reminders_edge_function"() IS 'Invokes the signature-reminders Edge Function via HTTP to send reminder emails. Called hourly by pg_cron.';
CREATE OR REPLACE FUNCTION "public"."is_active_member"("check_user_id" "uuid", "check_org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;
ALTER FUNCTION "public"."is_active_member"("check_user_id" "uuid", "check_org_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."is_active_member"("check_user_id" "uuid", "check_org_id" "uuid") IS 'Check if user is active member of organization. SECURITY DEFINER bypasses RLS.';
CREATE OR REPLACE FUNCTION "public"."is_org_folder_admin"("check_user_id" "uuid", "folder_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;
ALTER FUNCTION "public"."is_org_folder_admin"("check_user_id" "uuid", "folder_name" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."is_org_folder_admin"("check_user_id" "uuid", "folder_name" "text") IS 'Check if user is Owner/Admin in specific org folder. SECURITY DEFINER bypasses RLS.';
CREATE OR REPLACE FUNCTION "public"."is_owner_or_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN get_current_user_role() IN ('Owner', 'Admin');
END;
$$;
ALTER FUNCTION "public"."is_owner_or_admin"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;
ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."is_valid_config_schema"("schema" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check required top-level keys
  IF schema IS NULL THEN
    RETURN TRUE; -- NULL is allowed
  END IF;

  IF NOT (schema ? 'version' AND schema ? 'options') THEN
    RETURN FALSE;
  END IF;

  -- Check version is a string
  IF jsonb_typeof(schema->'version') != 'string' THEN
    RETURN FALSE;
  END IF;

  -- Check options is an object
  IF jsonb_typeof(schema->'options') != 'object' THEN
    RETURN FALSE;
  END IF;

  -- If groups exists, it must be an array
  IF schema ? 'groups' AND jsonb_typeof(schema->'groups') != 'array' THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;
ALTER FUNCTION "public"."is_valid_config_schema"("schema" "jsonb") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."is_valid_config_schema"("schema" "jsonb") IS 'Validates that a config_schema JSONB value has the required structure (version, options, optional groups).';
CREATE OR REPLACE FUNCTION "public"."link_contact_to_member"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  member_email TEXT;
  contact_record RECORD;
BEGIN
  -- Get the member's email from profiles table
  SELECT email INTO member_email
  FROM profiles
  WHERE id = NEW.user_id;

  -- Find matching contact by email (case-insensitive)
  FOR contact_record IN
    SELECT id, emails
    FROM contacts
    WHERE organization_id = NEW.organization_id
      AND user_id IS NULL -- Only link unlinked contacts
  LOOP
    -- Check if any of the contact's emails match the member's email
    IF EXISTS (
      SELECT 1
      FROM unnest(contact_record.emails) AS contact_email
      WHERE LOWER(contact_email) = LOWER(member_email)
    ) THEN
      -- Link the contact to the user
      UPDATE contacts
      SET
        user_id = NEW.user_id,
        is_in_organization = TRUE,
        updated_at = NOW()
      WHERE id = contact_record.id;

      -- Log the link
      RAISE NOTICE 'Linked contact % to user %', contact_record.id, NEW.user_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."link_contact_to_member"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."link_contact_to_member"() IS 'Function exists but trigger disabled - was causing "user_id does not exist" errors';
CREATE OR REPLACE FUNCTION "public"."log_invite_attempt"("p_ip_address" "inet", "p_user_id" "uuid", "p_invite_token" "text", "p_success" boolean, "p_error_message" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_attempt_id UUID;
BEGIN
  -- Log the attempt
  INSERT INTO invite_token_attempts (
    ip_address,
    user_id,
    invite_token,
    success,
    error_message
  ) VALUES (
    p_ip_address,
    p_user_id,
    p_invite_token,
    p_success,
    p_error_message
  )
  RETURNING id INTO v_attempt_id;

  -- If attempt was successful, mark the token as used
  -- Using SECURITY DEFINER allows this to bypass RLS
  IF p_success THEN
    UPDATE invite_tokens
    SET is_used = TRUE
    WHERE token = p_invite_token;
  END IF;

  RETURN v_attempt_id;
END;
$$;
ALTER FUNCTION "public"."log_invite_attempt"("p_ip_address" "inet", "p_user_id" "uuid", "p_invite_token" "text", "p_success" boolean, "p_error_message" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."log_org_creation_attempt"("p_user_id" "uuid", "p_status" "text", "p_ip_address" "text" DEFAULT NULL::"text", "p_error_message" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Validate status
  IF p_status NOT IN ('Success', 'Failed', 'Rate_Limited') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be Success, Failed, or Rate_Limited', p_status;
  END IF;

  INSERT INTO organization_creation_log (
    user_id,
    timestamp,
    ip_address,
    status,
    error_message
  ) VALUES (
    p_user_id,
    NOW(),
    p_ip_address,
    p_status,
    p_error_message
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;
ALTER FUNCTION "public"."log_org_creation_attempt"("p_user_id" "uuid", "p_status" "text", "p_ip_address" "text", "p_error_message" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."log_org_creation_attempt"("p_user_id" "uuid", "p_status" "text", "p_ip_address" "text", "p_error_message" "text") IS 'Log an organization creation attempt. Uses SECURITY DEFINER to bypass RLS.';
CREATE OR REPLACE FUNCTION "public"."log_security_event"("p_event_type" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_organization_id" "uuid" DEFAULT NULL::"uuid", "p_details" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO security_audit_log (event_type, user_id, organization_id, details)
    VALUES (p_event_type, COALESCE(p_user_id, auth.uid()), p_organization_id, p_details)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;
ALTER FUNCTION "public"."log_security_event"("p_event_type" "text", "p_user_id" "uuid", "p_organization_id" "uuid", "p_details" "jsonb") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."log_security_event"("p_event_type" "text", "p_user_id" "uuid", "p_organization_id" "uuid", "p_details" "jsonb") IS 'Security: Internal logging function. EXECUTE revoked from all roles except service_role.';
CREATE OR REPLACE FUNCTION "public"."mark_scheduled_notifications_sent"("notification_ids" "uuid"[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  updated_count INTEGER := 0;
  rows_affected INTEGER;
  current_timestamp_utc TIMESTAMPTZ;
BEGIN
  current_timestamp_utc := NOW();

  -- For one-time notifications: mark as sent
  UPDATE scheduled_notifications
  SET
    status = 'Sent',
    sent_at = current_timestamp_utc,
    last_sent_at = current_timestamp_utc,
    updated_at = current_timestamp_utc
  WHERE id = ANY(notification_ids)
    AND recurrence = 'Once'
    AND status = 'Pending';

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  updated_count := rows_affected;

  -- For recurring notifications: update last_sent_at but keep pending
  UPDATE scheduled_notifications
  SET
    last_sent_at = current_timestamp_utc,
    updated_at = current_timestamp_utc
  WHERE id = ANY(notification_ids)
    AND recurrence IN ('Daily', 'Weekly')
    AND status = 'Pending';

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  updated_count := updated_count + rows_affected;

  RETURN updated_count;
END;
$$;
ALTER FUNCTION "public"."mark_scheduled_notifications_sent"("notification_ids" "uuid"[]) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."mark_stripe_quantity_for_sync"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- When number_of_users changes locally, mark for sync
  IF NEW.number_of_active_users IS DISTINCT FROM OLD.number_of_active_users THEN
    NEW.stripe_quantity_pending_sync := TRUE;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."mark_stripe_quantity_for_sync"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."normalize_membership_role"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;
ALTER FUNCTION "public"."normalize_membership_role"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."normalize_membership_role"() IS 'Automatically normalizes membership role to proper capitalization (Admin, Member, Owner) regardless of input case';
CREATE OR REPLACE FUNCTION "public"."normalize_membership_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;
ALTER FUNCTION "public"."normalize_membership_status"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."normalize_membership_status"() IS 'Automatically normalizes membership status to proper capitalization (Active, Pending, Suspended, Inactive) regardless of input case';
CREATE OR REPLACE FUNCTION "public"."normalize_proposal_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Normalize status to proper capitalization
  IF NEW.status IS NOT NULL THEN
    CASE LOWER(REPLACE(NEW.status, ' ', ''))
      WHEN 'won' THEN NEW.status := 'Won';
      WHEN 'rejected' THEN NEW.status := 'Rejected';
      WHEN 'submitted' THEN NEW.status := 'Submitted';
      WHEN 'draft' THEN NEW.status := 'Draft';
      WHEN 'incomplete' THEN NEW.status := 'Incomplete';
      WHEN 'pending' THEN NEW.status := 'Pending';
      WHEN 'pendingapproval' THEN NEW.status := 'Pending Approval';
      ELSE
        -- Keep original for unknown statuses
        NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."normalize_proposal_status"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."org_has_no_members"("check_org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE organization_id = check_org_id
  );
END;
$$;
ALTER FUNCTION "public"."org_has_no_members"("check_org_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."org_has_no_members"("check_org_id" "uuid") IS 'Check if an organization has no members. Uses SECURITY DEFINER to bypass RLS and prevent recursion in memberships INSERT policy.';
CREATE OR REPLACE FUNCTION "public"."process_all_due_notifications"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Edge Function handles: in-app notifications + emails + marking as sent
  PERFORM invoke_notification_email_edge_function();
  RETURN 0;
END;
$$;
ALTER FUNCTION "public"."process_all_due_notifications"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."process_all_due_notifications"() IS 'Triggers Edge Function to process all due notifications. Edge Function handles in-app, emails, and marking sent.';
CREATE OR REPLACE FUNCTION "public"."process_due_notifications_internal"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  notification_record RECORD;
  inserted_count INTEGER := 0;
  scheduled_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  -- Get all due notifications
  FOR notification_record IN SELECT * FROM check_due_notifications() LOOP
    -- Insert in-app notification
    INSERT INTO notifications (
      user_id,
      organization_id,
      type,
      title,
      message,
      link,
      metadata,
      is_read,
      created_at
    )
    VALUES (
      notification_record.user_id,
      notification_record.organization_id,
      notification_record.notification_type,
      notification_record.title,
      notification_record.message,
      notification_record.link,
      notification_record.metadata,
      false,
      NOW()
    )
    ON CONFLICT DO NOTHING;

    -- Collect scheduled notification IDs to mark as sent
    scheduled_ids := array_append(scheduled_ids, notification_record.scheduled_notification_id);
    inserted_count := inserted_count + 1;
  END LOOP;

  -- Mark all processed notifications as sent
  IF array_length(scheduled_ids, 1) > 0 THEN
    PERFORM mark_scheduled_notifications_sent(scheduled_ids);
    RAISE NOTICE 'Marked % scheduled notification(s) as sent', array_length(scheduled_ids, 1);
  END IF;

  IF inserted_count > 0 THEN
    RAISE NOTICE 'Created % notification(s)', inserted_count;
  END IF;

  RETURN inserted_count;
END;
$$;
ALTER FUNCTION "public"."process_due_notifications_internal"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."process_due_notifications_internal"() IS 'Security: Internal cron function for processing notifications. EXECUTE revoked from all roles except service_role.';
CREATE OR REPLACE FUNCTION "public"."record_auth_attempt"("p_identifier" "text", "p_identifier_type" "text", "p_attempt_type" "text", "p_success" boolean DEFAULT false, "p_max_attempts" integer DEFAULT 5, "p_window_minutes" integer DEFAULT 15, "p_block_duration_minutes" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_record auth_rate_limits%ROWTYPE;
    v_window_start timestamptz;
    v_new_count integer;
    v_blocked_until timestamptz;
BEGIN
    -- If successful, clear the rate limit record
    IF p_success THEN
        DELETE FROM auth_rate_limits
        WHERE identifier = p_identifier
          AND identifier_type = p_identifier_type
          AND attempt_type = p_attempt_type;

        RETURN jsonb_build_object('success', true, 'cleared', true);
    END IF;

    v_window_start := now() - (p_window_minutes || ' minutes')::interval;

    -- Get or create rate limit record
    SELECT * INTO v_record
    FROM auth_rate_limits
    WHERE identifier = p_identifier
      AND identifier_type = p_identifier_type
      AND attempt_type = p_attempt_type
      AND first_attempt_at > v_window_start
    ORDER BY first_attempt_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_record.id IS NOT NULL THEN
        -- Update existing record
        v_new_count := v_record.attempt_count + 1;

        -- Check if should block
        IF v_new_count >= p_max_attempts THEN
            v_blocked_until := now() + (p_block_duration_minutes || ' minutes')::interval;
        END IF;

        UPDATE auth_rate_limits
        SET attempt_count = v_new_count,
            last_attempt_at = now(),
            blocked_until = v_blocked_until
        WHERE id = v_record.id;
    ELSE
        -- Create new record
        v_new_count := 1;

        INSERT INTO auth_rate_limits (identifier, identifier_type, attempt_type)
        VALUES (p_identifier, p_identifier_type, p_attempt_type);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'attempt_count', v_new_count,
        'blocked', v_blocked_until IS NOT NULL,
        'blocked_until', v_blocked_until
    );
END;
$$;
ALTER FUNCTION "public"."record_auth_attempt"("p_identifier" "text", "p_identifier_type" "text", "p_attempt_type" "text", "p_success" boolean, "p_max_attempts" integer, "p_window_minutes" integer, "p_block_duration_minutes" integer) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."record_auth_attempt"("p_identifier" "text", "p_identifier_type" "text", "p_attempt_type" "text", "p_success" boolean, "p_max_attempts" integer, "p_window_minutes" integer, "p_block_duration_minutes" integer) IS '@omit';
CREATE OR REPLACE FUNCTION "public"."record_failed_login"("p_email" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_window_start timestamptz;
    v_existing_id uuid;
    v_new_count integer;
BEGIN
    v_window_start := NOW() - interval '15 minutes';

    -- Try to update existing record
    UPDATE auth_rate_limits
    SET attempt_count = attempt_count + 1,
        last_attempt_at = NOW()
    WHERE identifier = LOWER(p_email)
      AND identifier_type = 'email'
      AND attempt_type = 'login'
      AND first_attempt_at > v_window_start
      AND (blocked_until IS NULL OR blocked_until < NOW())
    RETURNING id, attempt_count INTO v_existing_id, v_new_count;

    IF v_existing_id IS NULL THEN
        -- Insert new record
        INSERT INTO auth_rate_limits (identifier, identifier_type, attempt_type, attempt_count)
        VALUES (LOWER(p_email), 'email', 'login', 1)
        RETURNING attempt_count INTO v_new_count;
    END IF;

    -- Check if we need to block
    IF v_new_count >= 5 THEN
        UPDATE auth_rate_limits
        SET blocked_until = NOW() + interval '30 minutes'
        WHERE identifier = LOWER(p_email)
          AND identifier_type = 'email'
          AND attempt_type = 'login'
          AND first_attempt_at > v_window_start;

        RETURN jsonb_build_object(
            'recorded', true,
            'blocked', true,
            'attempt_count', v_new_count
        );
    END IF;

    RETURN jsonb_build_object(
        'recorded', true,
        'blocked', false,
        'attempt_count', v_new_count
    );
END;
$$;
ALTER FUNCTION "public"."record_failed_login"("p_email" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."record_failed_login"("p_email" "text") IS '@omit';
CREATE OR REPLACE FUNCTION "public"."record_failed_otp"("p_email" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_window_start timestamptz;
    v_existing_id uuid;
    v_new_count integer;
BEGIN
    v_window_start := NOW() - interval '10 minutes';

    -- Try to update existing record
    UPDATE auth_rate_limits
    SET attempt_count = attempt_count + 1,
        last_attempt_at = NOW()
    WHERE identifier = LOWER(p_email)
      AND identifier_type = 'email'
      AND attempt_type = 'otp'
      AND first_attempt_at > v_window_start
      AND (blocked_until IS NULL OR blocked_until < NOW())
    RETURNING id, attempt_count INTO v_existing_id, v_new_count;

    IF v_existing_id IS NULL THEN
        -- Insert new record
        INSERT INTO auth_rate_limits (identifier, identifier_type, attempt_type, attempt_count)
        VALUES (LOWER(p_email), 'email', 'otp', 1)
        RETURNING attempt_count INTO v_new_count;
    END IF;

    -- Check if we need to block (3 attempts for OTP)
    IF v_new_count >= 3 THEN
        UPDATE auth_rate_limits
        SET blocked_until = NOW() + interval '60 minutes'
        WHERE identifier = LOWER(p_email)
          AND identifier_type = 'email'
          AND attempt_type = 'otp'
          AND first_attempt_at > v_window_start;

        -- Log security event
        INSERT INTO security_audit_log (event_type, details)
        VALUES ('otp_blocked', jsonb_build_object(
            'email', p_email,
            'attempt_count', v_new_count
        ));

        RETURN jsonb_build_object(
            'recorded', true,
            'blocked', true,
            'attempt_count', v_new_count
        );
    END IF;

    RETURN jsonb_build_object(
        'recorded', true,
        'blocked', false,
        'attempt_count', v_new_count
    );
END;
$$;
ALTER FUNCTION "public"."record_failed_otp"("p_email" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."record_failed_otp"("p_email" "text") IS '@omit';
CREATE OR REPLACE FUNCTION "public"."reject_member"("member_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    member_org_id uuid;
    current_user_role text;
BEGIN
    -- Get the member's organization from memberships table
    SELECT organization_id INTO member_org_id
    FROM public.memberships
    WHERE user_id = member_id;

    IF member_org_id IS NULL THEN
        RAISE EXCEPTION 'Membership not found';
    END IF;

    -- Get current user's role in the organization
    SELECT role INTO current_user_role
    FROM public.memberships
    WHERE user_id = auth.uid()
    AND organization_id = member_org_id
    AND status = 'Active';

    -- Check if current user is admin/owner of that organization
    IF current_user_role NOT IN ('Admin', 'Owner') THEN
        RAISE EXCEPTION 'Only Admins and Owners can reject members';
    END IF;

    -- Delete the pending member from memberships table
    DELETE FROM public.memberships
    WHERE user_id = member_id
    AND organization_id = member_org_id
    AND status = 'Pending';

    RETURN true;
END;
$$;
ALTER FUNCTION "public"."reject_member"("member_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."reject_member"("member_id" "uuid") IS 'Rejects a pending member by deleting their record from the memberships table';
CREATE OR REPLACE FUNCTION "public"."restore_access"("org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.subscriptions
  SET access_blocked = false,
      access_blocked_reason = NULL,
      updated_at = now()
  WHERE organization_id = org_id;
END;
$$;
ALTER FUNCTION "public"."restore_access"("org_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."sanitize_error_message"("p_error_message" "text", "p_error_code" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_sanitized text;
BEGIN
    -- Map known error patterns to safe messages
    CASE
        -- Auth errors
        WHEN p_error_message ILIKE '%invalid login credentials%' THEN
            v_sanitized := 'Invalid email or password';
        WHEN p_error_message ILIKE '%email not confirmed%' THEN
            v_sanitized := 'Please verify your email before signing in';
        WHEN p_error_message ILIKE '%user already registered%' THEN
            v_sanitized := 'An account with this email already exists';
        WHEN p_error_message ILIKE '%password%too short%' OR p_error_message ILIKE '%password%weak%' THEN
            v_sanitized := 'Password does not meet security requirements';

        -- Database constraint errors
        WHEN p_error_message ILIKE '%duplicate key%' OR p_error_message ILIKE '%unique constraint%' THEN
            v_sanitized := 'This record already exists';
        WHEN p_error_message ILIKE '%foreign key%' THEN
            v_sanitized := 'Related record not found';
        WHEN p_error_message ILIKE '%check constraint%' THEN
            v_sanitized := 'Invalid data provided';
        WHEN p_error_message ILIKE '%not null%' THEN
            v_sanitized := 'Required field is missing';

        -- RLS errors
        WHEN p_error_message ILIKE '%row-level security%' OR p_error_message ILIKE '%policy%' THEN
            v_sanitized := 'You do not have permission to perform this action';

        -- Connection/timeout errors
        WHEN p_error_message ILIKE '%connection%' OR p_error_message ILIKE '%timeout%' THEN
            v_sanitized := 'Service temporarily unavailable. Please try again.';

        -- Rate limiting
        WHEN p_error_message ILIKE '%rate limit%' OR p_error_message ILIKE '%too many%' THEN
            v_sanitized := 'Too many requests. Please wait before trying again.';

        -- Default: generic message that doesn't leak internals
        ELSE
            v_sanitized := 'An error occurred. Please try again or contact support.';
    END CASE;

    RETURN v_sanitized;
END;
$$;
ALTER FUNCTION "public"."sanitize_error_message"("p_error_message" "text", "p_error_code" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."sanitize_error_message"("p_error_message" "text", "p_error_code" "text") IS '@omit';
CREATE OR REPLACE FUNCTION "public"."schedule_notification"("p_entity_type" "text", "p_entity_id" "uuid", "p_user_id" "uuid", "p_organization_id" "uuid", "p_scheduled_for" timestamp with time zone, "p_title" "text", "p_message" "text" DEFAULT NULL::"text", "p_link" "text" DEFAULT NULL::"text", "p_recurrence" "text" DEFAULT 'once'::"text", "p_recurrence_end_date" "date" DEFAULT NULL::"date", "p_notification_type" "text" DEFAULT 'reminder'::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Cancel any existing pending notifications for this entity
  UPDATE scheduled_notifications
  SET status = 'cancelled', updated_at = NOW()
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND user_id = p_user_id
    AND status = 'pending';

  -- Insert new scheduled notification
  INSERT INTO scheduled_notifications (
    entity_type, entity_id, user_id, organization_id,
    scheduled_for, recurrence, recurrence_end_date,
    notification_type, title, message, link, metadata,
    created_by
  ) VALUES (
    p_entity_type, p_entity_id, p_user_id, p_organization_id,
    p_scheduled_for, p_recurrence, p_recurrence_end_date,
    p_notification_type, p_title, p_message, p_link, p_metadata,
    auth.uid()
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
ALTER FUNCTION "public"."schedule_notification"("p_entity_type" "text", "p_entity_id" "uuid", "p_user_id" "uuid", "p_organization_id" "uuid", "p_scheduled_for" timestamp with time zone, "p_title" "text", "p_message" "text", "p_link" "text", "p_recurrence" "text", "p_recurrence_end_date" "date", "p_notification_type" "text", "p_metadata" "jsonb") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."secure_rpc"("p_action" "text", "p_params" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_result jsonb;
    v_user_id uuid;
BEGIN
    -- Get current user
    v_user_id := auth.uid();

    -- Whitelist of allowed actions
    CASE p_action
        WHEN 'check_rate_limit' THEN
            SELECT check_auth_rate_limit(
                p_params->>'identifier',
                COALESCE(p_params->>'identifier_type', 'email'),
                p_params->>'attempt_type',
                COALESCE((p_params->>'max_attempts')::integer, 5),
                COALESCE((p_params->>'window_minutes')::integer, 15),
                COALESCE((p_params->>'block_duration')::integer, 30)
            ) INTO v_result;

        WHEN 'record_attempt' THEN
            SELECT record_auth_attempt(
                p_params->>'identifier',
                COALESCE(p_params->>'identifier_type', 'email'),
                p_params->>'attempt_type',
                COALESCE((p_params->>'success')::boolean, false),
                COALESCE((p_params->>'max_attempts')::integer, 5),
                COALESCE((p_params->>'window_minutes')::integer, 15),
                COALESCE((p_params->>'block_duration')::integer, 30)
            ) INTO v_result;

        ELSE
            -- Log unauthorized action attempt
            PERFORM log_security_event(
                'unauthorized_rpc_attempt',
                v_user_id,
                NULL,
                jsonb_build_object('action', p_action)
            );
            RAISE EXCEPTION 'Invalid action';
    END CASE;

    RETURN v_result;
END;
$$;
ALTER FUNCTION "public"."secure_rpc"("p_action" "text", "p_params" "jsonb") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."secure_rpc"("p_action" "text", "p_params" "jsonb") IS '@omit';
CREATE OR REPLACE FUNCTION "public"."set_contact_created_by_name"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Set created_by_name from the creator's profile
    IF NEW.created_by IS NOT NULL AND NEW.created_by_name IS NULL THEN
        SELECT COALESCE(full_name, email, 'Unknown User')
        INTO NEW.created_by_name
        FROM public.profiles
        WHERE id = NEW.created_by;
    END IF;

    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."set_contact_created_by_name"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."set_owner_department"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- If role is Owner and department is not set, auto-assign "Executive"
  IF NEW.role = 'Owner' AND NEW.department IS NULL THEN
    NEW.department = 'Executive';
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."set_owner_department"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."sync_integration_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- When a QB Online connection is created/updated
  IF TG_TABLE_NAME = 'quickbooks_online_connections' THEN
    INSERT INTO integrations (
      organization_id,
      integration_type,
      integration_name,
      is_connected,
      connection_status
    )
    VALUES (
      NEW.organization_id,
      'quickbooks_online',
      'QuickBooks Online',
      NEW.is_active,
      CASE WHEN NEW.is_active THEN 'Connected' ELSE 'Disconnected' END
    )
    ON CONFLICT (organization_id, integration_type)
    DO UPDATE SET
      is_connected = NEW.is_active,
      connection_status = CASE WHEN NEW.is_active THEN 'Connected' ELSE 'Disconnected' END,
      last_connection_check_at = now(),
      updated_at = now();
  END IF;

  -- When a QB Desktop connection is created/updated
  IF TG_TABLE_NAME = 'quickbooks_desktop_connections' THEN
    INSERT INTO integrations (
      organization_id,
      integration_type,
      integration_name,
      is_connected,
      connection_status
    )
    VALUES (
      NEW.organization_id,
      'quickbooks_desktop',
      'QuickBooks Desktop',
      NEW.is_active,
      CASE WHEN NEW.is_active THEN 'Connected' ELSE 'Disconnected' END
    )
    ON CONFLICT (organization_id, integration_type)
    DO UPDATE SET
      is_connected = NEW.is_active,
      connection_status = CASE WHEN NEW.is_active THEN 'Connected' ELSE 'Disconnected' END,
      last_connection_check_at = now(),
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."sync_integration_status"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."sync_project_on_proposal_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  deleted_status TEXT;
  deleted_order INTEGER;
BEGIN
  -- If status changed FROM 'Won' to anything else, delete project & reset is_on_board
  IF OLD.status = 'Won' AND NEW.status != 'Won' THEN
    SELECT workflow_status, board_order INTO deleted_status, deleted_order
    FROM projects
    WHERE proposal_id = NEW.id AND organization_id = NEW.organization_id;

    DELETE FROM projects
    WHERE proposal_id = NEW.id AND organization_id = NEW.organization_id;

    -- Reorder remaining projects
    IF deleted_status IS NOT NULL THEN
      UPDATE projects
      SET board_order = board_order - 1
      WHERE workflow_status = deleted_status
        AND organization_id = NEW.organization_id
        AND board_order > deleted_order;
    END IF;

    NEW.is_on_board := false;
  END IF;

  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."sync_project_on_proposal_status_change"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."sync_projects_from_proposal_is_on_board"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  next_order INTEGER;
BEGIN
  -- When is_on_board changes from false to true, create project
  IF (NEW.is_on_board = true AND (OLD.is_on_board = false OR OLD.is_on_board IS NULL)) THEN
    
    -- Validate: must be main version and Won status
    IF NOT check_proposal_is_main_version_and_won(NEW.id) THEN
      RAISE EXCEPTION 'Cannot add to board: proposal must be main version with Won status';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM projects WHERE proposal_id = NEW.id) THEN
      SELECT COALESCE(MAX(board_order), 0) + 1 INTO next_order
      FROM projects
      WHERE organization_id = NEW.organization_id AND workflow_status = 'To Do';

      -- Insert with proposal_id = NULL, proposal_id = NEW.id
      INSERT INTO projects (proposal_id, proposal_id, organization_id, workflow_status, board_order, priority)
      VALUES (NULL, NEW.id, NEW.organization_id, 'To Do', next_order, NULL);
    END IF;
    
  -- When is_on_board changes from true to false, delete project
  ELSIF (NEW.is_on_board = false AND OLD.is_on_board = true) THEN
    DELETE FROM projects WHERE proposal_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."sync_projects_from_proposal_is_on_board"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."sync_proposal_on_board_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- When project is created, set is_on_board to true
    UPDATE public.proposals SET is_on_board = true WHERE id = NEW.proposal_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    -- When project is deleted, set is_on_board to false
    UPDATE public.proposals SET is_on_board = false WHERE id = OLD.proposal_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
ALTER FUNCTION "public"."sync_proposal_on_board_status"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."sync_subscription_user_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;
ALTER FUNCTION "public"."sync_subscription_user_count"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."sync_subscription_user_count"() IS 'Automatically updates subscriptions.number_of_active_users to match ACTIVE member count only.
Triggers on INSERT, UPDATE (status change), and DELETE of memberships.
Only members with status=''Active'' are counted. Pending, Inactive, and Suspended members are excluded.';
CREATE OR REPLACE FUNCTION "public"."track_proposal_initial_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Log initial status on creation if status is set
  IF NEW.status IS NOT NULL THEN
    INSERT INTO proposal_status_transitions (
      proposal_id,
      organization_id,
      from_status,
      to_status,
      transitioned_by,
      transitioned_at,
      notes
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      NULL,
      NEW.status,
      auth.uid(),
      NOW(),
      'Proposal created with initial status: ' || NEW.status
    );
  END IF;

  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."track_proposal_initial_status"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."transfer_ownership"("p_new_owner_id" "uuid", "p_organization_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_owner_id UUID;
  v_new_owner_exists BOOLEAN;
  v_result JSON;
BEGIN
  -- Get the current user (must be the owner)
  SELECT user_id INTO v_current_owner_id
  FROM public.memberships
  WHERE user_id = auth.uid()
  AND organization_id = p_organization_id
  AND role = 'Owner'
  AND status = 'Active';

  -- Check if current user is the owner
  IF v_current_owner_id IS NULL THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership';
  END IF;

  -- Check if new owner exists and is an active member
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = p_new_owner_id
    AND organization_id = p_organization_id
    AND status = 'Active'
    AND role IN ('Admin', 'Member')
  ) INTO v_new_owner_exists;

  IF NOT v_new_owner_exists THEN
    RAISE EXCEPTION 'New owner must be an active Admin or Member of the organization';
  END IF;

  -- Prevent transferring to yourself
  IF v_current_owner_id = p_new_owner_id THEN
    RAISE EXCEPTION 'Cannot transfer ownership to yourself';
  END IF;

  -- Begin the transfer (atomic operation)
  -- Step 1: Demote current owner to Admin
  UPDATE public.memberships
  SET role = 'Admin',
      updated_at = NOW()
  WHERE user_id = v_current_owner_id
  AND organization_id = p_organization_id;

  -- Step 2: Promote new member to Owner
  UPDATE public.memberships
  SET role = 'Owner',
      updated_at = NOW()
  WHERE user_id = p_new_owner_id
  AND organization_id = p_organization_id;

  -- Return success result
  v_result := json_build_object(
    'success', true,
    'previous_owner_id', v_current_owner_id,
    'new_owner_id', p_new_owner_id,
    'organization_id', p_organization_id,
    'transferred_at', NOW()
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Ownership transfer failed: %', SQLERRM;
END;
$$;
ALTER FUNCTION "public"."transfer_ownership"("p_new_owner_id" "uuid", "p_organization_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."transfer_ownership"("p_new_owner_id" "uuid", "p_organization_id" "uuid") IS 'Transfers organization ownership from current owner to another member. Current owner becomes Admin. Only one owner allowed per organization.';
CREATE OR REPLACE FUNCTION "public"."trigger_create_default_task_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    PERFORM create_default_task_columns(NEW.id);
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."trigger_create_default_task_columns"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_active_user_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;
ALTER FUNCTION "public"."update_active_user_count"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_contact_creator_name_on_profile_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    user_status TEXT;
    display_name TEXT;
BEGIN
    -- Check if user's membership is active
    SELECT status INTO user_status
    FROM public.memberships
    WHERE user_id = NEW.id
      AND status = 'Active'
    LIMIT 1;

    -- Only update if user has active membership
    IF user_status = 'Active' THEN
        display_name := COALESCE(NEW.full_name, NEW.email, 'Unknown User');

        UPDATE public.contacts
        SET created_by_name = display_name
        WHERE created_by = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_contact_creator_name_on_profile_change"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_member_role"("member_id" "uuid", "new_role" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    member_org_id uuid;
    current_user_role text;
    member_data json;
BEGIN
    -- Validate role input (convert to proper case)
    IF LOWER(new_role) NOT IN ('admin', 'member', 'owner') THEN
        RAISE EXCEPTION 'Invalid role. Must be Admin, Member, or Owner';
    END IF;

    -- Normalize the role to match database format (capitalize first letter)
    new_role := INITCAP(LOWER(new_role));

    -- Get the member's organization from memberships table
    SELECT organization_id INTO member_org_id
    FROM public.memberships
    WHERE user_id = member_id
    AND status = 'Active';

    IF member_org_id IS NULL THEN
        RAISE EXCEPTION 'Member not found or not active in any organization';
    END IF;

    -- Get current user's role in the same organization
    SELECT role INTO current_user_role
    FROM public.memberships
    WHERE user_id = auth.uid()
    AND organization_id = member_org_id
    AND status = 'Active';

    -- Check if current user has admin/owner role
    IF current_user_role NOT IN ('Admin', 'Owner') THEN
        RAISE EXCEPTION 'Access denied: Only Admins and Owners can update member roles';
    END IF;

    -- Prevent changing owner role
    IF EXISTS (
        SELECT 1 FROM public.memberships
        WHERE user_id = member_id
        AND organization_id = member_org_id
        AND role = 'Owner'
    ) THEN
        RAISE EXCEPTION 'Cannot change Owner role. Use transfer_ownership function instead';
    END IF;

    -- Prevent promoting to Owner (must use transfer_ownership)
    IF new_role = 'Owner' THEN
        RAISE EXCEPTION 'Cannot promote to Owner. Use transfer_ownership function instead';
    END IF;

    -- Update the member's role in memberships table
    UPDATE public.memberships
    SET
        role = new_role,
        updated_at = NOW()
    WHERE user_id = member_id
    AND organization_id = member_org_id;

    -- Return updated member data
    SELECT json_build_object(
        'user_id', m.user_id,
        'organization_id', m.organization_id,
        'role', m.role,
        'status', m.status,
        'updated_at', m.updated_at
    ) INTO member_data
    FROM public.memberships m
    WHERE m.user_id = member_id
    AND m.organization_id = member_org_id;

    RETURN member_data;
END;
$$;
ALTER FUNCTION "public"."update_member_role"("member_id" "uuid", "new_role" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."update_member_role"("member_id" "uuid", "new_role" "text") IS 'Updates a member''s role in the memberships table. Only Admins and Owners can change roles. Cannot change or promote to Owner role.';
CREATE OR REPLACE FUNCTION "public"."update_notification_preferences_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_notification_preferences_updated_at"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_org_creator_profile"("user_id" "uuid", "org_id" "uuid" DEFAULT NULL::"uuid", "role_value" "text" DEFAULT 'Admin'::"text", "status_value" "text" DEFAULT 'Active'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;
ALTER FUNCTION "public"."update_org_creator_profile"("user_id" "uuid", "org_id" "uuid", "role_value" "text", "status_value" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_proposal_ai_suggestions_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update the count on the proposal
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.proposals
    SET ai_pending_suggestions_count = (
      SELECT COUNT(*) FROM public.ai_suggestions
      WHERE proposal_id = NEW.proposal_id AND status = 'pending'
    )
    WHERE id = NEW.proposal_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.proposals
    SET ai_pending_suggestions_count = (
      SELECT COUNT(*) FROM public.ai_suggestions
      WHERE proposal_id = OLD.proposal_id AND status = 'pending'
    )
    WHERE id = OLD.proposal_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
ALTER FUNCTION "public"."update_proposal_ai_suggestions_count"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_proposal_documents_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.proposals
    SET documents_count = documents_count + 1
    WHERE id = NEW.proposal_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.proposals
    SET documents_count = GREATEST(documents_count - 1, 0)
    WHERE id = OLD.proposal_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
ALTER FUNCTION "public"."update_proposal_documents_count"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_proposal_creator_name_on_membership_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

    -- Update all proposals created by this user in this organization
    UPDATE public.proposals
    SET created_by_name = display_name
    WHERE created_by = COALESCE(NEW.user_id, OLD.user_id)
      AND organization_id = COALESCE(NEW.organization_id, OLD.organization_id);

    RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION "public"."update_proposal_creator_name_on_membership_change"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_proposal_creator_name_on_profile_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

        UPDATE public.proposals
        SET created_by_name = display_name
        WHERE created_by = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_proposal_creator_name_on_profile_change"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_signing_token_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_signing_token_updated_at"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_subscription_is_active"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Set is_active based on stripe_subscription_status
  -- Case-insensitive comparison (Stripe returns lowercase, webhook capitalizes)
  -- This handles both 'active'/'Active' and 'trialing'/'Trialing'
  NEW.is_active := LOWER(NEW.stripe_subscription_status) IN ('active', 'trialing');

  -- Grace period: keep is_active=true if grace_period_end is still in the future
  IF NOT NEW.is_active AND NEW.grace_period_end IS NOT NULL AND NEW.grace_period_end > now() THEN
    NEW.is_active := true;
  END IF;

  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_subscription_is_active"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."update_subscription_is_active"() IS 'Automatically sets is_active based on stripe_subscription_status (FIXED: case-insensitive lowercase comparison)';
CREATE OR REPLACE FUNCTION "public"."update_user_profile"("user_id" "uuid", "full_name_value" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    result json;
BEGIN
    
    -- SECURITY: Ensure user can only update their own profile
    IF user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied: Can only update own profile';
    END IF;
    
    -- SECURITY: Validate full name input
    IF full_name_value IS NULL OR length(trim(full_name_value)) < 1 THEN
        RAISE EXCEPTION 'Full name cannot be empty';
    END IF;
    
    IF length(full_name_value) > 100 THEN
        RAISE EXCEPTION 'Full name cannot exceed 100 characters';
    END IF;
    
    -- Update the profile with full name
    UPDATE public.profiles 
    SET 
        full_name = full_name_value,
        updated_at = now()
    WHERE id = user_id;
    
    -- If no profile was updated (doesn't exist), create one
    IF NOT FOUND THEN
        INSERT INTO public.profiles (id, email, full_name)
        SELECT user_id, au.email, full_name_value
        FROM auth.users au
        WHERE au.id = user_id;
    END IF;
    
    -- Return the updated profile
    SELECT to_json(p.*) INTO result
    FROM public.profiles p
    WHERE p.id = user_id;
    
    RETURN result;
END;
$$;
ALTER FUNCTION "public"."update_user_profile"("user_id" "uuid", "full_name_value" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."user_has_admin_role_in_org"("org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.organization_id = org_id
    AND m.role IN ('Owner', 'Admin')
    AND m.status = 'Active'
  );
END;
$$;
ALTER FUNCTION "public"."user_has_admin_role_in_org"("org_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."user_has_role_in_org"("org_id" "uuid", "required_role" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;
ALTER FUNCTION "public"."user_has_role_in_org"("org_id" "uuid", "required_role" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."validate_admin_invite"("token_value" "text") RETURNS TABLE("id" "uuid", "token" "text", "email" "text", "organization_name" "text", "expires_at" timestamp with time zone, "is_used" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Input validation: reject NULL or empty tokens
  IF token_value IS NULL OR TRIM(token_value) = '' THEN
    RETURN;  -- Return empty result set for invalid input
  END IF;

  -- Use fully qualified table name (public schema)
  RETURN QUERY
  SELECT
    ai.id,
    ai.token,
    ai.email,
    ai.organization_name,
    ai.expires_at,
    ai.is_used
  FROM public.admin_invites ai
  WHERE ai.token = TRIM(token_value)
    AND ai.is_used = FALSE
    AND ai.expires_at > NOW();
END;
$$;
ALTER FUNCTION "public"."validate_admin_invite"("token_value" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."validate_admin_invite"("token_value" "text") IS 'Securely validates admin invite token for new organization signup.
   Uses SECURITY DEFINER to bypass RLS for anonymous token validation.
   Only returns data for valid (non-used, non-expired) tokens.';
CREATE OR REPLACE FUNCTION "public"."validate_invite_token"("token_value" "text") RETURNS TABLE("id" "uuid", "token" "text", "email" "text", "organization_id" "uuid", "role" "text", "department" "text", "created_by" "uuid", "expires_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "is_used" boolean, "revoked_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Return token data if it's valid (not used, not revoked, not expired)
  RETURN QUERY
  SELECT
    t.id,
    t.token,
    t.email,
    t.organization_id,
    t.role,
    t.department,
    t.created_by,
    t.expires_at,
    t.created_at,
    t.updated_at,
    t.is_used,
    t.revoked_at
  FROM invite_tokens t
  WHERE t.token = token_value
    AND t.is_used = false
    AND t.revoked_at IS NULL
    AND t.expires_at > NOW()
  LIMIT 1;
END;
$$;
ALTER FUNCTION "public"."validate_invite_token"("token_value" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."validate_invite_token"("token_value" "text") IS 'Securely validates invite tokens for anonymous users during signup. Bypasses RLS to allow token validation before authentication.';
CREATE OR REPLACE FUNCTION "public"."validate_invite_token_with_error"("token_value" "text") RETURNS TABLE("id" "uuid", "token" "text", "email" "text", "organization_id" "uuid", "role" "text", "created_by" "uuid", "expires_at" timestamp with time zone, "created_at" timestamp with time zone, "is_used" boolean, "department" "text", "revoked_at" timestamp with time zone, "error_type" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  token_record RECORD;
BEGIN
  -- Input validation: reject NULL or empty tokens
  IF token_value IS NULL OR TRIM(token_value) = '' THEN
    RETURN QUERY SELECT
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::UUID,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::BOOLEAN,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      'NotFound'::TEXT;
    RETURN;
  END IF;

  -- Use fully qualified table name (public schema)
  SELECT
    it.id,
    it.token,
    it.email,
    it.organization_id,
    it.role,
    it.created_by,
    it.expires_at,
    it.created_at,
    it.is_used,
    it.department,
    it.revoked_at
  INTO token_record
  FROM public.invite_tokens it
  WHERE it.token = TRIM(token_value);

  -- Token not found - return minimal info (no sensitive data)
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::UUID,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::BOOLEAN,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      'NotFound'::TEXT;
    RETURN;
  END IF;

  -- Token found but used - return error type with minimal identifying info
  -- (exclude sensitive fields like created_by for invalid tokens)
  IF token_record.is_used THEN
    RETURN QUERY SELECT
      token_record.id,
      NULL::TEXT,  -- Don't expose token value
      token_record.email,  -- Needed for UX ("this invite for email@... was already used")
      NULL::UUID,  -- Don't expose org for used tokens
      NULL::TEXT,  -- Don't expose role
      NULL::UUID,  -- Don't expose created_by
      token_record.expires_at,
      token_record.created_at,
      token_record.is_used,
      NULL::TEXT,  -- Don't expose department
      NULL::TIMESTAMPTZ,
      'Used'::TEXT;
    RETURN;
  END IF;

  -- Token found but revoked - return error type with minimal info
  IF token_record.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT
      token_record.id,
      NULL::TEXT,
      token_record.email,
      NULL::UUID,
      NULL::TEXT,
      NULL::UUID,
      token_record.expires_at,
      token_record.created_at,
      token_record.is_used,
      NULL::TEXT,
      token_record.revoked_at,
      'Revoked'::TEXT;
    RETURN;
  END IF;

  -- Token found but expired - return error type with minimal info
  IF token_record.expires_at < NOW() THEN
    RETURN QUERY SELECT
      token_record.id,
      NULL::TEXT,
      token_record.email,
      NULL::UUID,
      NULL::TEXT,
      NULL::UUID,
      token_record.expires_at,
      token_record.created_at,
      token_record.is_used,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      'Expired'::TEXT;
    RETURN;
  END IF;

  -- Token is valid - return full data needed for signup flow
  RETURN QUERY SELECT
    token_record.id,
    token_record.token,
    token_record.email,
    token_record.organization_id,
    token_record.role::TEXT,
    token_record.created_by,
    token_record.expires_at,
    token_record.created_at,
    token_record.is_used,
    token_record.department,
    token_record.revoked_at,
    NULL::TEXT; -- No error = valid token
END;
$$;
ALTER FUNCTION "public"."validate_invite_token_with_error"("token_value" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."validate_invite_token_with_error"("token_value" "text") IS 'Securely validates invite token and returns error type if invalid (Used, Revoked, Expired, NotFound).
   Uses SECURITY DEFINER to bypass RLS for anonymous token validation.
   Returns minimal data for invalid tokens to prevent information leakage.';
CREATE OR REPLACE FUNCTION "public"."validate_signup_invite"("token_value" "text") RETURNS TABLE("id" "uuid", "token" "text", "email" "text", "expires_at" timestamp with time zone, "is_used" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Input validation: reject NULL or empty tokens
  IF token_value IS NULL OR TRIM(token_value) = '' THEN
    RETURN;  -- Return empty result set for invalid input
  END IF;

  -- Use fully qualified table name (public schema)
  RETURN QUERY
  SELECT
    si.id,
    si.token,
    si.email,
    si.expires_at,
    si.is_used,
    si.created_at,
    si.updated_at
  FROM public.signup_invites si
  WHERE si.token = TRIM(token_value)
    AND si.is_used = FALSE
    AND si.revoked_at IS NULL
    AND si.expires_at > NOW();
END;
$$;
ALTER FUNCTION "public"."validate_signup_invite"("token_value" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."validate_signup_invite"("token_value" "text") IS 'Securely validates signup invite token for new organization signup.
   Uses SECURITY DEFINER to bypass RLS for anonymous token validation.
   Only returns data for valid (non-used, non-expired, non-revoked) tokens.';
CREATE OR REPLACE FUNCTION "public"."validate_storage_upload"("p_bucket_id" "text", "p_file_name" "text", "p_content_type" "text", "p_file_size" bigint) RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_allowed_types text[];
    v_max_size bigint;
    v_extension text;
BEGIN
    -- Extract extension
    v_extension := lower(split_part(p_file_name, '.', -1));

    -- Define allowed types per bucket
    CASE p_bucket_id
        WHEN 'organization-logos' THEN
            v_allowed_types := ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];
            v_max_size := 5 * 1024 * 1024; -- 5MB
        WHEN 'proposal-documents' THEN
            v_allowed_types := ARRAY[
                'application/pdf',
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
                'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/csv', 'text/plain'
            ];
            v_max_size := 50 * 1024 * 1024; -- 50MB
        WHEN 'project-attachments' THEN
            v_allowed_types := ARRAY[
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
                'application/pdf',
                'video/mp4', 'video/quicktime', 'video/webm'
            ];
            v_max_size := 100 * 1024 * 1024; -- 100MB
        ELSE
            -- Default restrictive policy
            v_allowed_types := ARRAY['image/jpeg', 'image/png', 'application/pdf'];
            v_max_size := 10 * 1024 * 1024; -- 10MB
    END CASE;

    -- Validate content type
    IF NOT (p_content_type = ANY(v_allowed_types)) THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'File type not allowed for this bucket'
        );
    END IF;

    -- Validate file size
    IF p_file_size > v_max_size THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', format('File too large. Maximum size is %s MB', v_max_size / 1024 / 1024)
        );
    END IF;

    -- Validate extension matches content type (prevent spoofing)
    CASE p_content_type
        WHEN 'image/jpeg' THEN
            IF v_extension NOT IN ('jpg', 'jpeg') THEN
                RETURN jsonb_build_object('valid', false, 'error', 'File extension does not match content type');
            END IF;
        WHEN 'image/png' THEN
            IF v_extension != 'png' THEN
                RETURN jsonb_build_object('valid', false, 'error', 'File extension does not match content type');
            END IF;
        WHEN 'application/pdf' THEN
            IF v_extension != 'pdf' THEN
                RETURN jsonb_build_object('valid', false, 'error', 'File extension does not match content type');
            END IF;
        ELSE
            NULL; -- Allow other types without strict extension check
    END CASE;

    RETURN jsonb_build_object('valid', true);
END;
$$;
ALTER FUNCTION "public"."validate_storage_upload"("p_bucket_id" "text", "p_file_name" "text", "p_content_type" "text", "p_file_size" bigint) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."validate_storage_upload"("p_bucket_id" "text", "p_file_name" "text", "p_content_type" "text", "p_file_size" bigint) IS '@omit';
COMMENT ON TABLE "public"."ai_agent_runs" IS 'Audit log tracking all AI agent executions for debugging and cost analysis';
COMMENT ON COLUMN "public"."ai_agent_runs"."estimated_cost_usd" IS 'Estimated cost based on token usage';
COMMENT ON TABLE "public"."ai_capability_gaps" IS 'Tracks user requests that the AI agent could not fulfill, helping identify needed features';
COMMENT ON TABLE "public"."ai_user_feedback" IS 'User feedback on AI suggestions to improve future recommendations';
COMMENT ON COLUMN "public"."ai_user_feedback"."message_id" IS 'Reference to ai_messages for chat feedback (alternative to suggestion_id)';
COMMENT ON COLUMN "public"."ai_user_feedback"."organization_id" IS 'Organization for easier querying and analytics';
COMMENT ON COLUMN "public"."ai_user_feedback"."context_type" IS 'Type of content being rated: suggestion, chat_message, or tool_action';
COMMENT ON COLUMN "public"."ai_user_feedback"."user_correction" IS 'User-provided correction text for training data collection';
COMMENT ON COLUMN "public"."ai_user_feedback"."message_content" IS 'Message text for feedback on local/global chat messages that are not stored in ai_messages table';
CREATE OR REPLACE VIEW "public"."ai_feedback_analytics" WITH ("security_invoker"='on') AS
 SELECT "organization_id",
    "context_type",
    "feedback_type",
    "rating",
    "count"(*) AS "count",
    "avg"("rating") AS "avg_rating",
    "count"(
        CASE
            WHEN ("feedback_type" = 'helpful'::"text") THEN 1
            ELSE NULL::integer
        END) AS "helpful_count",
    "count"(
        CASE
            WHEN ("feedback_type" = 'not_helpful'::"text") THEN 1
            ELSE NULL::integer
        END) AS "not_helpful_count",
    "count"(
        CASE
            WHEN ("feedback_type" = 'incorrect'::"text") THEN 1
            ELSE NULL::integer
        END) AS "incorrect_count",
    "count"(
        CASE
            WHEN ("user_correction" IS NOT NULL) THEN 1
            ELSE NULL::integer
        END) AS "corrections_count",
    "date_trunc"('day'::"text", "created_at") AS "feedback_date"
   FROM "public"."ai_user_feedback" "f"
  GROUP BY "organization_id", "context_type", "feedback_type", "rating", ("date_trunc"('day'::"text", "created_at"));
COMMENT ON TABLE "public"."ai_suggestions" IS 'Stores AI-generated suggestions for proposals including follow-up emails, reminders, and recommendations';
COMMENT ON COLUMN "public"."ai_suggestions"."suggestion_type" IS 'Type of suggestion: follow_up_email, status_reminder, action_recommendation, win_loss_insight, pricing_suggestion';
COMMENT ON COLUMN "public"."ai_suggestions"."confidence_score" IS 'AI confidence in the suggestion (0.00-1.00)';
COMMENT ON TABLE "public"."auth_rate_limits" IS 'Tracks authentication attempts for rate limiting';
COMMENT ON TABLE "public"."config_option_group_metadata" IS 'Supplementary metadata for option groups, preserving field_type and input_type from pc_option_groups for use in config_schema building.';
COMMENT ON TABLE "public"."config_value_sets" IS 'Shared value libraries for product configuration. Referenced by config_schema via values_ref property. Examples: vinyl_colors, ral_paints, standard_support_systems.';
COMMENT ON COLUMN "public"."config_value_sets"."slug" IS 'URL-safe unique identifier used in config_schema values_ref. Example: "vinyl_colors", "ral_paints"';
COMMENT ON COLUMN "public"."config_value_sets"."name" IS 'Human-readable display name. Example: "Vinyl Colors", "RAL Paint Colors"';
COMMENT ON COLUMN "public"."config_value_sets"."category" IS 'Category for organizing in admin UI. Example: "materials", "colors", "hardware", "structural"';
COMMENT ON COLUMN "public"."config_value_sets"."manufacturer_id" IS 'Optional manufacturer scoping. NULL means globally available to all manufacturers.';
COMMENT ON COLUMN "public"."config_value_sets"."values" IS 'Array of value options. Format: [{code, label, hex?, image_url?, description?, sort_order?, is_active?, metadata?}]';
COMMENT ON TABLE "public"."contacts" IS 'Customer/prospect contacts for organizations (non-user accounts)';
COMMENT ON COLUMN "public"."contacts"."organization_id" IS 'Organization this contact belongs to';
COMMENT ON COLUMN "public"."contacts"."full_name" IS 'Contact full name';
COMMENT ON COLUMN "public"."contacts"."emails" IS 'Contact email address';
COMMENT ON COLUMN "public"."contacts"."phones" IS 'Contact phone number';
COMMENT ON COLUMN "public"."contacts"."company_name" IS 'Company name of the contact (optional)';
COMMENT ON COLUMN "public"."contacts"."contact_type" IS 'Type of contact: Lead, Customer, Vendor, Partner, Contractor, Architect, etc.';
COMMENT ON COLUMN "public"."contacts"."addresses" IS 'Physical address of the contact or their company';
COMMENT ON COLUMN "public"."contacts"."notes" IS 'Additional notes about this contact';
COMMENT ON COLUMN "public"."contacts"."created_by" IS 'User who created this contact';
COMMENT ON COLUMN "public"."contacts"."user_id" IS 'Links to user account if contact becomes a team member';
COMMENT ON COLUMN "public"."contacts"."created_by_name" IS 'Display name of contact creator. Shows "Deleted User" if user deleted, or actual name otherwise';
COMMENT ON TABLE "public"."forms" IS 'Form templates. Structure data stored in metadata JSONB field.';
COMMENT ON COLUMN "public"."forms"."is_default" IS 'Marks this form as the default for proposal creation in the organization';
COMMENT ON COLUMN "public"."forms"."document_type" IS 'Type of document this form creates (proposal, invoice, service_request, estimate, proposal)';
COMMENT ON COLUMN "public"."google_oauth_tokens"."last_risc_event" IS 'Stores the last RISC security event received from Google. Contains event_type, reason, and received_at.';
COMMENT ON COLUMN "public"."invite_tokens"."department" IS 'Department the invited user will be assigned to when they accept the invitation';
COMMENT ON COLUMN "public"."invite_tokens"."revoked_at" IS 'Timestamp when the invitation was revoked. NULL means invitation is still active.';
COMMENT ON TABLE "public"."memberships" IS 'Triggers temporarily disabled for debugging - re-enable after org creation works';
COMMENT ON COLUMN "public"."memberships"."department" IS 'User department within organization (Sales, IT, Marketing, etc.). Auto-assigned to "Executive" for Owners. Only Owner/Admin can set/update.';
COMMENT ON COLUMN "public"."memberships"."join_type" IS 'How the member joined: Direct (org creator), Invited (sent email invite), Requested (self-requested via org code)';
COMMENT ON COLUMN "public"."notification_preferences"."email_on_reminder_due" IS 'Send email when a reminder becomes due';
COMMENT ON COLUMN "public"."notification_preferences"."email_on_task_due" IS 'Send email when a task due date is approaching or passed';
COMMENT ON COLUMN "public"."notification_preferences"."notification_email" IS 'Custom email address for notifications. If null, uses the user profile email.';
COMMENT ON COLUMN "public"."notification_preferences"."email_on_member_joined" IS 'Admin/Owner notification when new member joins via invite';
COMMENT ON COLUMN "public"."notification_preferences"."email_on_payment_success" IS 'Notification when payment is successfully processed';
COMMENT ON COLUMN "public"."notification_preferences"."email_on_payment_failed" IS 'Notification when payment fails to process';
COMMENT ON COLUMN "public"."notification_preferences"."email_on_trial_ending" IS 'Notification 3 days before free trial ends';
COMMENT ON COLUMN "public"."notification_preferences"."email_on_subscription_activated" IS 'Notification when subscription is activated';
COMMENT ON COLUMN "public"."notification_preferences"."email_on_subscription_canceled" IS 'Notification when subscription is canceled';
COMMENT ON COLUMN "public"."notification_preferences"."email_on_subscription_renewed" IS 'Notification when subscription renews';
COMMENT ON COLUMN "public"."notification_preferences"."email_on_seat_count_changed" IS 'Notification when team seat count changes (disabled by default)';
COMMENT ON COLUMN "public"."notification_preferences"."sms_enabled" IS 'Whether SMS notifications are enabled for this user';
COMMENT ON COLUMN "public"."notification_preferences"."sms_phone" IS 'Phone number for SMS notifications (E.164 format recommended)';
COMMENT ON COLUMN "public"."notification_preferences"."email_on_task_reminder" IS 'Send email for task reminder notifications';
COMMENT ON COLUMN "public"."notification_preferences"."sms_on_task_reminder" IS 'Send SMS for task reminder notifications (requires sms_enabled and sms_phone)';
COMMENT ON TABLE "public"."notification_retry_queue" IS 'Queue for failed notifications that need retry. Notifications are sent immediately; this table is only used when sending fails.';
COMMENT ON COLUMN "public"."notification_retry_queue"."channel" IS 'Delivery channel: email, sms, or push notification';
COMMENT ON COLUMN "public"."notification_retry_queue"."retry_count" IS 'Number of retry attempts made';
COMMENT ON COLUMN "public"."notification_retry_queue"."next_retry_at" IS 'When to attempt next retry (exponential backoff)';
COMMENT ON COLUMN "public"."notification_retry_queue"."last_error" IS 'Error message from last failed attempt';
COMMENT ON TABLE "public"."notifications" IS 'Stores user notifications for task assignments, mentions, and alerts';
COMMENT ON TABLE "public"."organizations" IS 'Name of each organization';
COMMENT ON COLUMN "public"."organizations"."numbering_config" IS 'Document numbering configuration per document type. Keys are document types (Proposal, Proposal, Bid, Estimate, Service_Request), values contain prefix, lastNumber, and padding settings.';
COMMENT ON COLUMN "public"."organizations"."primary_storage_provider" IS 'Primary cloud storage provider for documents. Options: google_drive, dropbox, or null for Supabase-only storage.';
COMMENT ON COLUMN "public"."organizations"."sync_to_all_storage_providers" IS 'If true, documents are uploaded to all connected storage providers. If false, only the primary provider is used.';
COMMENT ON COLUMN "public"."organizations"."require_proposal_approval" IS 'When true, Members must request approval from Admins/Owners before submitting proposals';
COMMENT ON TABLE "public"."password_reset_audit" IS 'Audit trail for password reset requests';
COMMENT ON COLUMN "public"."product_models"."config_schema" IS 'Product configuration schema (v2.0). Stores option definitions, cascading rules, computed fields, and UI grouping. Replaces the legacy default_configurations column. See src/lib/types/configSchema.ts for TypeScript types.';
COMMENT ON TABLE "public"."products" IS 'Simplified product catalog for organizations. Core fields: name, category, price.';
COMMENT ON COLUMN "public"."products"."display_id" IS 'User-customizable display ID. Falls back to product_number if null.';
COMMENT ON COLUMN "public"."products"."amount" IS 'The monetary amount or rate for this product';
COMMENT ON COLUMN "public"."products"."options" IS 'JSONB for price modifiers: { additions: [{name, value, type}], deductions: [{name, value, type}] }';
COMMENT ON COLUMN "public"."products"."amount_unit" IS 'Unit type: Flat, Per Hour, Per Day, Per Unit, Per Sq Ft, Per Linear Ft';
ALTER SEQUENCE "public"."products_product_number_seq" OWNER TO "postgres";
ALTER SEQUENCE "public"."products_product_number_seq" OWNED BY "public"."products"."product_number";
COMMENT ON TABLE "public"."profiles" IS 'Information of each users app data';
COMMENT ON COLUMN "public"."profiles"."is_super_admin" IS 'Platform administrator flag. Super admins can access the admin panel and create signup invites.';
COMMENT ON TABLE "public"."project_tasks" IS 'Stores project tasks that can be assigned to team members';
COMMENT ON COLUMN "public"."project_tasks"."reference" IS 'Auto-generated task reference (e.g., CW-1, TES-2)';
COMMENT ON COLUMN "public"."project_tasks"."proposal_id" IS 'Optional link to a proposal (for follow-up tasks).';
COMMENT ON COLUMN "public"."project_workflow_columns"."is_default" IS 'Default workflow columns cannot be deleted manually (enforced by RLS policy), but will be cascade-deleted when organization is deleted';
COMMENT ON TABLE "public"."projects" IS 'Kanban board for tracking won proposals through project workflow stages';
COMMENT ON COLUMN "public"."projects"."workflow_status" IS 'Current workflow stage (e.g., Active, In Progress, Review, Complete)';
COMMENT ON COLUMN "public"."projects"."board_order" IS 'Order of the card within its workflow column (0-based index)';
COMMENT ON COLUMN "public"."projects"."completion_date" IS 'Target or actual completion date for the project';
COMMENT ON COLUMN "public"."projects"."priority" IS 'Project priority level: Highest, High, Medium, Low, Lowest (NULL for no priority - default)';
COMMENT ON COLUMN "public"."projects"."timeline_milestones" IS 'Flexible timeline milestones array. Each milestone has:
{
  "type": "shop_drawings_approval" | "track_delivery" | "panel_delivery" | "furniture_delivery" | "installation" | "completion" | etc,
  "date": "2025-01-15" (ISO date string, null if not set),
  "auto_calculated": true/false (whether this date was auto-calculated from proposal data),
  "source": {
    "based_on": "shop_drawings_approval" (which milestone this is calculated from),
    "offset_weeks": 4 (number of weeks to add),
    "offset_days": 28 (number of days to add)
  }
}
This structure allows different business types (wall systems, furniture, custom) to have different milestone types without schema changes.';
COMMENT ON CONSTRAINT "projects_must_link_to_main_version_and_won" ON "public"."projects" IS 'Ensures projects are only created for main version proposals/proposals that have Won status';
COMMENT ON TABLE "public"."proposal_approval_requests" IS 'Tracks approval requests for proposals when require_proposal_approval is enabled';
COMMENT ON TABLE "public"."proposal_documents" IS 'File attachments for proposals. Actual files stored in Supabase Storage, this table stores metadata and references.';
COMMENT ON COLUMN "public"."proposal_documents"."storage_path" IS 'Path to file in Supabase Storage bucket. Format: {organization_id}/{proposal_id}/{filename}';
COMMENT ON COLUMN "public"."proposal_documents"."tab_key" IS 'Optional reference to which form tab this document belongs to';
COMMENT ON TABLE "public"."proposal_status_transitions" IS 'Tracks every status change for proposals - enables timeline analytics, conversion tracking, and time-to-close metrics';
COMMENT ON COLUMN "public"."proposals"."proposal_number" IS 'Unique proposal number generated from form prefix (e.g., "ER-2025-001", "SR-2025-002")';
COMMENT ON COLUMN "public"."proposals"."form_id" IS 'Reference to the form template used to create this proposal';
COMMENT ON COLUMN "public"."proposals"."client_name" IS 'Contact person name for the client';
COMMENT ON COLUMN "public"."proposals"."client_company" IS 'Company/organization name of the client (required)';
COMMENT ON COLUMN "public"."proposals"."job_location" IS 'Physical location where work will be performed (required)';
COMMENT ON COLUMN "public"."proposals"."total_value" IS 'Total proposal value for quick sorting/filtering (denormalized from computed_totals)';
COMMENT ON COLUMN "public"."proposals"."document_type" IS 'Type of document (inherited from form at creation time)';
COMMENT ON COLUMN "public"."proposals"."is_complete" IS 'Simple flag indicating whether the proposal is complete. When false, displays a hazard icon in the proposals table.';
COMMENT ON COLUMN "public"."proposals"."google_doc_id" IS 'The generated Google Doc ID for this proposal';
COMMENT ON COLUMN "public"."proposals"."completed_at" IS 'Timestamp when proposal was first marked complete (all required fields filled)';
CREATE OR REPLACE VIEW "public"."proposals_needing_ai_attention" WITH ("security_invoker"='on') AS
 SELECT "id",
    "proposal_number",
    "project_name",
    "client_name",
    "status",
    "total_value",
    "organization_id",
    "created_at",
    "updated_at",
    "ai_last_analyzed_at",
    "ai_pending_suggestions_count",
    EXTRACT(day FROM ("now"() - "updated_at")) AS "days_since_update",
        CASE
            WHEN ("status" = 'Submitted'::"text") THEN EXTRACT(day FROM ("now"() - "updated_at"))
            ELSE NULL::numeric
        END AS "days_since_submission",
        CASE
            WHEN ("ai_last_analyzed_at" IS NULL) THEN true
            WHEN ("ai_last_analyzed_at" < ("now"() - '24:00:00'::interval)) THEN true
            ELSE false
        END AS "needs_analysis"
   FROM "public"."proposals" "p"
  WHERE ("status" = ANY (ARRAY['Draft'::"text", 'Submitted'::"text", 'Won'::"text"]));
CREATE OR REPLACE VIEW "public"."safe_routines" WITH ("security_invoker"='on') AS
 SELECT "routine_name",
    "routine_type"
   FROM "information_schema"."routines"
  WHERE ((("routine_schema")::"name" = 'public'::"name") AND (("routine_name")::"name" = ANY (ARRAY['check_auth_rate_limit'::"name", 'record_auth_attempt'::"name", 'validate_invite_token'::"name"])));
COMMENT ON TABLE "public"."scheduled_notifications" IS 'Stores scheduled/future notifications. Supports reminders for tasks, proposals, invoices, etc. Processed by pg_cron every 5 minutes.';
COMMENT ON COLUMN "public"."scheduled_notifications"."entity_type" IS 'Type of entity: task, proposal, invoice, project';
COMMENT ON COLUMN "public"."scheduled_notifications"."entity_id" IS 'UUID of the related entity';
COMMENT ON COLUMN "public"."scheduled_notifications"."scheduled_for" IS 'When to send the notification (UTC)';
COMMENT ON COLUMN "public"."scheduled_notifications"."recurrence" IS 'once = single notification, daily = repeat daily until end date';
COMMENT ON COLUMN "public"."scheduled_notifications"."recurrence_end_date" IS 'Stop recurring notifications after this date';
COMMENT ON COLUMN "public"."scheduled_notifications"."status" IS 'pending = waiting to send, sent = delivered, cancelled = user cancelled';
COMMENT ON TABLE "public"."security_audit_log" IS 'General security event audit log';
CREATE OR REPLACE VIEW "public"."security_query_stats" AS
 SELECT "query",
    "calls",
    "total_exec_time",
    "rows",
        CASE
            WHEN ("rows" > 10000) THEN 'HIGH'::"text"
            WHEN ("rows" > 1000) THEN 'MEDIUM'::"text"
            ELSE 'LOW'::"text"
        END AS "risk_level"
   FROM "extensions"."pg_stat_statements"
  WHERE ("query" !~~ '%pg_%'::"text")
  ORDER BY "rows" DESC
 LIMIT 100;
COMMENT ON TABLE "public"."signup_invites" IS 'Stores invitation tokens for new organization sign-ups. Only the platform owner (super admin) can create these invites.';
COMMENT ON TABLE "public"."stripe_webhook_events" IS 'Tracks processed Stripe webhook events for idempotency. Safe to prune entries older than 7 days.';
COMMENT ON COLUMN "public"."subscriptions"."cancel_at_period_end" IS 'Whether the subscription is scheduled to cancel at the end of the current period';
COMMENT ON COLUMN "public"."subscriptions"."current_period_start" IS 'Start date of the current billing period (from Stripe)';
COMMENT ON COLUMN "public"."subscriptions"."pause_at_period_end" IS 'Whether the subscription is scheduled to pause at the end of the current period';
COMMENT ON COLUMN "public"."subscriptions"."grace_period_end" IS 'End of grace period after payment failure. Access allowed until this date.';
COMMENT ON COLUMN "public"."subscriptions"."billing_interval" IS 'Billing interval from Stripe: Monthly or Yearly';
COMMENT ON COLUMN "public"."subscriptions"."trial_start" IS 'Start date of the trial period (from Stripe)';
COMMENT ON COLUMN "public"."subscriptions"."trial_end" IS 'End date of the trial period (from Stripe)';
COMMENT ON COLUMN "public"."subscriptions"."has_payment_method" IS 'Whether the customer has added a payment method (from Stripe)';
COMMENT ON COLUMN "public"."subscriptions"."stripe_quantity_pending_sync" IS 'Indicates that local number_of_active_users has changed and Stripe subscription quantity may need to be updated.
Reset to FALSE after successfully calling manage-seats Edge Function.';
CREATE OR REPLACE VIEW "public"."subscriptions_pending_sync" WITH ("security_invoker"='on') AS
 SELECT "id",
    "organization_id",
    "stripe_subscription_id",
    "number_of_active_users" AS "local_quantity",
    "stripe_quantity_pending_sync",
    "updated_at"
   FROM "public"."subscriptions" "s"
  WHERE (("stripe_quantity_pending_sync" = true) AND ("stripe_subscription_id" IS NOT NULL));
COMMENT ON VIEW "public"."subscriptions_pending_sync" IS 'Shows subscriptions where local number_of_active_users has changed but Stripe quantity may not be synced yet.
Use this view in a scheduled Edge Function to batch-sync quantities to Stripe.';
COMMENT ON TABLE "public"."task_board_columns" IS 'Custom kanban board columns per organization';
CREATE OR REPLACE VIEW "public"."unverified_profiles_to_cleanup" WITH ("security_invoker"='on') AS
 SELECT "p"."id",
    "p"."email",
    "p"."full_name",
    "p"."created_at",
    "u"."email_confirmed_at",
    EXTRACT(hour FROM ("now"() - "u"."created_at")) AS "hours_old",
        CASE
            WHEN ("u"."created_at" < ("now"() - '168:00:00'::interval)) THEN 'Will be deleted on next cleanup'::"text"
            ELSE 'Still within 168-hour grace period'::"text"
        END AS "status"
   FROM (("public"."profiles" "p"
     JOIN "auth"."users" "u" ON (("p"."id" = "u"."id")))
     LEFT JOIN "public"."memberships" "m" ON (("p"."id" = "m"."user_id")))
  WHERE (("u"."email_confirmed_at" IS NULL) AND ("m"."id" IS NULL))
  ORDER BY "u"."created_at" DESC;
COMMENT ON VIEW "public"."unverified_profiles_to_cleanup" IS 'Shows unverified profiles that will be or have been cleaned up. Use this to monitor the cleanup process.';
CREATE OR REPLACE VIEW "public"."v_manufacturers_by_domain" WITH ("security_invoker"='on') AS
 SELECT "d"."id" AS "domain_id",
    "d"."name" AS "domain_name",
    "m"."id" AS "manufacturer_id",
    "m"."name" AS "manufacturer_name"
   FROM (("public"."product_domain" "d"
     JOIN "public"."manufacturer_product_domains" "md" ON (("md"."domain_id" = "d"."id")))
     JOIN "public"."product_manufacturers" "m" ON (("m"."id" = "md"."manufacturer_id")))
  ORDER BY "d"."name", "m"."name";
CREATE OR REPLACE VIEW "public"."v_models_by_manufacturer" WITH ("security_invoker"='on') AS
 SELECT "mfr"."id" AS "manufacturer_id",
    "mfr"."name" AS "manufacturer_name",
    "pl"."id" AS "product_line_id",
    "pl"."name" AS "product_line_name",
    "s"."id" AS "series_id",
    "s"."name" AS "series_name",
    "pm"."id" AS "model_id",
    "pm"."name" AS "model_name",
        CASE
            WHEN ("pm"."product_series_id" IS NOT NULL) THEN 'via_series'::"text"
            ELSE 'direct'::"text"
        END AS "model_path"
   FROM ((("public"."product_manufacturers" "mfr"
     LEFT JOIN "public"."product_line" "pl" ON (("pl"."manufacturer_id" = "mfr"."id")))
     LEFT JOIN "public"."product_series" "s" ON (("s"."product_line_id" = "pl"."id")))
     LEFT JOIN "public"."product_models" "pm" ON ((("pm"."product_series_id" = "s"."id") OR (("pm"."product_series_id" IS NULL) AND ("pm"."product_manufacturer_id" = "mfr"."id")))))
  WHERE ("pm"."id" IS NOT NULL)
  ORDER BY "mfr"."name", "pl"."name", "s"."name", "pm"."name";

-- TRIGGERS
CREATE OR REPLACE TRIGGER "ensure_single_main_version_trigger" BEFORE UPDATE OF "is_main_version" ON "public"."proposals" FOR EACH ROW WHEN (("new"."is_main_version" = true)) EXECUTE FUNCTION "public"."ensure_single_main_version_for_proposals"();
CREATE OR REPLACE TRIGGER "mark_quantity_sync_needed" BEFORE UPDATE OF "number_of_active_users" ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."mark_stripe_quantity_for_sync"();
CREATE OR REPLACE TRIGGER "normalize_membership_role_trigger" BEFORE INSERT OR UPDATE OF "role" ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."normalize_membership_role"();
CREATE OR REPLACE TRIGGER "normalize_membership_status_trigger" BEFORE INSERT OR UPDATE OF "status" ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."normalize_membership_status"();
CREATE OR REPLACE TRIGGER "normalize_proposal_status_trigger" BEFORE INSERT OR UPDATE OF "status" ON "public"."proposals" FOR EACH ROW EXECUTE FUNCTION "public"."normalize_proposal_status"();
CREATE OR REPLACE TRIGGER "on_organization_created_create_task_columns" AFTER INSERT ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_create_default_task_columns"();
CREATE OR REPLACE TRIGGER "on_proposal_status_update" BEFORE UPDATE ON "public"."proposals" FOR EACH ROW EXECUTE FUNCTION "public"."handle_proposal_status_change"();
CREATE OR REPLACE TRIGGER "set_contacts_updated_at" BEFORE UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_google_oauth_tokens_updated_at" BEFORE UPDATE ON "public"."google_oauth_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_project_tasks_updated_at" BEFORE UPDATE ON "public"."project_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_subscription_is_active" BEFORE INSERT OR UPDATE OF "stripe_subscription_status" ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_subscription_is_active"();
CREATE OR REPLACE TRIGGER "set_task_board_columns_updated_at" BEFORE UPDATE ON "public"."task_board_columns" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_task_comments_updated_at" BEFORE UPDATE ON "public"."task_comments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."forms" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."project_workflow_columns" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "sync_projects_on_proposal_is_on_board_change" AFTER UPDATE OF "is_on_board" ON "public"."proposals" FOR EACH ROW WHEN (("old"."is_on_board" IS DISTINCT FROM "new"."is_on_board")) EXECUTE FUNCTION "public"."sync_projects_from_proposal_is_on_board"();
CREATE OR REPLACE TRIGGER "sync_proposal_on_board_after_project_changes" AFTER INSERT OR DELETE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."sync_proposal_on_board_status"();
CREATE OR REPLACE TRIGGER "sync_user_count_on_delete" AFTER DELETE ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."sync_subscription_user_count"();
COMMENT ON TRIGGER "sync_user_count_on_delete" ON "public"."memberships" IS 'Recounts active members when membership is deleted';
CREATE OR REPLACE TRIGGER "sync_user_count_on_insert" AFTER INSERT ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."sync_subscription_user_count"();
COMMENT ON TRIGGER "sync_user_count_on_insert" ON "public"."memberships" IS 'Recounts active members when new membership is created';
CREATE OR REPLACE TRIGGER "sync_user_count_on_update" AFTER UPDATE OF "status" ON "public"."memberships" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."sync_subscription_user_count"();
COMMENT ON TRIGGER "sync_user_count_on_update" ON "public"."memberships" IS 'Recounts active members when membership status changes (e.g., Pending→Active, Active→Inactive)';
CREATE OR REPLACE TRIGGER "task_reference_trigger" BEFORE INSERT ON "public"."project_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."auto_generate_task_reference"();
CREATE OR REPLACE TRIGGER "track_proposal_initial_status" AFTER INSERT ON "public"."proposals" FOR EACH ROW EXECUTE FUNCTION "public"."track_proposal_initial_status"();
CREATE OR REPLACE TRIGGER "trigger_cleanup_expired_invite_tokens" AFTER INSERT ON "public"."invite_tokens" FOR EACH STATEMENT EXECUTE FUNCTION "public"."cleanup_expired_invite_tokens"();
CREATE OR REPLACE TRIGGER "trigger_create_workflow_columns_for_new_org" AFTER INSERT ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."create_workflow_columns_for_new_org"();
CREATE OR REPLACE TRIGGER "trigger_handle_user_deletion" BEFORE DELETE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_user_deletion"();
CREATE OR REPLACE TRIGGER "trigger_proposal_documents_count_delete" AFTER DELETE ON "public"."proposal_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_proposal_documents_count"();
CREATE OR REPLACE TRIGGER "trigger_proposal_documents_count_insert" AFTER INSERT ON "public"."proposal_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_proposal_documents_count"();
CREATE OR REPLACE TRIGGER "trigger_set_contact_created_by_name" BEFORE INSERT ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."set_contact_created_by_name"();
CREATE OR REPLACE TRIGGER "trigger_set_owner_department" BEFORE INSERT OR UPDATE ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."set_owner_department"();
CREATE OR REPLACE TRIGGER "trigger_sync_project_on_proposal_status_change" BEFORE UPDATE OF "status" ON "public"."proposals" FOR EACH ROW EXECUTE FUNCTION "public"."sync_project_on_proposal_status_change"();
CREATE OR REPLACE TRIGGER "trigger_update_ai_suggestions_count" AFTER INSERT OR DELETE OR UPDATE ON "public"."ai_suggestions" FOR EACH ROW EXECUTE FUNCTION "public"."update_proposal_ai_suggestions_count"();
CREATE OR REPLACE TRIGGER "trigger_update_contact_creator_name_on_profile" AFTER UPDATE OF "full_name", "email" ON "public"."profiles" FOR EACH ROW WHEN ((("old"."full_name" IS DISTINCT FROM "new"."full_name") OR ("old"."email" IS DISTINCT FROM "new"."email"))) EXECUTE FUNCTION "public"."update_contact_creator_name_on_profile_change"();
CREATE OR REPLACE TRIGGER "trigger_update_notification_preferences_updated_at" BEFORE UPDATE ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_notification_preferences_updated_at"();
CREATE OR REPLACE TRIGGER "trigger_update_proposal_creator_name" AFTER INSERT OR DELETE OR UPDATE OF "status" ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_proposal_creator_name_on_membership_change"();
CREATE OR REPLACE TRIGGER "trigger_update_proposal_creator_name_on_profile" AFTER UPDATE OF "full_name", "email" ON "public"."profiles" FOR EACH ROW WHEN ((("old"."full_name" IS DISTINCT FROM "new"."full_name") OR ("old"."email" IS DISTINCT FROM "new"."email"))) EXECUTE FUNCTION "public"."update_proposal_creator_name_on_profile_change"();
CREATE OR REPLACE TRIGGER "update_active_users_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_active_user_count"();
CREATE OR REPLACE TRIGGER "update_ai_suggestions_updated_at" BEFORE UPDATE ON "public"."ai_suggestions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "update_approval_requests_updated_at" BEFORE UPDATE ON "public"."proposal_approval_requests" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "update_calendar_events_updated_at" BEFORE UPDATE ON "public"."calendar_events" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "update_config_value_sets_updated_at" BEFORE UPDATE ON "public"."config_value_sets" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "update_invite_tokens_updated_at" BEFORE UPDATE ON "public"."invite_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
COMMENT ON TRIGGER "update_invite_tokens_updated_at" ON "public"."invite_tokens" IS 'Automatically updates updated_at timestamp when invite token is modified';
CREATE OR REPLACE TRIGGER "update_manufacturers_updated_at" BEFORE UPDATE ON "public"."product_manufacturers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "update_memberships_updated_at" BEFORE UPDATE ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "update_product_categories_updated_at" BEFORE UPDATE ON "public"."product_line" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
COMMENT ON TRIGGER "update_product_categories_updated_at" ON "public"."product_line" IS 'Automatically updates updated_at timestamp when product category is modified';
CREATE OR REPLACE TRIGGER "update_product_category_updated_at" BEFORE UPDATE ON "public"."product_line" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "update_product_domain_updated_at" BEFORE UPDATE ON "public"."product_domain" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "update_product_manufacturers_updated_at" BEFORE UPDATE ON "public"."product_manufacturers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
COMMENT ON TRIGGER "update_product_manufacturers_updated_at" ON "public"."product_manufacturers" IS 'Automatically updates updated_at timestamp when product manufacturer is modified';
CREATE OR REPLACE TRIGGER "update_product_models_updated_at" BEFORE UPDATE ON "public"."product_models" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "update_product_series_updated_at" BEFORE UPDATE ON "public"."product_series" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "update_product_types_updated_at" BEFORE UPDATE ON "public"."product_domain" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
COMMENT ON TRIGGER "update_product_types_updated_at" ON "public"."product_domain" IS 'Automatically updates updated_at timestamp when product type is modified';
CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "update_proposal_documents_updated_at" BEFORE UPDATE ON "public"."proposal_documents" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "update_signing_token_timestamp" BEFORE UPDATE ON "public"."proposal_signing_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "update_subscription_plans_updated_at" BEFORE UPDATE ON "public"."subscription_plans" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "update_subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "update_user_onboarding_progress_updated_at" BEFORE UPDATE ON "public"."user_onboarding_progress" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();

-- POLICIES
CREATE POLICY "Active members can insert products" ON "public"."products" FOR INSERT WITH CHECK ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
CREATE POLICY "Active members can update products" ON "public"."products" FOR UPDATE USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
CREATE POLICY "Admins can create invite tokens for their organization" ON "public"."invite_tokens" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"]));
CREATE POLICY "Admins can delete Google tokens" ON "public"."google_oauth_tokens" FOR DELETE TO "authenticated" USING ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"]));
CREATE POLICY "Admins can delete columns" ON "public"."task_board_columns" FOR DELETE TO "authenticated" USING ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"]));
CREATE POLICY "Admins can delete invite tokens for their organization" ON "public"."invite_tokens" FOR DELETE TO "authenticated" USING ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"]));
CREATE POLICY "Admins can insert Google tokens" ON "public"."google_oauth_tokens" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"]));
CREATE POLICY "Admins can insert columns" ON "public"."task_board_columns" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"]));
CREATE POLICY "Admins can update Google tokens" ON "public"."google_oauth_tokens" FOR UPDATE TO "authenticated" USING ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"])) WITH CHECK ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"]));
CREATE POLICY "Admins can update approval requests" ON "public"."proposal_approval_requests" FOR UPDATE USING ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"]));
CREATE POLICY "Admins can update columns" ON "public"."task_board_columns" FOR UPDATE TO "authenticated" USING ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"])) WITH CHECK ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"]));
CREATE POLICY "Admins can update invite tokens for their organization" ON "public"."invite_tokens" FOR UPDATE TO "authenticated" USING ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"]));
CREATE POLICY "Admins can view AI agent runs for their organization" ON "public"."ai_agent_runs" FOR SELECT TO "authenticated" USING ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"]));
CREATE POLICY "Admins can view ai_capability_gaps" ON "public"."ai_capability_gaps" FOR SELECT TO "authenticated" USING ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"]));
CREATE POLICY "Allow anonymous email lookup for signup" ON "public"."profiles" FOR SELECT TO "anon" USING (true);
CREATE POLICY "Anyone can create an organization" ON "public"."organizations" FOR INSERT WITH CHECK ((NOT (EXISTS ( SELECT 1
   FROM "public"."memberships"
  WHERE (("memberships"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("memberships"."role" = 'Owner'::"text"))))));
COMMENT ON POLICY "Anyone can create an organization" ON "public"."organizations" IS 'Allow authenticated users to create organizations - trigger handles owner membership';
CREATE POLICY "Anyone can view available integrations" ON "public"."available_integrations" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Authenticated users can read config value sets" ON "public"."config_value_sets" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Authenticated users can read manufacturer domains" ON "public"."manufacturer_product_domains" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Authenticated users can read product domains" ON "public"."product_domain" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Authenticated users can read product lines" ON "public"."product_line" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Authenticated users can read product manufacturers" ON "public"."product_manufacturers" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Authenticated users can read product models" ON "public"."product_models" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Authenticated users can read product series" ON "public"."product_series" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Authenticated users can update signup invites" ON "public"."signup_invites" FOR UPDATE TO "authenticated" USING (("public"."is_super_admin"() OR ((NOT "is_used") AND ("revoked_at" IS NULL) AND ("lower"("email") = "lower"(( SELECT "auth"."email"() AS "email")))))) WITH CHECK (("public"."is_super_admin"() OR ("is_used" = true)));
COMMENT ON POLICY "Authenticated users can update signup invites" ON "public"."signup_invites" IS 'Combined UPDATE policy: Super admins can update any invite. Regular users can only mark their own invite (email match) as used. Uses (SELECT auth.email()) for optimal performance.';
CREATE POLICY "Members can create approval requests" ON "public"."proposal_approval_requests" FOR INSERT WITH CHECK (("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id") AND ("requested_by" = ( SELECT "auth"."uid"() AS "uid"))));
CREATE POLICY "Members can insert AI agent runs" ON "public"."ai_agent_runs" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
CREATE POLICY "Members can update AI agent runs" ON "public"."ai_agent_runs" FOR UPDATE TO "authenticated" USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
CREATE POLICY "No deletes allowed" ON "public"."invite_token_attempts" FOR DELETE TO "authenticated" USING (false);
CREATE POLICY "No updates allowed" ON "public"."invite_token_attempts" FOR UPDATE TO "authenticated" USING (false);
CREATE POLICY "Only members can update their organization" ON "public"."organizations" FOR UPDATE TO "authenticated" USING ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "id", ARRAY['Owner'::"text", 'Admin'::"text"]));
COMMENT ON POLICY "Only members can update their organization" ON "public"."organizations" IS 'Only Owner/Admin can update organization. Uses SECURITY DEFINER to prevent circular dependency.';
CREATE POLICY "Org members can insert signing tokens" ON "public"."proposal_signing_tokens" FOR INSERT WITH CHECK ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
CREATE POLICY "Org members can update signing tokens" ON "public"."proposal_signing_tokens" FOR UPDATE USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
CREATE POLICY "Org members can view Google tokens" ON "public"."google_oauth_tokens" FOR SELECT TO "authenticated" USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
CREATE POLICY "Org members can view signatures" ON "public"."proposal_signatures" FOR SELECT USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
CREATE POLICY "Org members can view signing activity" ON "public"."proposal_signing_activity" FOR SELECT USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
CREATE POLICY "Org members can view signing tokens" ON "public"."proposal_signing_tokens" FOR SELECT USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
CREATE POLICY "Owner can create subscription" ON "public"."subscriptions" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text"]));
CREATE POLICY "Owner can update subscription" ON "public"."subscriptions" FOR UPDATE TO "authenticated" USING ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text"]));
COMMENT ON POLICY "Owner can update subscription" ON "public"."subscriptions" IS 'Only Owner/Admin can update subscription. Uses SECURITY DEFINER.';
CREATE POLICY "Owner/Admin can delete integrations" ON "public"."integrations" FOR DELETE TO "authenticated" USING ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"]));
CREATE POLICY "Owner/Admin can insert integrations" ON "public"."integrations" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"]));
CREATE POLICY "Owner/Admin can update integrations" ON "public"."integrations" FOR UPDATE TO "authenticated" USING ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"])) WITH CHECK ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"]));
CREATE POLICY "Owners and Admins can delete products" ON "public"."products" FOR DELETE USING ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"]));
CREATE POLICY "Owners can delete organizations" ON "public"."organizations" FOR DELETE TO "authenticated" USING ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "id", ARRAY['Owner'::"text"]));
CREATE POLICY "Select signup invites" ON "public"."signup_invites" FOR SELECT USING (("public"."is_super_admin"() OR ((NOT "is_used") AND ("revoked_at" IS NULL) AND ("expires_at" > "now"()))));
COMMENT ON POLICY "Select signup invites" ON "public"."signup_invites" IS 'Combined SELECT policy: Super admins can view all invites. Others (including anonymous) can only view valid invites for validation purposes.';
CREATE POLICY "Service role can insert attempts" ON "public"."invite_token_attempts" FOR INSERT TO "service_role" WITH CHECK (true);
CREATE POLICY "Service role can manage all AI agent runs" ON "public"."ai_agent_runs" TO "service_role" USING (true);
CREATE POLICY "Service role can manage all AI messages" ON "public"."ai_messages" TO "service_role" USING (true);
CREATE POLICY "Service role can manage all AI suggestions" ON "public"."ai_suggestions" TO "service_role" USING (true);
CREATE POLICY "Service role can manage all feedback" ON "public"."ai_user_feedback" TO "service_role" USING (true);
CREATE POLICY "Service role full access to ai_capability_gaps" ON "public"."ai_capability_gaps" TO "service_role" USING (true) WITH CHECK (true);
CREATE POLICY "Service role only" ON "public"."auth_rate_limits" TO "service_role" USING ((( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'service_role'::"text"));
CREATE POLICY "Service role only" ON "public"."password_reset_audit" USING ((( SELECT (( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text")) = 'service_role'::"text"));
CREATE POLICY "Service role only" ON "public"."security_audit_log" TO "service_role" USING ((( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'service_role'::"text"));
CREATE POLICY "Super admin can delete config option group metadata" ON "public"."config_option_group_metadata" FOR DELETE TO "authenticated" USING ("public"."is_super_admin"());
CREATE POLICY "Super admin can delete config value sets" ON "public"."config_value_sets" FOR DELETE TO "authenticated" USING ("public"."is_super_admin"());
CREATE POLICY "Super admin can delete manufacturer domains" ON "public"."manufacturer_product_domains" FOR DELETE TO "authenticated" USING ("public"."is_super_admin"());
CREATE POLICY "Super admin can delete product domains" ON "public"."product_domain" FOR DELETE TO "authenticated" USING ("public"."is_super_admin"());
CREATE POLICY "Super admin can delete product lines" ON "public"."product_line" FOR DELETE TO "authenticated" USING ("public"."is_super_admin"());
CREATE POLICY "Super admin can delete product manufacturers" ON "public"."product_manufacturers" FOR DELETE TO "authenticated" USING ("public"."is_super_admin"());
CREATE POLICY "Super admin can delete product models" ON "public"."product_models" FOR DELETE TO "authenticated" USING ("public"."is_super_admin"());
CREATE POLICY "Super admin can delete product series" ON "public"."product_series" FOR DELETE TO "authenticated" USING ("public"."is_super_admin"());
CREATE POLICY "Super admin can insert config option group metadata" ON "public"."config_option_group_metadata" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_super_admin"());
CREATE POLICY "Super admin can insert config value sets" ON "public"."config_value_sets" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_super_admin"());
CREATE POLICY "Super admin can insert manufacturer domains" ON "public"."manufacturer_product_domains" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_super_admin"());
CREATE POLICY "Super admin can insert product domains" ON "public"."product_domain" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_super_admin"());
CREATE POLICY "Super admin can insert product lines" ON "public"."product_line" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_super_admin"());
CREATE POLICY "Super admin can insert product manufacturers" ON "public"."product_manufacturers" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_super_admin"());
CREATE POLICY "Super admin can insert product models" ON "public"."product_models" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_super_admin"());
CREATE POLICY "Super admin can insert product series" ON "public"."product_series" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_super_admin"());
CREATE POLICY "Super admin can update config value sets" ON "public"."config_value_sets" FOR UPDATE TO "authenticated" USING ("public"."is_super_admin"());
CREATE POLICY "Super admin can update manufacturer domains" ON "public"."manufacturer_product_domains" FOR UPDATE TO "authenticated" USING ("public"."is_super_admin"());
CREATE POLICY "Super admin can update product domains" ON "public"."product_domain" FOR UPDATE TO "authenticated" USING ("public"."is_super_admin"());
CREATE POLICY "Super admin can update product lines" ON "public"."product_line" FOR UPDATE TO "authenticated" USING ("public"."is_super_admin"());
CREATE POLICY "Super admin can update product manufacturers" ON "public"."product_manufacturers" FOR UPDATE TO "authenticated" USING ("public"."is_super_admin"());
CREATE POLICY "Super admin can update product models" ON "public"."product_models" FOR UPDATE TO "authenticated" USING ("public"."is_super_admin"());
CREATE POLICY "Super admin can update product series" ON "public"."product_series" FOR UPDATE TO "authenticated" USING ("public"."is_super_admin"());
CREATE POLICY "Super admins can create signup invites" ON "public"."signup_invites" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_super_admin"());
CREATE POLICY "Super admins can delete signup invites" ON "public"."signup_invites" FOR DELETE TO "authenticated" USING ("public"."is_super_admin"());
CREATE POLICY "System can insert proposal transitions" ON "public"."proposal_status_transitions" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
CREATE POLICY "User can update contacts" ON "public"."contacts" FOR UPDATE TO "authenticated" USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")) WITH CHECK ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
CREATE POLICY "Users can add contacts" ON "public"."contacts" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
CREATE POLICY "Users can create AI messages for their organization proposals" ON "public"."ai_messages" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
CREATE POLICY "Users can create notifications" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
COMMENT ON POLICY "Users can create notifications" ON "public"."notifications" IS 'Active members can create notifications for users in their organization. Uses SECURITY DEFINER function to prevent recursion.';
CREATE POLICY "Users can create organization calendar events" ON "public"."calendar_events" FOR INSERT WITH CHECK ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
CREATE POLICY "Users can create projects in their organization" ON "public"."projects" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "memberships"."organization_id"
   FROM "public"."memberships"
  WHERE ("memberships"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));
CREATE POLICY "Users can create scheduled notifications" ON "public"."scheduled_notifications" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
CREATE POLICY "Users can create tasks for their organization's projects" ON "public"."project_tasks" FOR INSERT WITH CHECK (("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id") AND ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can create workflow columns in their organization" ON "public"."project_workflow_columns" FOR INSERT WITH CHECK ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));






CREATE POLICY "Users can delete contacts" ON "public"."contacts" FOR DELETE TO "authenticated" USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can delete documents in their organization" ON "public"."proposal_documents" FOR DELETE USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can delete organization calendar events" ON "public"."calendar_events" FOR DELETE USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can delete projects in their organization" ON "public"."projects" FOR DELETE USING (("organization_id" IN ( SELECT "memberships"."organization_id"
   FROM "public"."memberships"
  WHERE ("memberships"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete scheduled notifications" ON "public"."scheduled_notifications" FOR DELETE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"])));



CREATE POLICY "Users can delete their own attachments or admins" ON "public"."task_attachments" FOR DELETE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"])));



CREATE POLICY "Users can delete their own comments" ON "public"."task_comments" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own notification preferences" ON "public"."notification_preferences" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own notifications" ON "public"."notifications" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own tasks or admins can delete any" ON "public"."project_tasks" FOR DELETE USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"])));



CREATE POLICY "Users can delete workflow columns in their organization" ON "public"."project_workflow_columns" FOR DELETE USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



COMMENT ON POLICY "Users can delete workflow columns in their organization" ON "public"."project_workflow_columns" IS 'Allow any organization member to delete workflow columns. Users can now delete default columns.';



CREATE POLICY "Users can insert AI suggestions for their organization" ON "public"."ai_suggestions" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can insert task activities in their organization" ON "public"."task_activities" FOR INSERT WITH CHECK ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can insert task attachments in their organization" ON "public"."task_attachments" FOR INSERT WITH CHECK (("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id") AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can insert task comments in their organization" ON "public"."task_comments" FOR INSERT WITH CHECK (("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id") AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can insert their own feedback" ON "public"."ai_user_feedback" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert their own notification preferences" ON "public"."notification_preferences" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can read subscription" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



COMMENT ON POLICY "Users can read subscription" ON "public"."subscriptions" IS 'All active members can view organization subscription (needed for paywall check). Uses SECURITY DEFINER.';



CREATE POLICY "Users can update documents in their organization" ON "public"."proposal_documents" FOR UPDATE USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can update organization calendar events" ON "public"."calendar_events" FOR UPDATE USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can update projects in their organization" ON "public"."projects" FOR UPDATE USING (("organization_id" IN ( SELECT "memberships"."organization_id"
   FROM "public"."memberships"
  WHERE ("memberships"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update scheduled notifications" ON "public"."scheduled_notifications" FOR UPDATE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"])));



CREATE POLICY "Users can update tasks in their organization" ON "public"."project_tasks" FOR UPDATE USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")) WITH CHECK ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can update their own AI suggestions" ON "public"."ai_suggestions" FOR UPDATE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"])));






CREATE POLICY "Users can update their own comments" ON "public"."task_comments" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own notification preferences" ON "public"."notification_preferences" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update workflow columns in their organization" ON "public"."project_workflow_columns" FOR UPDATE USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")) WITH CHECK ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));






CREATE POLICY "Users can upload documents to proposals in their organization" ON "public"."proposal_documents" FOR INSERT WITH CHECK ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can view AI messages for their organization proposals" ON "public"."ai_messages" FOR SELECT TO "authenticated" USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can view approval requests in their org" ON "public"."proposal_approval_requests" FOR SELECT USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));






CREATE POLICY "Users can view columns in their organization" ON "public"."task_board_columns" FOR SELECT TO "authenticated" USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can view contacts" ON "public"."contacts" FOR SELECT TO "authenticated" USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can view feedback in their organization" ON "public"."ai_user_feedback" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("organization_id" IN ( SELECT "memberships"."organization_id"
   FROM "public"."memberships"
  WHERE (("memberships"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("memberships"."status" = 'Active'::"text"))))));



CREATE POLICY "Users can view invite tokens" ON "public"."invite_tokens" FOR SELECT TO "authenticated" USING ((("email" = ( SELECT ("auth"."jwt"() ->> 'email'::"text"))) OR "public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



CREATE POLICY "Users can view org scheduled notifications" ON "public"."scheduled_notifications" FOR SELECT TO "authenticated" USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can view organization calendar events" ON "public"."calendar_events" FOR SELECT USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can view organizations" ON "public"."organizations" FOR SELECT TO "authenticated" USING (("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "id") OR (EXISTS ( SELECT 1
   FROM "public"."invite_tokens"
  WHERE (("invite_tokens"."organization_id" = ( SELECT "organizations"."id")) AND ("invite_tokens"."email" = ( SELECT ("auth"."jwt"() ->> 'email'::"text"))))))));



CREATE POLICY "Users can view own invite attempts" ON "public"."invite_token_attempts" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view products in their organization" ON "public"."products" FOR SELECT USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can view projects in their organization" ON "public"."projects" FOR SELECT USING (("organization_id" IN ( SELECT "memberships"."organization_id"
   FROM "public"."memberships"
  WHERE ("memberships"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view proposal documents in their organization" ON "public"."proposal_documents" FOR SELECT USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can view proposal transitions in their org" ON "public"."proposal_status_transitions" FOR SELECT TO "authenticated" USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can view task activities in their organization" ON "public"."task_activities" FOR SELECT USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can view task attachments in their organization" ON "public"."task_attachments" FOR SELECT USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can view task comments in their organization" ON "public"."task_comments" FOR SELECT USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can view tasks for their organization's projects" ON "public"."project_tasks" FOR SELECT USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
CREATE POLICY "Users can view their org's integrations" ON "public"."integrations" FOR SELECT TO "authenticated" USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can view their organization's AI suggestions" ON "public"."ai_suggestions" FOR SELECT TO "authenticated" USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
CREATE POLICY "Users can view their own notification preferences" ON "public"."notification_preferences" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));
CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));
CREATE POLICY "Users can view their own retry notifications" ON "public"."notification_retry_queue" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));
CREATE POLICY "Users can view workflow columns in their organization" ON "public"."project_workflow_columns" FOR SELECT TO "authenticated" USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
ALTER TABLE "public"."ai_agent_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ai_capability_gaps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ai_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ai_suggestions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ai_user_feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."auth_rate_limits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."available_integrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."calendar_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."config_option_group_metadata" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."config_value_sets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creation_log_insert_policy" ON "public"."organization_creation_log" FOR INSERT TO "service_role" WITH CHECK (true);
CREATE POLICY "creation_log_select_policy" ON "public"."organization_creation_log" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_owner_or_admin"()));
ALTER TABLE "public"."forms" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forms_delete_policy" ON "public"."forms" FOR DELETE TO "authenticated" USING ((("organization_id" IS NOT NULL) AND "public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id") AND ("is_template" = false)));
COMMENT ON POLICY "forms_delete_policy" ON "public"."forms" IS 'Allows org members to delete their forms. System templates cannot be deleted via app.';
CREATE POLICY "forms_insert_policy" ON "public"."forms" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" IS NOT NULL) AND "public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id") AND ("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("is_template" = false)));
COMMENT ON POLICY "forms_insert_policy" ON "public"."forms" IS 'Allows org members to create forms. System templates must be created via SQL by database admins.';
CREATE POLICY "forms_select_policy" ON "public"."forms" FOR SELECT TO "authenticated" USING (((("organization_id" IS NOT NULL) AND "public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")) OR (("organization_id" IS NULL) AND ("is_template" = true) AND (( SELECT "auth"."uid"() AS "uid") IS NOT NULL))));
COMMENT ON POLICY "forms_select_policy" ON "public"."forms" IS 'Allows org members to view their forms and all authenticated users to view system templates';
CREATE POLICY "forms_update_policy" ON "public"."forms" FOR UPDATE TO "authenticated" USING ((("organization_id" IS NOT NULL) AND "public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id") AND ("is_template" = false))) WITH CHECK ((("organization_id" IS NOT NULL) AND "public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id") AND ("is_template" = false)));
COMMENT ON POLICY "forms_update_policy" ON "public"."forms" IS 'Allows org members to update their forms. System templates cannot be updated via app.';
ALTER TABLE "public"."google_oauth_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."integrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."invite_token_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."invite_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."manufacturer_product_domains" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."memberships" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "memberships_insert_policy" ON "public"."memberships" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"]) OR "public"."org_has_no_members"("organization_id")));
COMMENT ON POLICY "memberships_insert_policy" ON "public"."memberships" IS 'Users can create own memberships, admins can invite others, or first member can join empty org. Uses SECURITY DEFINER functions to prevent recursion.';
CREATE POLICY "memberships_select_policy" ON "public"."memberships" FOR SELECT USING ("public"."can_view_membership"(( SELECT "auth"."uid"() AS "uid"), "user_id", "organization_id"));
COMMENT ON POLICY "memberships_select_policy" ON "public"."memberships" IS 'Users can see own memberships and memberships in their orgs. Uses SECURITY DEFINER to prevent recursion.';
CREATE POLICY "memberships_update_policy" ON "public"."memberships" FOR UPDATE USING ("public"."has_org_role"(( SELECT "auth"."uid"() AS "uid"), "organization_id", ARRAY['Owner'::"text", 'Admin'::"text"]));
COMMENT ON POLICY "memberships_update_policy" ON "public"."memberships" IS 'Only Owner/Admin can update memberships. Uses SECURITY DEFINER.';
CREATE POLICY "no delete policy" ON "public"."organization_creation_log" FOR DELETE TO "authenticated" USING (false);
CREATE POLICY "no update policy" ON "public"."organization_creation_log" FOR UPDATE TO "authenticated" USING (false);
ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_retry_queue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_delete_policy" ON "public"."user_onboarding_progress" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));
CREATE POLICY "onboarding_insert_policy" ON "public"."user_onboarding_progress" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));
CREATE POLICY "onboarding_select_policy" ON "public"."user_onboarding_progress" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));
CREATE POLICY "onboarding_update_policy" ON "public"."user_onboarding_progress" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));
ALTER TABLE "public"."organization_creation_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."password_reset_audit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_domain" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_line" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_manufacturers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_models" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_series" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_delete_policy" ON "public"."profiles" FOR DELETE USING (false);
CREATE POLICY "profiles_insert_policy" ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));
CREATE POLICY "profiles_select_policy" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR ("id" IN ( SELECT "get_org_member_ids"."user_id"
   FROM "public"."get_org_member_ids"(( SELECT "auth"."uid"() AS "uid")) "get_org_member_ids"("user_id")))));
CREATE POLICY "profiles_update_policy" ON "public"."profiles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));
ALTER TABLE "public"."project_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."project_workflow_columns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."proposal_approval_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."proposal_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."proposal_signatures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."proposal_signing_activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."proposal_signing_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."proposal_status_transitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."proposals" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proposals_delete_policy" ON "public"."proposals" FOR DELETE USING (((("organization_id" IS NULL) AND ("auth"."uid"() = "created_by")) OR (("organization_id" = "public"."get_current_user_organization"()) AND (EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."organization_id" = "proposals"."organization_id") AND ("m"."status" = 'Active'::"text")))))));
COMMENT ON POLICY "proposals_delete_policy" ON "public"."proposals" IS 'Can delete if: (1) no organization and you created it, OR (2) active member of the organization';
CREATE POLICY "proposals_insert_policy" ON "public"."proposals" FOR INSERT WITH CHECK (("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id") AND ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));
COMMENT ON POLICY "proposals_insert_policy" ON "public"."proposals" IS 'Active members can create proposals, must set themselves as creator';
CREATE POLICY "proposals_select_policy" ON "public"."proposals" FOR SELECT USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
COMMENT ON POLICY "proposals_select_policy" ON "public"."proposals" IS 'Active members can view all proposals in their organization';
CREATE POLICY "proposals_update_policy" ON "public"."proposals" FOR UPDATE USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));
COMMENT ON POLICY "proposals_update_policy" ON "public"."proposals" IS 'Active members can update all proposals in their organization';
ALTER TABLE "public"."scheduled_notifications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seat_usage_delete_service_only" ON "public"."subscription_seat_usage_events" FOR DELETE USING (false);
CREATE POLICY "seat_usage_insert_service_only" ON "public"."subscription_seat_usage_events" FOR INSERT WITH CHECK (false);
CREATE POLICY "seat_usage_select" ON "public"."subscription_seat_usage_events" FOR SELECT USING ("public"."is_active_member"(( SELECT "auth"."uid"() AS "uid"), ( SELECT "subscriptions"."organization_id"
   FROM "public"."subscriptions"
  WHERE ("subscriptions"."id" = "subscription_seat_usage_events"."subscription_id"))));
CREATE POLICY "seat_usage_update_service_only" ON "public"."subscription_seat_usage_events" FOR UPDATE USING (false);
ALTER TABLE "public"."security_audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."signup_invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."stripe_webhook_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscription_plans_select_policy" ON "public"."subscription_plans" FOR SELECT TO "authenticated" USING (("is_active" = true));
COMMENT ON POLICY "subscription_plans_select_policy" ON "public"."subscription_plans" IS 'Authenticated users can view active subscription plans only. No write access.';
ALTER TABLE "public"."subscription_seat_usage_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."task_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."task_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."task_board_columns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."task_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_onboarding_progress" ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."calendar_events";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."contacts";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."memberships";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."organizations";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."project_tasks";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."project_workflow_columns";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."projects";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."proposal_approval_requests";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."proposals";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."subscription_plans";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."subscriptions";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."task_activities";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."task_attachments";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."task_comments";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_onboarding_progress";
GRANT ALL ON SCHEMA "internal" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
REVOKE ALL ON FUNCTION "internal"."get_org_member_ids"("p_org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "internal"."get_org_member_ids"("p_org_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."approve_member"("member_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_member"("member_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_member"("member_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."attempt_org_creation"("p_profile_id" "uuid", "p_ip" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."attempt_org_creation"("p_profile_id" "uuid", "p_ip" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."attempt_org_creation"("p_profile_id" "uuid", "p_ip" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."auto_generate_task_reference"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auto_generate_task_reference"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_generate_task_reference"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."auto_join_pending_invite"("p_user_id" "uuid", "p_user_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auto_join_pending_invite"("p_user_id" "uuid", "p_user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_join_pending_invite"("p_user_id" "uuid", "p_user_email" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."block_access"("org_id" "uuid", "reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."block_access"("org_id" "uuid", "reason" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."can_view_membership"("check_user_id" "uuid", "membership_user_id" "uuid", "membership_org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_view_membership"("check_user_id" "uuid", "membership_user_id" "uuid", "membership_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view_membership"("check_user_id" "uuid", "membership_user_id" "uuid", "membership_org_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."cancel_scheduled_notification"("p_entity_type" "text", "p_entity_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_scheduled_notification"("p_entity_type" "text", "p_entity_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_scheduled_notification"("p_entity_type" "text", "p_entity_id" "uuid", "p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_auth_rate_limit"("p_identifier" "text", "p_identifier_type" "text", "p_attempt_type" "text", "p_max_attempts" integer, "p_window_minutes" integer, "p_block_duration_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_auth_rate_limit"("p_identifier" "text", "p_identifier_type" "text", "p_attempt_type" "text", "p_max_attempts" integer, "p_window_minutes" integer, "p_block_duration_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_auth_rate_limit"("p_identifier" "text", "p_identifier_type" "text", "p_attempt_type" "text", "p_max_attempts" integer, "p_window_minutes" integer, "p_block_duration_minutes" integer) TO "service_role";
REVOKE ALL ON FUNCTION "public"."check_due_notifications"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_due_notifications"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."check_invite_rate_limit"("p_ip_address" "inet", "p_user_id" "uuid", "p_invite_token" "text", "p_window_minutes" integer, "p_max_attempts" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_invite_rate_limit"("p_ip_address" "inet", "p_user_id" "uuid", "p_invite_token" "text", "p_window_minutes" integer, "p_max_attempts" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_invite_rate_limit"("p_ip_address" "inet", "p_user_id" "uuid", "p_invite_token" "text", "p_window_minutes" integer, "p_max_attempts" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."check_login_rate_limit"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_login_rate_limit"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_login_rate_limit"("p_email" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_org_creation_rate_limit"("p_user_id" "uuid", "p_ip_address" "inet") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_org_creation_rate_limit"("p_user_id" "uuid", "p_ip_address" "inet") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_otp_rate_limit"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_otp_rate_limit"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_otp_rate_limit"("p_email" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."check_project_linked_to_main_version_and_won"("p_proposal_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_project_linked_to_main_version_and_won"("p_proposal_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_project_linked_to_main_version_and_won"("p_proposal_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."check_proposal_is_main_version_and_won"("proposal_id_param" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_proposal_is_main_version_and_won"("proposal_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_proposal_is_main_version_and_won"("proposal_id_param" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."cleanup_all_expired_data"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_all_expired_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_all_expired_data"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."cleanup_all_rate_limiting_logs"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_all_rate_limiting_logs"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."cleanup_auth_rate_limits"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_auth_rate_limits"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."cleanup_expired_invite_tokens"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_expired_invite_tokens"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."cleanup_expired_onboarding"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_expired_onboarding"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."cleanup_expired_rate_limits"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_expired_rate_limits"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."cleanup_invite_token_attempts"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_invite_token_attempts"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."cleanup_invite_tokens"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_invite_tokens"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."cleanup_old_invite_attempts"("p_days_to_keep" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_old_invite_attempts"("p_days_to_keep" integer) TO "service_role";
REVOKE ALL ON FUNCTION "public"."cleanup_old_qb_requests"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_old_qb_requests"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."cleanup_org_rate_limits"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_org_rate_limits"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."cleanup_organization_creation_log"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_organization_creation_log"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."cleanup_unverified_profiles"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_unverified_profiles"() TO "service_role";
GRANT ALL ON FUNCTION "public"."clear_auth_rate_limit"("p_email" "text", "p_attempt_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."clear_auth_rate_limit"("p_email" "text", "p_attempt_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_auth_rate_limit"("p_email" "text", "p_attempt_type" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."create_default_task_columns"("org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_default_task_columns"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_task_columns"("org_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."create_default_workflow_columns"("org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_default_workflow_columns"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_workflow_columns"("org_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."create_org_with_owner"("org_name" "text", "found_via" "text", "industry" "text", "owner_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_org_with_owner"("org_name" "text", "found_via" "text", "industry" "text", "owner_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_org_with_owner"("org_name" "text", "found_via" "text", "industry" "text", "owner_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."create_workflow_columns_for_new_org"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_workflow_columns_for_new_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_workflow_columns_for_new_org"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."enforce_query_limit"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_query_limit"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."ensure_single_main_version_for_proposals"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_single_main_version_for_proposals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_main_version_for_proposals"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."generate_next_proposal_number"("p_form_id" "uuid", "p_starting_number" character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_next_proposal_number"("p_form_id" "uuid", "p_starting_number" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_next_proposal_number"("p_form_id" "uuid", "p_starting_number" character varying) TO "service_role";
REVOKE ALL ON FUNCTION "public"."generate_proposal_version"("p_parent_proposal_number" character varying, "p_organization_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_proposal_version"("p_parent_proposal_number" character varying, "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_proposal_version"("p_parent_proposal_number" character varying, "p_organization_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."generate_task_reference"("org_id" "uuid", "task_title" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_task_reference"("org_id" "uuid", "task_title" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_task_reference"("org_id" "uuid", "task_title" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."get_current_user_organization"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_current_user_organization"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_organization"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."get_current_user_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "service_role";
GRANT ALL ON TABLE "public"."available_integrations" TO "anon";
GRANT ALL ON TABLE "public"."available_integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."available_integrations" TO "service_role";
REVOKE ALL ON FUNCTION "public"."get_integrations_for_plan"("plan_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_integrations_for_plan"("plan_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_integrations_for_plan"("plan_name" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."get_model_configuration"("p_model_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_model_configuration"("p_model_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_model_configuration"("p_model_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."get_org_member_ids"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_org_member_ids"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_member_ids"("target_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_organization_pending_ai_suggestions"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_pending_ai_suggestions"("org_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_remaining_org_creations"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_remaining_org_creations"("p_user_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."get_user_org_folders"("check_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_org_folders"("check_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_org_folders"("check_user_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."get_user_org_ids"("check_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_org_ids"("check_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_org_ids"("check_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_value_set"("p_slug" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_value_set"("p_slug" character varying) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_value_sets_by_slugs"("p_slugs" character varying[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_value_sets_by_slugs"("p_slugs" character varying[]) TO "service_role";
REVOKE ALL ON FUNCTION "public"."handle_auth_user_email_sync"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_auth_user_email_sync"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_auth_user_email_sync"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."handle_proposal_status_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_proposal_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_proposal_status_change"() TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_rpc_error"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_rpc_error"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."handle_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."handle_user_deletion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_user_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_deletion"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."has_org_role"("check_user_id" "uuid", "check_org_id" "uuid", "required_roles" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_org_role"("check_user_id" "uuid", "check_org_id" "uuid", "required_roles" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_org_role"("check_user_id" "uuid", "check_org_id" "uuid", "required_roles" "text"[]) TO "service_role";
REVOKE ALL ON FUNCTION "public"."has_valid_subscription"("org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_valid_subscription"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_valid_subscription"("org_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."invoke_notification_email_edge_function"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."invoke_notification_email_edge_function"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."is_active_member"("check_user_id" "uuid", "check_org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_active_member"("check_user_id" "uuid", "check_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_active_member"("check_user_id" "uuid", "check_org_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."is_org_folder_admin"("check_user_id" "uuid", "folder_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_org_folder_admin"("check_user_id" "uuid", "folder_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_folder_admin"("check_user_id" "uuid", "folder_name" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."is_owner_or_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_owner_or_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_owner_or_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_valid_config_schema"("schema" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_valid_config_schema"("schema" "jsonb") TO "service_role";
REVOKE ALL ON FUNCTION "public"."link_contact_to_member"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."link_contact_to_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_contact_to_member"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."log_invite_attempt"("p_ip_address" "inet", "p_user_id" "uuid", "p_invite_token" "text", "p_success" boolean, "p_error_message" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_invite_attempt"("p_ip_address" "inet", "p_user_id" "uuid", "p_invite_token" "text", "p_success" boolean, "p_error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_invite_attempt"("p_ip_address" "inet", "p_user_id" "uuid", "p_invite_token" "text", "p_success" boolean, "p_error_message" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."log_org_creation_attempt"("p_user_id" "uuid", "p_status" "text", "p_ip_address" "text", "p_error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_org_creation_attempt"("p_user_id" "uuid", "p_status" "text", "p_ip_address" "text", "p_error_message" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."log_security_event"("p_event_type" "text", "p_user_id" "uuid", "p_organization_id" "uuid", "p_details" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_security_event"("p_event_type" "text", "p_user_id" "uuid", "p_organization_id" "uuid", "p_details" "jsonb") TO "service_role";
REVOKE ALL ON FUNCTION "public"."mark_scheduled_notifications_sent"("notification_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_scheduled_notifications_sent"("notification_ids" "uuid"[]) TO "service_role";
REVOKE ALL ON FUNCTION "public"."mark_stripe_quantity_for_sync"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_stripe_quantity_for_sync"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_stripe_quantity_for_sync"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."normalize_membership_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."normalize_membership_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_membership_role"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."normalize_membership_status"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."normalize_membership_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_membership_status"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."normalize_proposal_status"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."normalize_proposal_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_proposal_status"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."org_has_no_members"("check_org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."org_has_no_members"("check_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."org_has_no_members"("check_org_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."process_all_due_notifications"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_all_due_notifications"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."process_due_notifications_internal"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_due_notifications_internal"() TO "service_role";
GRANT ALL ON FUNCTION "public"."record_auth_attempt"("p_identifier" "text", "p_identifier_type" "text", "p_attempt_type" "text", "p_success" boolean, "p_max_attempts" integer, "p_window_minutes" integer, "p_block_duration_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."record_auth_attempt"("p_identifier" "text", "p_identifier_type" "text", "p_attempt_type" "text", "p_success" boolean, "p_max_attempts" integer, "p_window_minutes" integer, "p_block_duration_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_auth_attempt"("p_identifier" "text", "p_identifier_type" "text", "p_attempt_type" "text", "p_success" boolean, "p_max_attempts" integer, "p_window_minutes" integer, "p_block_duration_minutes" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."record_failed_login"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_failed_login"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_failed_login"("p_email" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."record_failed_otp"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_failed_otp"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_failed_otp"("p_email" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."reject_member"("member_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reject_member"("member_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_member"("member_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."restore_access"("org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."restore_access"("org_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."sanitize_error_message"("p_error_message" "text", "p_error_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."sanitize_error_message"("p_error_message" "text", "p_error_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sanitize_error_message"("p_error_message" "text", "p_error_code" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."schedule_notification"("p_entity_type" "text", "p_entity_id" "uuid", "p_user_id" "uuid", "p_organization_id" "uuid", "p_scheduled_for" timestamp with time zone, "p_title" "text", "p_message" "text", "p_link" "text", "p_recurrence" "text", "p_recurrence_end_date" "date", "p_notification_type" "text", "p_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."schedule_notification"("p_entity_type" "text", "p_entity_id" "uuid", "p_user_id" "uuid", "p_organization_id" "uuid", "p_scheduled_for" timestamp with time zone, "p_title" "text", "p_message" "text", "p_link" "text", "p_recurrence" "text", "p_recurrence_end_date" "date", "p_notification_type" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."schedule_notification"("p_entity_type" "text", "p_entity_id" "uuid", "p_user_id" "uuid", "p_organization_id" "uuid", "p_scheduled_for" timestamp with time zone, "p_title" "text", "p_message" "text", "p_link" "text", "p_recurrence" "text", "p_recurrence_end_date" "date", "p_notification_type" "text", "p_metadata" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."secure_rpc"("p_action" "text", "p_params" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."secure_rpc"("p_action" "text", "p_params" "jsonb") TO "service_role";
REVOKE ALL ON FUNCTION "public"."set_contact_created_by_name"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_contact_created_by_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_contact_created_by_name"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."set_owner_department"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_owner_department"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_owner_department"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."sync_integration_status"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_integration_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_integration_status"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."sync_project_on_proposal_status_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_project_on_proposal_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_project_on_proposal_status_change"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."sync_projects_from_proposal_is_on_board"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_projects_from_proposal_is_on_board"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_projects_from_proposal_is_on_board"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."sync_proposal_on_board_status"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_proposal_on_board_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_proposal_on_board_status"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."sync_subscription_user_count"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_subscription_user_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_subscription_user_count"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."track_proposal_initial_status"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."track_proposal_initial_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_proposal_initial_status"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."transfer_ownership"("p_new_owner_id" "uuid", "p_organization_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transfer_ownership"("p_new_owner_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."transfer_ownership"("p_new_owner_id" "uuid", "p_organization_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."trigger_create_default_task_columns"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."trigger_create_default_task_columns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_create_default_task_columns"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."update_active_user_count"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_active_user_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_active_user_count"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."update_contact_creator_name_on_profile_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_contact_creator_name_on_profile_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_contact_creator_name_on_profile_change"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."update_member_role"("member_id" "uuid", "new_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_member_role"("member_id" "uuid", "new_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_member_role"("member_id" "uuid", "new_role" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."update_notification_preferences_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_notification_preferences_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_notification_preferences_updated_at"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."update_org_creator_profile"("user_id" "uuid", "org_id" "uuid", "role_value" "text", "status_value" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_org_creator_profile"("user_id" "uuid", "org_id" "uuid", "role_value" "text", "status_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_org_creator_profile"("user_id" "uuid", "org_id" "uuid", "role_value" "text", "status_value" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."update_proposal_ai_suggestions_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_proposal_ai_suggestions_count"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."update_proposal_documents_count"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_proposal_documents_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_proposal_documents_count"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."update_proposal_creator_name_on_membership_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_proposal_creator_name_on_membership_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_proposal_creator_name_on_membership_change"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."update_proposal_creator_name_on_profile_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_proposal_creator_name_on_profile_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_proposal_creator_name_on_profile_change"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."update_signing_token_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_signing_token_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_signing_token_updated_at"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."update_subscription_is_active"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_subscription_is_active"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_subscription_is_active"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."update_user_profile"("user_id" "uuid", "full_name_value" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_user_profile"("user_id" "uuid", "full_name_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_profile"("user_id" "uuid", "full_name_value" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."user_has_admin_role_in_org"("org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_admin_role_in_org"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_admin_role_in_org"("org_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."user_has_role_in_org"("org_id" "uuid", "required_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_role_in_org"("org_id" "uuid", "required_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_role_in_org"("org_id" "uuid", "required_role" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."validate_admin_invite"("token_value" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_admin_invite"("token_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_admin_invite"("token_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_admin_invite"("token_value" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."validate_invite_token"("token_value" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_invite_token"("token_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_invite_token"("token_value" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_invite_token"("token_value" "text") TO "anon";
REVOKE ALL ON FUNCTION "public"."validate_invite_token_with_error"("token_value" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_invite_token_with_error"("token_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_invite_token_with_error"("token_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_invite_token_with_error"("token_value" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."validate_signup_invite"("token_value" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_signup_invite"("token_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_signup_invite"("token_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_signup_invite"("token_value" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_storage_upload"("p_bucket_id" "text", "p_file_name" "text", "p_content_type" "text", "p_file_size" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_storage_upload"("p_bucket_id" "text", "p_file_name" "text", "p_content_type" "text", "p_file_size" bigint) TO "service_role";
GRANT ALL ON TABLE "public"."ai_agent_runs" TO "anon";
GRANT ALL ON TABLE "public"."ai_agent_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_agent_runs" TO "service_role";
GRANT ALL ON TABLE "public"."ai_capability_gaps" TO "anon";
GRANT ALL ON TABLE "public"."ai_capability_gaps" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_capability_gaps" TO "service_role";
GRANT ALL ON TABLE "public"."ai_user_feedback" TO "anon";
GRANT ALL ON TABLE "public"."ai_user_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_user_feedback" TO "service_role";
GRANT ALL ON TABLE "public"."ai_feedback_analytics" TO "anon";
GRANT ALL ON TABLE "public"."ai_feedback_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_feedback_analytics" TO "service_role";
GRANT ALL ON TABLE "public"."ai_messages" TO "anon";
GRANT ALL ON TABLE "public"."ai_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_messages" TO "service_role";
GRANT ALL ON TABLE "public"."ai_suggestions" TO "anon";
GRANT ALL ON TABLE "public"."ai_suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_suggestions" TO "service_role";
GRANT ALL ON TABLE "public"."auth_rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."auth_rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_rate_limits" TO "service_role";
GRANT ALL ON TABLE "public"."calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."calendar_events" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_events" TO "service_role";
GRANT ALL ON TABLE "public"."config_option_group_metadata" TO "anon";
GRANT ALL ON TABLE "public"."config_option_group_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."config_option_group_metadata" TO "service_role";
GRANT ALL ON TABLE "public"."config_value_sets" TO "anon";
GRANT ALL ON TABLE "public"."config_value_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."config_value_sets" TO "service_role";
GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";
GRANT ALL ON TABLE "public"."forms" TO "anon";
GRANT ALL ON TABLE "public"."forms" TO "authenticated";
GRANT ALL ON TABLE "public"."forms" TO "service_role";
GRANT ALL ON TABLE "public"."google_oauth_tokens" TO "anon";
GRANT ALL ON TABLE "public"."google_oauth_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."google_oauth_tokens" TO "service_role";
GRANT ALL ON TABLE "public"."integrations" TO "anon";
GRANT ALL ON TABLE "public"."integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."integrations" TO "service_role";
GRANT ALL ON TABLE "public"."invite_token_attempts" TO "anon";
GRANT ALL ON TABLE "public"."invite_token_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."invite_token_attempts" TO "service_role";
GRANT ALL ON TABLE "public"."invite_tokens" TO "anon";
GRANT ALL ON TABLE "public"."invite_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."invite_tokens" TO "service_role";
GRANT ALL ON TABLE "public"."manufacturer_product_domains" TO "anon";
GRANT ALL ON TABLE "public"."manufacturer_product_domains" TO "authenticated";
GRANT ALL ON TABLE "public"."manufacturer_product_domains" TO "service_role";
GRANT ALL ON TABLE "public"."memberships" TO "anon";
GRANT ALL ON TABLE "public"."memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."memberships" TO "service_role";
GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";
GRANT ALL ON TABLE "public"."notification_retry_queue" TO "anon";
GRANT ALL ON TABLE "public"."notification_retry_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_retry_queue" TO "service_role";
GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";
GRANT ALL ON TABLE "public"."organization_creation_log" TO "anon";
GRANT ALL ON TABLE "public"."organization_creation_log" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_creation_log" TO "service_role";
GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";
GRANT ALL ON TABLE "public"."password_reset_audit" TO "anon";
GRANT ALL ON TABLE "public"."password_reset_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."password_reset_audit" TO "service_role";
GRANT ALL ON TABLE "public"."product_domain" TO "anon";
GRANT ALL ON TABLE "public"."product_domain" TO "authenticated";
GRANT ALL ON TABLE "public"."product_domain" TO "service_role";
GRANT ALL ON TABLE "public"."product_line" TO "anon";
GRANT ALL ON TABLE "public"."product_line" TO "authenticated";
GRANT ALL ON TABLE "public"."product_line" TO "service_role";
GRANT ALL ON TABLE "public"."product_manufacturers" TO "anon";
GRANT ALL ON TABLE "public"."product_manufacturers" TO "authenticated";
GRANT ALL ON TABLE "public"."product_manufacturers" TO "service_role";
GRANT ALL ON TABLE "public"."product_models" TO "anon";
GRANT ALL ON TABLE "public"."product_models" TO "authenticated";
GRANT ALL ON TABLE "public"."product_models" TO "service_role";
GRANT ALL ON TABLE "public"."product_series" TO "anon";
GRANT ALL ON TABLE "public"."product_series" TO "authenticated";
GRANT ALL ON TABLE "public"."product_series" TO "service_role";
GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";
GRANT ALL ON SEQUENCE "public"."products_product_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."products_product_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."products_product_number_seq" TO "service_role";
GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT ALL ON TABLE "public"."project_tasks" TO "anon";
GRANT ALL ON TABLE "public"."project_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."project_tasks" TO "service_role";
GRANT ALL ON TABLE "public"."project_workflow_columns" TO "anon";
GRANT ALL ON TABLE "public"."project_workflow_columns" TO "authenticated";
GRANT ALL ON TABLE "public"."project_workflow_columns" TO "service_role";
GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";
GRANT ALL ON TABLE "public"."proposal_approval_requests" TO "anon";
GRANT ALL ON TABLE "public"."proposal_approval_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."proposal_approval_requests" TO "service_role";
GRANT ALL ON TABLE "public"."proposal_documents" TO "anon";
GRANT ALL ON TABLE "public"."proposal_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."proposal_documents" TO "service_role";
GRANT ALL ON TABLE "public"."proposal_signatures" TO "anon";
GRANT ALL ON TABLE "public"."proposal_signatures" TO "authenticated";
GRANT ALL ON TABLE "public"."proposal_signatures" TO "service_role";
GRANT ALL ON TABLE "public"."proposal_signing_activity" TO "anon";
GRANT ALL ON TABLE "public"."proposal_signing_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."proposal_signing_activity" TO "service_role";
GRANT ALL ON TABLE "public"."proposal_signing_tokens" TO "anon";
GRANT ALL ON TABLE "public"."proposal_signing_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."proposal_signing_tokens" TO "service_role";
GRANT ALL ON TABLE "public"."proposal_status_transitions" TO "anon";
GRANT ALL ON TABLE "public"."proposal_status_transitions" TO "authenticated";
GRANT ALL ON TABLE "public"."proposal_status_transitions" TO "service_role";
GRANT ALL ON TABLE "public"."proposals" TO "anon";
GRANT ALL ON TABLE "public"."proposals" TO "authenticated";
GRANT ALL ON TABLE "public"."proposals" TO "service_role";
GRANT ALL ON TABLE "public"."proposals_needing_ai_attention" TO "anon";
GRANT ALL ON TABLE "public"."proposals_needing_ai_attention" TO "authenticated";
GRANT ALL ON TABLE "public"."proposals_needing_ai_attention" TO "service_role";
GRANT ALL ON TABLE "public"."safe_routines" TO "anon";
GRANT ALL ON TABLE "public"."safe_routines" TO "authenticated";
GRANT ALL ON TABLE "public"."safe_routines" TO "service_role";
GRANT ALL ON TABLE "public"."scheduled_notifications" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_notifications" TO "service_role";
GRANT ALL ON TABLE "public"."security_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."security_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."security_audit_log" TO "service_role";
GRANT ALL ON TABLE "public"."security_query_stats" TO "service_role";
GRANT ALL ON TABLE "public"."signup_invites" TO "anon";
GRANT ALL ON TABLE "public"."signup_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."signup_invites" TO "service_role";
GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "service_role";
GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";
GRANT ALL ON TABLE "public"."subscription_seat_usage_events" TO "anon";
GRANT ALL ON TABLE "public"."subscription_seat_usage_events" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_seat_usage_events" TO "service_role";
GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";
GRANT ALL ON TABLE "public"."subscriptions_pending_sync" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions_pending_sync" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions_pending_sync" TO "service_role";
GRANT ALL ON TABLE "public"."task_activities" TO "anon";
GRANT ALL ON TABLE "public"."task_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."task_activities" TO "service_role";
GRANT ALL ON TABLE "public"."task_attachments" TO "anon";
GRANT ALL ON TABLE "public"."task_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_attachments" TO "service_role";
GRANT ALL ON TABLE "public"."task_board_columns" TO "anon";
GRANT ALL ON TABLE "public"."task_board_columns" TO "authenticated";
GRANT ALL ON TABLE "public"."task_board_columns" TO "service_role";
GRANT ALL ON TABLE "public"."task_comments" TO "anon";
GRANT ALL ON TABLE "public"."task_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_comments" TO "service_role";
GRANT ALL ON TABLE "public"."unverified_profiles_to_cleanup" TO "anon";
GRANT ALL ON TABLE "public"."unverified_profiles_to_cleanup" TO "authenticated";
GRANT ALL ON TABLE "public"."unverified_profiles_to_cleanup" TO "service_role";
GRANT ALL ON TABLE "public"."user_onboarding_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_onboarding_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_onboarding_progress" TO "service_role";
GRANT ALL ON TABLE "public"."v_manufacturers_by_domain" TO "anon";
GRANT ALL ON TABLE "public"."v_manufacturers_by_domain" TO "authenticated";
GRANT ALL ON TABLE "public"."v_manufacturers_by_domain" TO "service_role";
GRANT ALL ON TABLE "public"."v_models_by_manufacturer" TO "anon";
GRANT ALL ON TABLE "public"."v_models_by_manufacturer" TO "authenticated";
GRANT ALL ON TABLE "public"."v_models_by_manufacturer" TO "service_role";
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-logos', 'organization-logos', false)
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Admins can upload organization logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos'
  AND is_org_folder_admin((select auth.uid()), (storage.foldername(name))[1])
);
CREATE POLICY "Admins can update organization logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND is_org_folder_admin((select auth.uid()), (storage.foldername(name))[1])
);
CREATE POLICY "Admins can delete organization logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND is_org_folder_admin((select auth.uid()), (storage.foldername(name))[1])
);
CREATE POLICY "Members can view organization logos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND is_active_member((select auth.uid()), ((storage.foldername(name))[1])::uuid)
);
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'cleanup-all-expired-data';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'cleanup-rate-limiting-logs';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'process-due-notifications';
SELECT cron.schedule(
  'cleanup-all-expired-data',
  '0 3 * * *',
  $$SELECT public.cleanup_all_expired_data()$$
);
SELECT cron.schedule(
  'cleanup-rate-limiting-logs',
  '30 3 * * *',
  $$SELECT public.cleanup_all_rate_limiting_logs()$$
);
SELECT cron.schedule(
  'process-due-notifications',
  '*/5 * * * *',
  $$SELECT public.process_all_due_notifications()$$
);
SELECT cron.schedule(
  'process-signature-reminders',
  '30 * * * *',
  $$SELECT public.invoke_signature_reminders_edge_function()$$
);
COMMENT ON COLUMN public.subscriptions.grace_period_end
  IS 'End of grace period after payment failure. Access allowed until this date.';
CREATE OR REPLACE FUNCTION public.update_subscription_is_active() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Set is_active based on stripe_subscription_status
  -- Case-insensitive comparison (Stripe returns lowercase, webhook capitalizes)
  NEW.is_active := LOWER(NEW.stripe_subscription_status) IN ('active', 'trialing');

  -- Grace period: keep is_active=true if grace_period_end is still in the future
  IF NOT NEW.is_active AND NEW.grace_period_end IS NOT NULL AND NEW.grace_period_end > now() THEN
    NEW.is_active := true;
  END IF;

  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.has_valid_subscription(org_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.organization_id = org_id
    AND s.access_blocked = false
    AND (
      -- Normal active access
      (s.is_active = true AND LOWER(s.stripe_subscription_status) IN ('active', 'trialing'))
      OR
      -- Grace period access
      (s.grace_period_end IS NOT NULL AND s.grace_period_end > now())
    )
  );
END;
$$;
COMMENT ON COLUMN public.proposal_signing_tokens.signature_positions
  IS 'Auto-detected signature/date block positions from PDF text scanning. Format: { signature: { pageIndex, x, y, width, height }, date: { pageIndex, x, y, width, height } }';
COMMENT ON COLUMN public.proposal_signing_tokens.unsigned_pdf_hash
  IS 'SHA-256 hash of the unsigned PDF at creation time. Verified before signing to detect tampering.';
COMMENT ON COLUMN public.proposal_signing_tokens.reminder_config
  IS 'Reminder settings. Format: { enabled: boolean, intervalDays: number, maxReminders: number }';
COMMENT ON COLUMN public.proposal_signing_tokens.signature_fallback_mode
  IS 'User-selected fallback placement when auto-detection fails. Values: overlay (bottom of last page), page (separate page), or NULL (use proposal config)';
COMMENT ON COLUMN public.organizations.signing_reminder_defaults
  IS 'Org-level default reminder config for signing requests. Format: { enabled: boolean, intervalDays: number, maxReminders: number }';
ALTER TABLE public.auth_rate_limits
  DROP CONSTRAINT IF EXISTS auth_rate_limits_attempt_type_check;
CREATE OR REPLACE FUNCTION public.invoke_signature_reminders_edge_function() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
  edge_function_url TEXT;
  service_key TEXT;
  request_id BIGINT;
BEGIN
  edge_function_url := 'https://iukfjhzmjgvtxefhhshd.supabase.co/functions/v1/signature-reminders';

  -- Get service_role key from vault
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF service_key IS NULL THEN
    RAISE NOTICE 'No service_role_key in vault, calling without auth header';
    SELECT net.http_post(
      url := edge_function_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{"source": "pg_cron"}'::jsonb
    ) INTO request_id;
  ELSE
    SELECT net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := '{"source": "pg_cron"}'::jsonb
    ) INTO request_id;
  END IF;

  RAISE NOTICE 'Invoked signature-reminders Edge Function, request_id: %', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to invoke signature-reminders Edge Function: %', SQLERRM;
END;
$$;
COMMENT ON FUNCTION public.invoke_signature_reminders_edge_function()
  IS 'Invokes the signature-reminders Edge Function via HTTP to send reminder emails. Called hourly by pg_cron.';
SELECT cron.schedule(
  'process-signature-reminders',
  '30 * * * *',
  $$SELECT public.invoke_signature_reminders_edge_function()$$
);
ALTER TABLE public.quickbooks_desktop_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view QB Desktop connections" ON public.quickbooks_desktop_connections;
CREATE POLICY "Members can view QB Desktop connections"
  ON public.quickbooks_desktop_connections FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));
DROP POLICY IF EXISTS "Owner/Admin can insert QB Desktop connections" ON public.quickbooks_desktop_connections;
CREATE POLICY "Owner/Admin can insert QB Desktop connections"
  ON public.quickbooks_desktop_connections FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
DROP POLICY IF EXISTS "Owner/Admin can update QB Desktop connections" ON public.quickbooks_desktop_connections;
CREATE POLICY "Owner/Admin can update QB Desktop connections"
  ON public.quickbooks_desktop_connections FOR UPDATE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]))
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
DROP POLICY IF EXISTS "Owner/Admin can delete QB Desktop connections" ON public.quickbooks_desktop_connections;
CREATE POLICY "Owner/Admin can delete QB Desktop connections"
  ON public.quickbooks_desktop_connections FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
DROP TRIGGER IF EXISTS set_qbd_connections_updated_at ON public.quickbooks_desktop_connections;
CREATE TRIGGER set_qbd_connections_updated_at
  BEFORE UPDATE ON public.quickbooks_desktop_connections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS sync_qbd_integration_status ON public.quickbooks_desktop_connections;
CREATE TRIGGER sync_qbd_integration_status
  AFTER INSERT OR UPDATE ON public.quickbooks_desktop_connections
  FOR EACH ROW EXECUTE FUNCTION public.sync_integration_status();
ALTER TABLE public.quickbooks_request_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can view QB request queue" ON public.quickbooks_request_queue;
CREATE POLICY "Admin can view QB request queue"
  ON public.quickbooks_request_queue FOR SELECT TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
DROP POLICY IF EXISTS "Admin can insert QB request queue" ON public.quickbooks_request_queue;
CREATE POLICY "Admin can insert QB request queue"
  ON public.quickbooks_request_queue FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
DROP POLICY IF EXISTS "Admin can update QB request queue" ON public.quickbooks_request_queue;
CREATE POLICY "Admin can update QB request queue"
  ON public.quickbooks_request_queue FOR UPDATE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]))
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
ALTER TABLE public.quickbooks_desktop_invoice_sync ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quickbooks_desktop_invoice_sync_all_policy" ON "public"."quickbooks_desktop_invoice_sync";
CREATE POLICY "quickbooks_desktop_invoice_sync_all_policy" ON "public"."quickbooks_desktop_invoice_sync" FOR ALL TO authenticated USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text])) WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
DROP TRIGGER IF EXISTS set_qbd_invoice_sync_updated_at ON public.quickbooks_desktop_invoice_sync;
CREATE TRIGGER set_qbd_invoice_sync_updated_at
  BEFORE UPDATE ON public.quickbooks_desktop_invoice_sync
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.quickbooks_desktop_session_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view QB session logs" ON public.quickbooks_desktop_session_logs;
CREATE POLICY "Members can view QB session logs"
  ON public.quickbooks_desktop_session_logs FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));
ALTER TABLE public.payment_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can view payment jobs" ON public.payment_jobs;
CREATE POLICY "Admin can view payment jobs"
  ON public.payment_jobs FOR SELECT TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
DROP POLICY IF EXISTS "Admin can insert payment jobs" ON public.payment_jobs;
CREATE POLICY "Admin can insert payment jobs"
  ON public.payment_jobs FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
DROP POLICY IF EXISTS "Admin can update payment jobs" ON public.payment_jobs;
CREATE POLICY "Admin can update payment jobs"
  ON public.payment_jobs FOR UPDATE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]))
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
DROP POLICY IF EXISTS "Admin can delete payment jobs" ON public.payment_jobs;
CREATE POLICY "Admin can delete payment jobs"
  ON public.payment_jobs FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
DROP TRIGGER IF EXISTS set_payment_jobs_updated_at ON public.payment_jobs;
CREATE TRIGGER set_payment_jobs_updated_at
  BEFORE UPDATE ON public.payment_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.billing_phases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can view billing phases" ON public.billing_phases;
CREATE POLICY "Admin can view billing phases"
  ON public.billing_phases FOR SELECT TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
DROP POLICY IF EXISTS "Admin can insert billing phases" ON public.billing_phases;
CREATE POLICY "Admin can insert billing phases"
  ON public.billing_phases FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
DROP POLICY IF EXISTS "Admin can update billing phases" ON public.billing_phases;
CREATE POLICY "Admin can update billing phases"
  ON public.billing_phases FOR UPDATE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]))
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
DROP POLICY IF EXISTS "Admin can delete billing phases" ON public.billing_phases;
CREATE POLICY "Admin can delete billing phases"
  ON public.billing_phases FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
DROP TRIGGER IF EXISTS set_billing_phases_updated_at ON public.billing_phases;
CREATE TRIGGER set_billing_phases_updated_at
  BEFORE UPDATE ON public.billing_phases
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.quickbooks_desktop_invoice_sync
  DROP CONSTRAINT IF EXISTS quickbooks_desktop_invoice_sync_proposal_id_key;

-- ============================================================================
-- Back office: cost visibility, RLS, triggers
-- Source: supabase/migrations/20260819100000_companies_vendors.sql
--         supabase/migrations/20260819100001_attachments.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_view_cost(check_user_id uuid, check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  allowed boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.memberships
    WHERE user_id = check_user_id
      AND organization_id = check_org_id
      AND role = ANY(ARRAY['Owner'::text, 'Admin'::text])
      AND status = 'Active'
  ) INTO allowed;
  RETURN allowed;
END;
$$;
ALTER FUNCTION public.can_view_cost(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.can_view_cost(uuid, uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.can_view_cost(uuid, uuid) TO authenticated;
GRANT ALL ON FUNCTION public.can_view_cost(uuid, uuid) TO service_role;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view companies" ON public.companies FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));
CREATE POLICY "Members can insert companies" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));
CREATE POLICY "Members can update companies" ON public.companies FOR UPDATE TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id))
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));
CREATE POLICY "Admin can delete companies" ON public.companies FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
CREATE TRIGGER set_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view vendors" ON public.vendors FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));
CREATE POLICY "Admin can insert vendors" ON public.vendors FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
CREATE POLICY "Admin can update vendors" ON public.vendors FOR UPDATE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]))
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
CREATE POLICY "Admin can delete vendors" ON public.vendors FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
CREATE TRIGGER set_vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.vendor_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cost viewers can view vendor discounts" ON public.vendor_discounts FOR SELECT TO authenticated
  USING (public.can_view_cost((SELECT auth.uid()), organization_id));
CREATE POLICY "Cost viewers can insert vendor discounts" ON public.vendor_discounts FOR INSERT TO authenticated
  WITH CHECK (public.can_view_cost((SELECT auth.uid()), organization_id));
CREATE POLICY "Cost viewers can update vendor discounts" ON public.vendor_discounts FOR UPDATE TO authenticated
  USING (public.can_view_cost((SELECT auth.uid()), organization_id))
  WITH CHECK (public.can_view_cost((SELECT auth.uid()), organization_id));
CREATE POLICY "Cost viewers can delete vendor discounts" ON public.vendor_discounts FOR DELETE TO authenticated
  USING (public.can_view_cost((SELECT auth.uid()), organization_id));
CREATE TRIGGER set_vendor_discounts_updated_at BEFORE UPDATE ON public.vendor_discounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view attachments" ON public.attachments FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));
CREATE POLICY "Members can insert attachments" ON public.attachments FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));
CREATE POLICY "Uploader or admin can update attachments" ON public.attachments FOR UPDATE TO authenticated
  USING (uploaded_by = (SELECT auth.uid())
    OR public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]))
  WITH CHECK (uploaded_by = (SELECT auth.uid())
    OR public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
CREATE POLICY "Uploader or admin can delete attachments" ON public.attachments FOR DELETE TO authenticated
  USING (uploaded_by = (SELECT auth.uid())
    OR public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));
CREATE TRIGGER set_attachments_updated_at BEFORE UPDATE ON public.attachments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

GRANT ALL ON TABLE public.companies TO authenticated;
GRANT ALL ON TABLE public.companies TO service_role;
GRANT ALL ON TABLE public.vendors TO authenticated;
GRANT ALL ON TABLE public.vendors TO service_role;
GRANT ALL ON TABLE public.vendor_discounts TO authenticated;
GRANT ALL ON TABLE public.vendor_discounts TO service_role;
GRANT ALL ON TABLE public.attachments TO authenticated;
GRANT ALL ON TABLE public.attachments TO service_role;
