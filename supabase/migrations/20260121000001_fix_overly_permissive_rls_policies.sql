-- Migration: Fix Overly Permissive RLS Policies
-- Description: Security hardening - change public SELECT policies to require authentication
--
-- CRITICAL: These tables had `FOR SELECT USING (true)` which allows
-- unauthenticated access to business data. This migration restricts
-- access to authenticated users only.

-- =============================================================================
-- STEP 1: Fix Product Configuration Tables
-- =============================================================================

-- pc_option_groups: Product option groups
DROP POLICY IF EXISTS "Allow select for authenticated users" ON pc_option_groups;
DROP POLICY IF EXISTS "Allow all to read pc_option_groups" ON pc_option_groups;
CREATE POLICY "Authenticated users can view option groups"
  ON pc_option_groups FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- pc_option_values: Option values
DROP POLICY IF EXISTS "Allow select for authenticated users" ON pc_option_values;
DROP POLICY IF EXISTS "Allow all to read pc_option_values" ON pc_option_values;
CREATE POLICY "Authenticated users can view option values"
  ON pc_option_values FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- pc_model_options: Model configuration options
DROP POLICY IF EXISTS "Allow select for authenticated users" ON pc_model_options;
DROP POLICY IF EXISTS "Allow all to read pc_model_options" ON pc_model_options;
CREATE POLICY "Authenticated users can view model options"
  ON pc_model_options FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- pc_model_allowed_values: Allowed values per model
DROP POLICY IF EXISTS "Allow select for authenticated users" ON pc_model_allowed_values;
DROP POLICY IF EXISTS "Allow all to read pc_model_allowed_values" ON pc_model_allowed_values;
CREATE POLICY "Authenticated users can view allowed values"
  ON pc_model_allowed_values FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- pc_rules: Business/pricing rules (CRITICAL - these should be protected)
DROP POLICY IF EXISTS "Allow select for authenticated users" ON pc_rules;
DROP POLICY IF EXISTS "Allow all to read pc_rules" ON pc_rules;
CREATE POLICY "Authenticated users can view rules"
  ON pc_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- pc_variant_option_overrides: Override configurations
DROP POLICY IF EXISTS "Allow select for authenticated users" ON pc_variant_option_overrides;
DROP POLICY IF EXISTS "Allow all to read pc_variant_option_overrides" ON pc_variant_option_overrides;
CREATE POLICY "Authenticated users can view variant overrides"
  ON pc_variant_option_overrides FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- STEP 2: Fix Product Catalog Tables
-- =============================================================================

-- product_variants: Product variant information
DROP POLICY IF EXISTS "Allow all to read product_variants" ON product_variants;
DROP POLICY IF EXISTS "product_variants_select_policy" ON product_variants;
CREATE POLICY "Authenticated users can view product variants"
  ON product_variants FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- manufacturer_product_domains: Manufacturer relationships
DROP POLICY IF EXISTS "Allow all to read manufacturer_product_domains" ON manufacturer_product_domains;
DROP POLICY IF EXISTS "manufacturer_product_domains_select_policy" ON manufacturer_product_domains;
CREATE POLICY "Authenticated users can view manufacturer domains"
  ON manufacturer_product_domains FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- product_line: Product lines/categories
DROP POLICY IF EXISTS "Allow all to read product_line" ON product_line;
DROP POLICY IF EXISTS "product_line_select_policy" ON product_line;
CREATE POLICY "Authenticated users can view product lines"
  ON product_line FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- STEP 3: Fix INSERT/UPDATE/DELETE policies to require proper role
-- Replace auth.role() checks with proper organization membership
-- =============================================================================

-- pc_option_groups: Only admins/owners can modify
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON pc_option_groups;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON pc_option_groups;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON pc_option_groups;

-- Note: These tables don't have organization_id, so we restrict to admin role
-- In production, consider adding organization_id for multi-tenant access control
CREATE POLICY "Service role can insert option groups"
  ON pc_option_groups FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can update option groups"
  ON pc_option_groups FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can delete option groups"
  ON pc_option_groups FOR DELETE
  USING (auth.jwt() ->> 'role' = 'service_role');

-- pc_option_values: Only service role can modify
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON pc_option_values;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON pc_option_values;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON pc_option_values;

CREATE POLICY "Service role can insert option values"
  ON pc_option_values FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can update option values"
  ON pc_option_values FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can delete option values"
  ON pc_option_values FOR DELETE
  USING (auth.jwt() ->> 'role' = 'service_role');

-- pc_rules: Only service role can modify (business rules are sensitive)
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON pc_rules;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON pc_rules;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON pc_rules;

CREATE POLICY "Service role can insert rules"
  ON pc_rules FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can update rules"
  ON pc_rules FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can delete rules"
  ON pc_rules FOR DELETE
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================================
-- STEP 4: Add comments documenting the security changes
-- =============================================================================

COMMENT ON POLICY "Authenticated users can view option groups" ON pc_option_groups IS
  'Security fix: Changed from USING(true) to require authentication. Prevents unauthenticated access to product configuration.';

COMMENT ON POLICY "Authenticated users can view rules" ON pc_rules IS
  'Security fix: Changed from USING(true) to require authentication. Business rules should never be publicly accessible.';

COMMENT ON POLICY "Service role can insert rules" ON pc_rules IS
  'Security: Only service role can modify business rules. Prevents unauthorized changes to pricing logic.';
