-- Migration: Add RLS Policies for Product Catalog Tables
-- Description: Ensure product catalog tables have proper RLS with public read access
--
-- These tables are READ-ONLY reference/configuration data.
-- Users need SELECT access to browse products in the configurator.
-- Only admins via service_role can modify (INSERT/UPDATE/DELETE).

-- =============================================================================
-- product_domain
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can read product domains" ON product_domain;
DROP POLICY IF EXISTS "Service role can insert product domains" ON product_domain;
DROP POLICY IF EXISTS "Service role can update product domains" ON product_domain;
DROP POLICY IF EXISTS "Service role can delete product domains" ON product_domain;
-- Drop old naming convention policies
DROP POLICY IF EXISTS "product_domain_select" ON product_domain;
DROP POLICY IF EXISTS "product_domain_insert" ON product_domain;
DROP POLICY IF EXISTS "product_domain_update" ON product_domain;
DROP POLICY IF EXISTS "product_domain_delete" ON product_domain;

CREATE POLICY "Anyone can read product domains"
  ON product_domain FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert product domains"
  ON product_domain FOR INSERT
  WITH CHECK ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can update product domains"
  ON product_domain FOR UPDATE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can delete product domains"
  ON product_domain FOR DELETE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

-- =============================================================================
-- product_manufacturers
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can read product manufacturers" ON product_manufacturers;
DROP POLICY IF EXISTS "Service role can insert product manufacturers" ON product_manufacturers;
DROP POLICY IF EXISTS "Service role can update product manufacturers" ON product_manufacturers;
DROP POLICY IF EXISTS "Service role can delete product manufacturers" ON product_manufacturers;
-- Drop old naming convention policies
DROP POLICY IF EXISTS "product_manufacturers_select" ON product_manufacturers;
DROP POLICY IF EXISTS "product_manufacturers_insert" ON product_manufacturers;
DROP POLICY IF EXISTS "product_manufacturers_update" ON product_manufacturers;
DROP POLICY IF EXISTS "product_manufacturers_delete" ON product_manufacturers;

CREATE POLICY "Anyone can read product manufacturers"
  ON product_manufacturers FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert product manufacturers"
  ON product_manufacturers FOR INSERT
  WITH CHECK ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can update product manufacturers"
  ON product_manufacturers FOR UPDATE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can delete product manufacturers"
  ON product_manufacturers FOR DELETE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

-- =============================================================================
-- product_models
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can read product models" ON product_models;
DROP POLICY IF EXISTS "Service role can insert product models" ON product_models;
DROP POLICY IF EXISTS "Service role can update product models" ON product_models;
DROP POLICY IF EXISTS "Service role can delete product models" ON product_models;
-- Drop old naming convention policies
DROP POLICY IF EXISTS "product_models_select" ON product_models;
DROP POLICY IF EXISTS "product_models_insert" ON product_models;
DROP POLICY IF EXISTS "product_models_update" ON product_models;
DROP POLICY IF EXISTS "product_models_delete" ON product_models;

CREATE POLICY "Anyone can read product models"
  ON product_models FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert product models"
  ON product_models FOR INSERT
  WITH CHECK ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can update product models"
  ON product_models FOR UPDATE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can delete product models"
  ON product_models FOR DELETE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

-- =============================================================================
-- product_series
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can read product series" ON product_series;
DROP POLICY IF EXISTS "Service role can insert product series" ON product_series;
DROP POLICY IF EXISTS "Service role can update product series" ON product_series;
DROP POLICY IF EXISTS "Service role can delete product series" ON product_series;
-- Drop old naming convention policies
DROP POLICY IF EXISTS "product_series_select" ON product_series;
DROP POLICY IF EXISTS "product_series_insert" ON product_series;
DROP POLICY IF EXISTS "product_series_update" ON product_series;
DROP POLICY IF EXISTS "product_series_delete" ON product_series;

CREATE POLICY "Anyone can read product series"
  ON product_series FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert product series"
  ON product_series FOR INSERT
  WITH CHECK ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can update product series"
  ON product_series FOR UPDATE
  USING ((select auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can delete product series"
  ON product_series FOR DELETE
  USING ((select auth.jwt() ->> 'role') = 'service_role');
