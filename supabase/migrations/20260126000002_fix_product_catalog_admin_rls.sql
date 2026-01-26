-- Migration: Fix Product Catalog Admin RLS
-- Description: Allow authenticated users to manage product catalog tables from admin panel
--
-- The previous migration restricted writes to service_role only, but the admin panel
-- runs on the frontend with the anon key. This update allows authenticated users
-- to perform CRUD operations on these reference/catalog tables.

-- =============================================================================
-- STEP 0: Add missing columns
-- =============================================================================

-- Add logo_url to product_manufacturers if missing
ALTER TABLE product_manufacturers
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- =============================================================================
-- manufacturer_product_domains - Junction table
-- =============================================================================

DROP POLICY IF EXISTS "Service role can insert manufacturer domains" ON manufacturer_product_domains;
DROP POLICY IF EXISTS "Service role can update manufacturer domains" ON manufacturer_product_domains;
DROP POLICY IF EXISTS "Service role can delete manufacturer domains" ON manufacturer_product_domains;

CREATE POLICY "Authenticated users can insert manufacturer domains"
  ON manufacturer_product_domains FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update manufacturer domains"
  ON manufacturer_product_domains FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete manufacturer domains"
  ON manufacturer_product_domains FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================================
-- product_manufacturers
-- =============================================================================

DROP POLICY IF EXISTS "Service role can insert product manufacturers" ON product_manufacturers;
DROP POLICY IF EXISTS "Service role can update product manufacturers" ON product_manufacturers;
DROP POLICY IF EXISTS "Service role can delete product manufacturers" ON product_manufacturers;

CREATE POLICY "Authenticated users can insert product manufacturers"
  ON product_manufacturers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product manufacturers"
  ON product_manufacturers FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete product manufacturers"
  ON product_manufacturers FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================================
-- product_domain
-- =============================================================================

DROP POLICY IF EXISTS "Service role can insert product domains" ON product_domain;
DROP POLICY IF EXISTS "Service role can update product domains" ON product_domain;
DROP POLICY IF EXISTS "Service role can delete product domains" ON product_domain;

CREATE POLICY "Authenticated users can insert product domains"
  ON product_domain FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product domains"
  ON product_domain FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete product domains"
  ON product_domain FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================================
-- product_line
-- =============================================================================

DROP POLICY IF EXISTS "Service role can insert product lines" ON product_line;
DROP POLICY IF EXISTS "Service role can update product lines" ON product_line;
DROP POLICY IF EXISTS "Service role can delete product lines" ON product_line;

CREATE POLICY "Authenticated users can insert product lines"
  ON product_line FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product lines"
  ON product_line FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete product lines"
  ON product_line FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================================
-- product_series
-- =============================================================================

DROP POLICY IF EXISTS "Service role can insert product series" ON product_series;
DROP POLICY IF EXISTS "Service role can update product series" ON product_series;
DROP POLICY IF EXISTS "Service role can delete product series" ON product_series;

CREATE POLICY "Authenticated users can insert product series"
  ON product_series FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product series"
  ON product_series FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete product series"
  ON product_series FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================================
-- product_models
-- =============================================================================

DROP POLICY IF EXISTS "Service role can insert product models" ON product_models;
DROP POLICY IF EXISTS "Service role can update product models" ON product_models;
DROP POLICY IF EXISTS "Service role can delete product models" ON product_models;

CREATE POLICY "Authenticated users can insert product models"
  ON product_models FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product models"
  ON product_models FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete product models"
  ON product_models FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================================
-- product_variants
-- =============================================================================

DROP POLICY IF EXISTS "Service role can insert product variants" ON product_variants;
DROP POLICY IF EXISTS "Service role can update product variants" ON product_variants;
DROP POLICY IF EXISTS "Service role can delete product variants" ON product_variants;

CREATE POLICY "Authenticated users can insert product variants"
  ON product_variants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product variants"
  ON product_variants FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete product variants"
  ON product_variants FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================================
-- config_value_sets (for the new config schema system)
-- =============================================================================

-- First ensure RLS is enabled and basic SELECT exists
ALTER TABLE IF EXISTS config_value_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read config value sets" ON config_value_sets;
DROP POLICY IF EXISTS "Authenticated users can insert config value sets" ON config_value_sets;
DROP POLICY IF EXISTS "Authenticated users can update config value sets" ON config_value_sets;
DROP POLICY IF EXISTS "Authenticated users can delete config value sets" ON config_value_sets;

CREATE POLICY "Anyone can read config value sets"
  ON config_value_sets FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert config value sets"
  ON config_value_sets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update config value sets"
  ON config_value_sets FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete config value sets"
  ON config_value_sets FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================================
-- pc_* tables (legacy product configurator tables)
-- =============================================================================

-- pc_option_groups
DROP POLICY IF EXISTS "Service role can insert option groups" ON pc_option_groups;
DROP POLICY IF EXISTS "Service role can update option groups" ON pc_option_groups;
DROP POLICY IF EXISTS "Service role can delete option groups" ON pc_option_groups;

CREATE POLICY "Authenticated users can insert option groups"
  ON pc_option_groups FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update option groups"
  ON pc_option_groups FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete option groups"
  ON pc_option_groups FOR DELETE
  TO authenticated
  USING (true);

-- pc_option_values
DROP POLICY IF EXISTS "Service role can insert option values" ON pc_option_values;
DROP POLICY IF EXISTS "Service role can update option values" ON pc_option_values;
DROP POLICY IF EXISTS "Service role can delete option values" ON pc_option_values;

CREATE POLICY "Authenticated users can insert option values"
  ON pc_option_values FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update option values"
  ON pc_option_values FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete option values"
  ON pc_option_values FOR DELETE
  TO authenticated
  USING (true);

-- pc_model_options
DROP POLICY IF EXISTS "Service role can insert model options" ON pc_model_options;
DROP POLICY IF EXISTS "Service role can update model options" ON pc_model_options;
DROP POLICY IF EXISTS "Service role can delete model options" ON pc_model_options;

CREATE POLICY "Authenticated users can insert model options"
  ON pc_model_options FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update model options"
  ON pc_model_options FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete model options"
  ON pc_model_options FOR DELETE
  TO authenticated
  USING (true);

-- pc_model_allowed_values
DROP POLICY IF EXISTS "Service role can insert allowed values" ON pc_model_allowed_values;
DROP POLICY IF EXISTS "Service role can update allowed values" ON pc_model_allowed_values;
DROP POLICY IF EXISTS "Service role can delete allowed values" ON pc_model_allowed_values;

CREATE POLICY "Authenticated users can insert allowed values"
  ON pc_model_allowed_values FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update allowed values"
  ON pc_model_allowed_values FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete allowed values"
  ON pc_model_allowed_values FOR DELETE
  TO authenticated
  USING (true);

-- pc_rules
DROP POLICY IF EXISTS "Service role can insert rules" ON pc_rules;
DROP POLICY IF EXISTS "Service role can update rules" ON pc_rules;
DROP POLICY IF EXISTS "Service role can delete rules" ON pc_rules;

CREATE POLICY "Authenticated users can insert rules"
  ON pc_rules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update rules"
  ON pc_rules FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete rules"
  ON pc_rules FOR DELETE
  TO authenticated
  USING (true);

-- pc_variant_option_overrides
DROP POLICY IF EXISTS "Service role can insert variant overrides" ON pc_variant_option_overrides;
DROP POLICY IF EXISTS "Service role can update variant overrides" ON pc_variant_option_overrides;
DROP POLICY IF EXISTS "Service role can delete variant overrides" ON pc_variant_option_overrides;

CREATE POLICY "Authenticated users can insert variant overrides"
  ON pc_variant_option_overrides FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update variant overrides"
  ON pc_variant_option_overrides FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete variant overrides"
  ON pc_variant_option_overrides FOR DELETE
  TO authenticated
  USING (true);
