-- ============================================================================
-- EXPORT ALL RLS POLICIES FROM PRODUCTION
-- ============================================================================
-- Run this in PRODUCTION Supabase SQL Editor
-- Copy the output and save to a file, then run in STAGING
-- ============================================================================

-- Enable RLS on all tables first (run this in STAGING after copying policies)
SELECT
  'ALTER TABLE ' || schemaname || '.' || tablename || ' ENABLE ROW LEVEL SECURITY;'
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Get all RLS policy definitions
SELECT
  E'\n-- Table: ' || tablename || E'\n' ||
  E'-- Policy: ' || policyname || E'\n' ||
  'CREATE POLICY ' || quote_ident(policyname) || E'\n' ||
  '  ON ' || schemaname || '.' || tablename || E'\n' ||
  '  AS ' ||
  CASE
    WHEN permissive = 'PERMISSIVE' THEN 'PERMISSIVE'
    ELSE 'RESTRICTIVE'
  END || E'\n' ||
  '  FOR ' || cmd || E'\n' ||
  '  TO ' ||
  CASE
    WHEN roles = '{public}' THEN 'public'
    ELSE array_to_string(roles, ', ')
  END || E'\n' ||
  CASE
    WHEN qual IS NOT NULL THEN '  USING (' || qual || ')' || E'\n'
    ELSE ''
  END ||
  CASE
    WHEN with_check IS NOT NULL THEN '  WITH CHECK (' || with_check || ')' || E'\n'
    ELSE ''
  END ||
  ';' || E'\n'
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- VERIFICATION: Check which tables have RLS enabled
-- ============================================================================

-- Run this to verify RLS is enabled on tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- COUNT POLICIES PER TABLE
-- ============================================================================

-- Quick overview of how many policies each table has
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
