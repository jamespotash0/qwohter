-- Migration: Restrict Product Catalog Tables to Super Admin
-- Description: Only super_admin users can INSERT/UPDATE/DELETE product catalog tables
--              Any authenticated user can SELECT (read)
--
-- Tables affected:
-- - config_value_sets
-- - manufacturer_product_domains
-- - product_domain
-- - product_line
-- - product_manufacturers
-- - product_models
-- - product_series

-- =============================================================================
-- HELPER FUNCTION: Check if current user is super_admin
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- =============================================================================
-- config_value_sets
-- =============================================================================

-- Drop existing write policies
DROP POLICY IF EXISTS "Authenticated users can insert config value sets" ON config_value_sets;
DROP POLICY IF EXISTS "Authenticated users can update config value sets" ON config_value_sets;
DROP POLICY IF EXISTS "Authenticated users can delete config value sets" ON config_value_sets;

-- Keep read policy for all authenticated users
DROP POLICY IF EXISTS "Anyone can read config value sets" ON config_value_sets;
CREATE POLICY "Authenticated users can read config value sets"
  ON config_value_sets FOR SELECT
  TO authenticated
  USING (true);

-- Super admin only write policies
CREATE POLICY "Super admin can insert config value sets"
  ON config_value_sets FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin can update config value sets"
  ON config_value_sets FOR UPDATE
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admin can delete config value sets"
  ON config_value_sets FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- =============================================================================
-- manufacturer_product_domains
-- =============================================================================

-- Drop existing write policies
DROP POLICY IF EXISTS "Authenticated users can insert manufacturer domains" ON manufacturer_product_domains;
DROP POLICY IF EXISTS "Authenticated users can update manufacturer domains" ON manufacturer_product_domains;
DROP POLICY IF EXISTS "Authenticated users can delete manufacturer domains" ON manufacturer_product_domains;

-- Read policy for all authenticated users
DROP POLICY IF EXISTS "Anyone can read manufacturer domains" ON manufacturer_product_domains;
CREATE POLICY "Authenticated users can read manufacturer domains"
  ON manufacturer_product_domains FOR SELECT
  TO authenticated
  USING (true);

-- Super admin only write policies
CREATE POLICY "Super admin can insert manufacturer domains"
  ON manufacturer_product_domains FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin can update manufacturer domains"
  ON manufacturer_product_domains FOR UPDATE
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admin can delete manufacturer domains"
  ON manufacturer_product_domains FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- =============================================================================
-- product_domain
-- =============================================================================

-- Drop existing write policies
DROP POLICY IF EXISTS "Authenticated users can insert product domains" ON product_domain;
DROP POLICY IF EXISTS "Authenticated users can update product domains" ON product_domain;
DROP POLICY IF EXISTS "Authenticated users can delete product domains" ON product_domain;

-- Read policy for all authenticated users
DROP POLICY IF EXISTS "Anyone can read product domains" ON product_domain;
CREATE POLICY "Authenticated users can read product domains"
  ON product_domain FOR SELECT
  TO authenticated
  USING (true);

-- Super admin only write policies
CREATE POLICY "Super admin can insert product domains"
  ON product_domain FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin can update product domains"
  ON product_domain FOR UPDATE
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admin can delete product domains"
  ON product_domain FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- =============================================================================
-- product_line
-- =============================================================================

-- Drop existing write policies
DROP POLICY IF EXISTS "Authenticated users can insert product lines" ON product_line;
DROP POLICY IF EXISTS "Authenticated users can update product lines" ON product_line;
DROP POLICY IF EXISTS "Authenticated users can delete product lines" ON product_line;

-- Read policy for all authenticated users
DROP POLICY IF EXISTS "Anyone can read product lines" ON product_line;
CREATE POLICY "Authenticated users can read product lines"
  ON product_line FOR SELECT
  TO authenticated
  USING (true);

-- Super admin only write policies
CREATE POLICY "Super admin can insert product lines"
  ON product_line FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin can update product lines"
  ON product_line FOR UPDATE
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admin can delete product lines"
  ON product_line FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- =============================================================================
-- product_manufacturers
-- =============================================================================

-- Drop existing write policies
DROP POLICY IF EXISTS "Authenticated users can insert product manufacturers" ON product_manufacturers;
DROP POLICY IF EXISTS "Authenticated users can update product manufacturers" ON product_manufacturers;
DROP POLICY IF EXISTS "Authenticated users can delete product manufacturers" ON product_manufacturers;

-- Read policy for all authenticated users
DROP POLICY IF EXISTS "Anyone can read product manufacturers" ON product_manufacturers;
CREATE POLICY "Authenticated users can read product manufacturers"
  ON product_manufacturers FOR SELECT
  TO authenticated
  USING (true);

-- Super admin only write policies
CREATE POLICY "Super admin can insert product manufacturers"
  ON product_manufacturers FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin can update product manufacturers"
  ON product_manufacturers FOR UPDATE
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admin can delete product manufacturers"
  ON product_manufacturers FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- =============================================================================
-- product_models
-- =============================================================================

-- Drop existing write policies
DROP POLICY IF EXISTS "Authenticated users can insert product models" ON product_models;
DROP POLICY IF EXISTS "Authenticated users can update product models" ON product_models;
DROP POLICY IF EXISTS "Authenticated users can delete product models" ON product_models;

-- Read policy for all authenticated users
DROP POLICY IF EXISTS "Anyone can read product models" ON product_models;
CREATE POLICY "Authenticated users can read product models"
  ON product_models FOR SELECT
  TO authenticated
  USING (true);

-- Super admin only write policies
CREATE POLICY "Super admin can insert product models"
  ON product_models FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin can update product models"
  ON product_models FOR UPDATE
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admin can delete product models"
  ON product_models FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- =============================================================================
-- product_series
-- =============================================================================

-- Drop existing write policies
DROP POLICY IF EXISTS "Authenticated users can insert product series" ON product_series;
DROP POLICY IF EXISTS "Authenticated users can update product series" ON product_series;
DROP POLICY IF EXISTS "Authenticated users can delete product series" ON product_series;

-- Read policy for all authenticated users
DROP POLICY IF EXISTS "Anyone can read product series" ON product_series;
CREATE POLICY "Authenticated users can read product series"
  ON product_series FOR SELECT
  TO authenticated
  USING (true);

-- Super admin only write policies
CREATE POLICY "Super admin can insert product series"
  ON product_series FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin can update product series"
  ON product_series FOR UPDATE
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admin can delete product series"
  ON product_series FOR DELETE
  TO authenticated
  USING (public.is_super_admin());
