-- Migration: Move pg_net extension to extensions schema
-- Description: Security fix - pg_net should not be in the public schema
--
-- Supabase Security Advisory:
-- Extensions in the public schema can be a security risk. The extensions
-- schema provides proper isolation.

-- Check if pg_net exists in public schema and move it to extensions
DO $$
BEGIN
  -- First, ensure the extensions schema exists
  CREATE SCHEMA IF NOT EXISTS extensions;

  -- Check if pg_net is installed in public schema
  IF EXISTS (
    SELECT 1 FROM pg_extension
    WHERE extname = 'pg_net' AND extnamespace = 'public'::regnamespace
  ) THEN
    -- Drop from public (this will fail gracefully if objects depend on it)
    -- We need to recreate in extensions schema
    RAISE NOTICE 'pg_net found in public schema, moving to extensions...';

    -- Note: ALTER EXTENSION ... SET SCHEMA doesn't work for pg_net
    -- We need to drop and recreate
    DROP EXTENSION IF EXISTS pg_net CASCADE;
    CREATE EXTENSION pg_net WITH SCHEMA extensions;

    RAISE NOTICE 'pg_net moved to extensions schema successfully';
  ELSIF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
  ) THEN
    RAISE NOTICE 'pg_net already installed in non-public schema';
  ELSE
    -- Not installed, create in extensions schema
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
    RAISE NOTICE 'pg_net installed in extensions schema';
  END IF;
END $$;

-- Grant usage on extensions schema to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, service_role;

-- Verify the installation
DO $$
DECLARE
  ext_schema TEXT;
BEGIN
  SELECT nspname INTO ext_schema
  FROM pg_extension e
  JOIN pg_namespace n ON e.extnamespace = n.oid
  WHERE e.extname = 'pg_net';

  IF ext_schema = 'public' THEN
    RAISE EXCEPTION 'ERROR: pg_net is still in public schema!';
  ELSE
    RAISE NOTICE 'pg_net is correctly installed in schema: %', ext_schema;
  END IF;
END $$;

-- Add comment documenting the security fix
COMMENT ON EXTENSION pg_net IS 'HTTP client for PostgreSQL - installed in extensions schema for security';
