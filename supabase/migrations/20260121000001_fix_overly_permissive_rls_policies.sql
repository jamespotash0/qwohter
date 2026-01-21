-- Migration: Fix Overly Permissive RLS Policies
-- Description: Security hardening for product configuration tables
--
-- NOTE: The pc_* tables are READ-ONLY reference/configuration data that needs
-- to be publicly readable for the product configurator to work. Users don't
-- add to these tables - only admins via admin panel or direct backend access.
--
-- Strategy:
-- - SELECT: Keep USING (true) for read access (intentional - reference data)
-- - INSERT/UPDATE/DELETE: Restrict to service_role only (admin operations)

-- =============================================================================
-- STEP 1: Ensure pc_ tables have proper write restrictions
-- These tables should only be modified by admins via service_role
-- =============================================================================

-- pc_option_groups: Only service role can modify
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON pc_option_groups;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON pc_option_groups;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON pc_option_groups;
DROP POLICY IF EXISTS "Anyone can read option groups" ON pc_option_groups;
DROP POLICY IF EXISTS "Service role can insert option groups" ON pc_option_groups;
DROP POLICY IF EXISTS "Service role can update option groups" ON pc_option_groups;
DROP POLICY IF EXISTS "Service role can delete option groups" ON pc_option_groups;
-- Drop old naming convention policies
DROP POLICY IF EXISTS "pc_option_groups_insert" ON pc_option_groups;
DROP POLICY IF EXISTS "pc_option_groups_update" ON pc_option_groups;
DROP POLICY IF EXISTS "pc_option_groups_delete" ON pc_option_groups;
DROP POLICY IF EXISTS "pc_option_groups_select" ON pc_option_groups;

-- Ensure SELECT is allowed for all users (reference data)
CREATE POLICY "Anyone can read option groups"
  ON pc_option_groups FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert option groups"
  ON pc_option_groups FOR INSERT
  WITH CHECK ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can update option groups"
  ON pc_option_groups FOR UPDATE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can delete option groups"
  ON pc_option_groups FOR DELETE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

-- pc_option_values: Only service role can modify
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON pc_option_values;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON pc_option_values;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON pc_option_values;
DROP POLICY IF EXISTS "Anyone can read option values" ON pc_option_values;
DROP POLICY IF EXISTS "Service role can insert option values" ON pc_option_values;
DROP POLICY IF EXISTS "Service role can update option values" ON pc_option_values;
DROP POLICY IF EXISTS "Service role can delete option values" ON pc_option_values;
-- Drop old naming convention policies
DROP POLICY IF EXISTS "pc_option_values_insert" ON pc_option_values;
DROP POLICY IF EXISTS "pc_option_values_update" ON pc_option_values;
DROP POLICY IF EXISTS "pc_option_values_delete" ON pc_option_values;
DROP POLICY IF EXISTS "pc_option_values_select" ON pc_option_values;

CREATE POLICY "Anyone can read option values"
  ON pc_option_values FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert option values"
  ON pc_option_values FOR INSERT
  WITH CHECK ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can update option values"
  ON pc_option_values FOR UPDATE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can delete option values"
  ON pc_option_values FOR DELETE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

-- pc_model_options: Only service role can modify
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON pc_model_options;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON pc_model_options;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON pc_model_options;
DROP POLICY IF EXISTS "Anyone can read model options" ON pc_model_options;
DROP POLICY IF EXISTS "Service role can insert model options" ON pc_model_options;
DROP POLICY IF EXISTS "Service role can update model options" ON pc_model_options;
DROP POLICY IF EXISTS "Service role can delete model options" ON pc_model_options;
-- Drop old naming convention policies
DROP POLICY IF EXISTS "pc_model_options_insert" ON pc_model_options;
DROP POLICY IF EXISTS "pc_model_options_update" ON pc_model_options;
DROP POLICY IF EXISTS "pc_model_options_delete" ON pc_model_options;
DROP POLICY IF EXISTS "pc_model_options_select" ON pc_model_options;

CREATE POLICY "Anyone can read model options"
  ON pc_model_options FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert model options"
  ON pc_model_options FOR INSERT
  WITH CHECK ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can update model options"
  ON pc_model_options FOR UPDATE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can delete model options"
  ON pc_model_options FOR DELETE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

-- pc_model_allowed_values: Only service role can modify
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON pc_model_allowed_values;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON pc_model_allowed_values;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON pc_model_allowed_values;
DROP POLICY IF EXISTS "Anyone can read model allowed values" ON pc_model_allowed_values;
DROP POLICY IF EXISTS "Service role can insert allowed values" ON pc_model_allowed_values;
DROP POLICY IF EXISTS "Service role can update allowed values" ON pc_model_allowed_values;
DROP POLICY IF EXISTS "Service role can delete allowed values" ON pc_model_allowed_values;
-- Drop old naming convention policies
DROP POLICY IF EXISTS "pc_model_allowed_values_insert" ON pc_model_allowed_values;
DROP POLICY IF EXISTS "pc_model_allowed_values_update" ON pc_model_allowed_values;
DROP POLICY IF EXISTS "pc_model_allowed_values_delete" ON pc_model_allowed_values;
DROP POLICY IF EXISTS "pc_model_allowed_values_select" ON pc_model_allowed_values;

CREATE POLICY "Anyone can read model allowed values"
  ON pc_model_allowed_values FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert allowed values"
  ON pc_model_allowed_values FOR INSERT
  WITH CHECK ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can update allowed values"
  ON pc_model_allowed_values FOR UPDATE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can delete allowed values"
  ON pc_model_allowed_values FOR DELETE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

-- pc_rules: Only service role can modify (business rules are sensitive)
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON pc_rules;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON pc_rules;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON pc_rules;
DROP POLICY IF EXISTS "Anyone can read rules" ON pc_rules;
DROP POLICY IF EXISTS "Service role can insert rules" ON pc_rules;
DROP POLICY IF EXISTS "Service role can update rules" ON pc_rules;
DROP POLICY IF EXISTS "Service role can delete rules" ON pc_rules;
-- Drop old naming convention policies
DROP POLICY IF EXISTS "pc_rules_insert" ON pc_rules;
DROP POLICY IF EXISTS "pc_rules_update" ON pc_rules;
DROP POLICY IF EXISTS "pc_rules_delete" ON pc_rules;
DROP POLICY IF EXISTS "pc_rules_select" ON pc_rules;

CREATE POLICY "Anyone can read rules"
  ON pc_rules FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert rules"
  ON pc_rules FOR INSERT
  WITH CHECK ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can update rules"
  ON pc_rules FOR UPDATE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can delete rules"
  ON pc_rules FOR DELETE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

-- pc_variant_option_overrides: Only service role can modify
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON pc_variant_option_overrides;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON pc_variant_option_overrides;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON pc_variant_option_overrides;
DROP POLICY IF EXISTS "Anyone can read variant overrides" ON pc_variant_option_overrides;
DROP POLICY IF EXISTS "Service role can insert variant overrides" ON pc_variant_option_overrides;
DROP POLICY IF EXISTS "Service role can update variant overrides" ON pc_variant_option_overrides;
DROP POLICY IF EXISTS "Service role can delete variant overrides" ON pc_variant_option_overrides;
-- Drop old naming convention policies
DROP POLICY IF EXISTS "pc_variant_option_overrides_insert" ON pc_variant_option_overrides;
DROP POLICY IF EXISTS "pc_variant_option_overrides_update" ON pc_variant_option_overrides;
DROP POLICY IF EXISTS "pc_variant_option_overrides_delete" ON pc_variant_option_overrides;
DROP POLICY IF EXISTS "pc_variant_option_overrides_select" ON pc_variant_option_overrides;

CREATE POLICY "Anyone can read variant overrides"
  ON pc_variant_option_overrides FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert variant overrides"
  ON pc_variant_option_overrides FOR INSERT
  WITH CHECK ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can update variant overrides"
  ON pc_variant_option_overrides FOR UPDATE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can delete variant overrides"
  ON pc_variant_option_overrides FOR DELETE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

-- =============================================================================
-- STEP 2: Restrict write access on product catalog tables
-- =============================================================================

-- product_variants: Only service role can modify
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON product_variants;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON product_variants;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON product_variants;
DROP POLICY IF EXISTS "Anyone can read product variants" ON product_variants;
DROP POLICY IF EXISTS "Service role can insert product variants" ON product_variants;
DROP POLICY IF EXISTS "Service role can update product variants" ON product_variants;
DROP POLICY IF EXISTS "Service role can delete product variants" ON product_variants;
-- Drop old naming convention policies
DROP POLICY IF EXISTS "product_variants_insert" ON product_variants;
DROP POLICY IF EXISTS "product_variants_update" ON product_variants;
DROP POLICY IF EXISTS "product_variants_delete" ON product_variants;
DROP POLICY IF EXISTS "product_variants_select" ON product_variants;

CREATE POLICY "Anyone can read product variants"
  ON product_variants FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert product variants"
  ON product_variants FOR INSERT
  WITH CHECK ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can update product variants"
  ON product_variants FOR UPDATE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can delete product variants"
  ON product_variants FOR DELETE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

-- manufacturer_product_domains: Only service role can modify
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON manufacturer_product_domains;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON manufacturer_product_domains;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON manufacturer_product_domains;
DROP POLICY IF EXISTS "Anyone can read manufacturer domains" ON manufacturer_product_domains;
DROP POLICY IF EXISTS "Service role can insert manufacturer domains" ON manufacturer_product_domains;
DROP POLICY IF EXISTS "Service role can update manufacturer domains" ON manufacturer_product_domains;
DROP POLICY IF EXISTS "Service role can delete manufacturer domains" ON manufacturer_product_domains;
-- Drop old naming convention policies
DROP POLICY IF EXISTS "manufacturer_product_domains_insert" ON manufacturer_product_domains;
DROP POLICY IF EXISTS "manufacturer_product_domains_update" ON manufacturer_product_domains;
DROP POLICY IF EXISTS "manufacturer_product_domains_delete" ON manufacturer_product_domains;
DROP POLICY IF EXISTS "manufacturer_product_domains_select" ON manufacturer_product_domains;

CREATE POLICY "Anyone can read manufacturer domains"
  ON manufacturer_product_domains FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert manufacturer domains"
  ON manufacturer_product_domains FOR INSERT
  WITH CHECK ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can update manufacturer domains"
  ON manufacturer_product_domains FOR UPDATE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can delete manufacturer domains"
  ON manufacturer_product_domains FOR DELETE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

-- product_line: Only service role can modify
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON product_line;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON product_line;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON product_line;
DROP POLICY IF EXISTS "Anyone can read product lines" ON product_line;
DROP POLICY IF EXISTS "Service role can insert product lines" ON product_line;
DROP POLICY IF EXISTS "Service role can update product lines" ON product_line;
DROP POLICY IF EXISTS "Service role can delete product lines" ON product_line;
-- Drop old naming convention policies
DROP POLICY IF EXISTS "product_line_insert" ON product_line;
DROP POLICY IF EXISTS "product_line_update" ON product_line;
DROP POLICY IF EXISTS "product_line_delete" ON product_line;
DROP POLICY IF EXISTS "product_line_select" ON product_line;

CREATE POLICY "Anyone can read product lines"
  ON product_line FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert product lines"
  ON product_line FOR INSERT
  WITH CHECK ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can update product lines"
  ON product_line FOR UPDATE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can delete product lines"
  ON product_line FOR DELETE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

-- =============================================================================
-- STEP 3: Add comments documenting the security design
-- =============================================================================

COMMENT ON POLICY "Service role can insert rules" ON pc_rules IS
  'Security: Only service role (admin backend) can modify business rules. Users cannot add/modify pricing logic.';

COMMENT ON POLICY "Service role can insert option groups" ON pc_option_groups IS
  'Security: Product configuration is admin-managed. SELECT is public (reference data), but writes require service_role.';
