-- Security Functions for Qwohter
-- These functions provide secure server-side access control

-- Function to get organization code for authenticated user
-- Only admins and owners can access organization codes
CREATE OR REPLACE FUNCTION get_organization_code_for_user(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_org_id uuid;
  user_role text;
  org_code text;
BEGIN
  -- Get user's organization and role
  SELECT organization_id, role 
  INTO user_org_id, user_role
  FROM profiles 
  WHERE id = user_id;

  -- Check if user exists and has organization
  IF user_org_id IS NULL THEN
    RAISE EXCEPTION 'User not found or not assigned to organization';
  END IF;

  -- Check if user has admin privileges
  IF user_role NOT IN ('admin', 'owner') THEN
    RAISE EXCEPTION 'Access denied: insufficient privileges';
  END IF;

  -- Get organization code
  SELECT organization_code 
  INTO org_code
  FROM organizations 
  WHERE id = user_org_id;

  RETURN org_code;
END;
$$;

-- Function to validate user access to quote
CREATE OR REPLACE FUNCTION user_can_access_quote(quote_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  quote_org_id uuid;
  user_org_id uuid;
BEGIN
  -- Get quote's organization
  SELECT organization_id INTO quote_org_id
  FROM quotes WHERE id = quote_id;

  -- Get user's organization
  SELECT organization_id INTO user_org_id
  FROM profiles WHERE id = user_id;

  -- Check if both exist and match
  RETURN quote_org_id IS NOT NULL 
    AND user_org_id IS NOT NULL 
    AND quote_org_id = user_org_id;
END;
$$;

-- Function to validate user admin access to organization
CREATE OR REPLACE FUNCTION user_has_admin_access(user_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  user_org_id uuid;
BEGIN
  SELECT role, organization_id 
  INTO user_role, user_org_id
  FROM profiles 
  WHERE id = user_id AND status = 'active';

  RETURN user_org_id = org_id 
    AND user_role IN ('admin', 'owner');
END;
$$;

-- Function to sanitize and validate input data
CREATE OR REPLACE FUNCTION validate_quote_data(quote_data jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check for required fields
  IF NOT (quote_data ? 'quote_name') THEN
    RAISE EXCEPTION 'Missing required field: quote_name';
  END IF;

  -- Validate quote_name length and content
  IF length(quote_data->>'quote_name') > 255 THEN
    RAISE EXCEPTION 'Quote name too long (max 255 characters)';
  END IF;

  -- Check for malicious content in quote_name
  IF quote_data->>'quote_name' ~* '<script|javascript:|on\w+=' THEN
    RAISE EXCEPTION 'Invalid characters in quote name';
  END IF;

  -- Validate wall_details structure if present
  IF quote_data ? 'wall_details' THEN
    -- Ensure wall_details is an object
    IF jsonb_typeof(quote_data->'wall_details') != 'object' THEN
      RAISE EXCEPTION 'wall_details must be an object';
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- Function to create audit log for sensitive operations
CREATE OR REPLACE FUNCTION log_admin_action(
  admin_id uuid,
  action_type text,
  target_id uuid,
  details jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only log if user has admin privileges
  IF NOT user_has_admin_access(admin_id, (
    SELECT organization_id FROM profiles WHERE id = admin_id
  )) THEN
    RAISE EXCEPTION 'Unauthorized audit log attempt';
  END IF;

  -- Insert audit log (assuming audit_logs table exists)
  -- This would need to be created as part of the schema
  INSERT INTO audit_logs (
    admin_id,
    action_type,
    target_id,
    details,
    created_at
  ) VALUES (
    admin_id,
    action_type,
    target_id,
    details,
    now()
  );
EXCEPTION
  WHEN undefined_table THEN
    -- Audit table doesn't exist yet, just log to system
    RAISE NOTICE 'Audit: Admin % performed % on %', admin_id, action_type, target_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_organization_code_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_can_access_quote(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_admin_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_quote_data(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action(uuid, text, uuid, jsonb) TO authenticated;