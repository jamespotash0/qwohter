-- ============================================================================
-- Rename product_category to product_line
-- Move product_line under manufacturer (not domain)
-- New Hierarchy: Domain → Manufacturer → Product Line → Series → Model → Variant
-- ============================================================================

-- ============================================================================
-- STEP 1: Rename table
-- ============================================================================

ALTER TABLE IF EXISTS product_category RENAME TO product_line;

-- ============================================================================
-- STEP 2: Update product_line to reference manufacturer instead of domain
-- ============================================================================

-- Add manufacturer_id column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_line' AND column_name = 'manufacturer_id'
    ) THEN
        ALTER TABLE product_line ADD COLUMN manufacturer_id UUID REFERENCES product_manufacturers(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Drop domain_id column (product_line no longer directly references domain)
-- Domain is now accessed through: product_line → manufacturer → manufacturer_product_domains → domain
ALTER TABLE product_line DROP COLUMN IF EXISTS domain_id;

-- ============================================================================
-- STEP 3: Update product_series to reference product_line
-- ============================================================================

-- Add product_line_id to series
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_series' AND column_name = 'product_line_id'
    ) THEN
        ALTER TABLE product_series ADD COLUMN product_line_id UUID REFERENCES product_line(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Drop old manufacturer_id from product_series (series now references product_line, not manufacturer directly)
ALTER TABLE product_series DROP COLUMN IF EXISTS manufacturer_id;

-- ============================================================================
-- STEP 4: Update product_models - rename category_id to product_line_id
-- ============================================================================

-- Rename column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_models' AND column_name = 'category_id'
    ) THEN
        ALTER TABLE product_models RENAME COLUMN category_id TO product_line_id;
    END IF;
END $$;

-- Add product_line_id if neither exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_models' AND column_name = 'product_line_id'
    ) THEN
        ALTER TABLE product_models ADD COLUMN product_line_id UUID REFERENCES product_line(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Rename series_id to product_series_id in product_models
-- ============================================================================

-- First drop dependent views (will be recreated in STEP 6)
DROP VIEW IF EXISTS v_model_option_config CASCADE;
DROP VIEW IF EXISTS v_product_hierarchy CASCADE;
DROP VIEW IF EXISTS v_models_by_manufacturer CASCADE;

-- Rename column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_models' AND column_name = 'series_id'
    ) THEN
        ALTER TABLE product_models RENAME COLUMN series_id TO product_series_id;
    END IF;
END $$;

-- ============================================================================
-- STEP 5b: Rename manufacturer_id to product_manufacturer_id in product_models
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_models' AND column_name = 'manufacturer_id'
    ) THEN
        ALTER TABLE product_models RENAME COLUMN manufacturer_id TO product_manufacturer_id;
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Update indexes
-- ============================================================================

-- Drop old indexes
DROP INDEX IF EXISTS idx_product_category_domain_id;
DROP INDEX IF EXISTS idx_product_category_name;
DROP INDEX IF EXISTS idx_product_models_category_id;
DROP INDEX IF EXISTS idx_product_models_series_id;
DROP INDEX IF EXISTS idx_product_models_manufacturer_id;
DROP INDEX IF EXISTS idx_product_series_manufacturer_id;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_product_line_manufacturer_id ON product_line(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_product_line_name ON product_line(name);
CREATE INDEX IF NOT EXISTS idx_product_series_product_line_id ON product_series(product_line_id);
CREATE INDEX IF NOT EXISTS idx_product_models_product_line_id ON product_models(product_line_id);
CREATE INDEX IF NOT EXISTS idx_product_models_product_series_id ON product_models(product_series_id);
CREATE INDEX IF NOT EXISTS idx_product_models_product_manufacturer_id ON product_models(product_manufacturer_id);

-- ============================================================================
-- STEP 7: Recreate views with new column names
-- ============================================================================

-- Recreate v_product_hierarchy with new structure
CREATE OR REPLACE VIEW v_product_hierarchy AS
SELECT
    d.id AS domain_id,
    d.name AS domain_name,
    mfr.id AS manufacturer_id,
    mfr.name AS manufacturer_name,
    pl.id AS product_line_id,
    pl.name AS product_line_name,
    s.id AS series_id,
    s.name AS series_name,
    pm.id AS model_id,
    pm.name AS model_name,
    pv.id AS variant_id,
    pv.name AS variant_name
FROM product_domain d
LEFT JOIN manufacturer_product_domains md ON md.domain_id = d.id
LEFT JOIN product_manufacturers mfr ON mfr.id = md.manufacturer_id
LEFT JOIN product_line pl ON pl.manufacturer_id = mfr.id
LEFT JOIN product_series s ON s.product_line_id = pl.id
LEFT JOIN product_models pm ON pm.product_series_id = s.id
LEFT JOIN product_variants pv ON pv.model_id = pm.id
ORDER BY d.name, mfr.name, pl.name, s.name, pm.name;

-- Recreate v_models_by_manufacturer with new structure
CREATE OR REPLACE VIEW v_models_by_manufacturer AS
SELECT
    mfr.id AS manufacturer_id,
    mfr.name AS manufacturer_name,
    pl.id AS product_line_id,
    pl.name AS product_line_name,
    s.id AS series_id,
    s.name AS series_name,
    pm.id AS model_id,
    pm.name AS model_name,
    CASE
        WHEN pm.product_series_id IS NOT NULL THEN 'via_series'
        ELSE 'direct'
    END AS model_path
FROM product_manufacturers mfr
LEFT JOIN product_line pl ON pl.manufacturer_id = mfr.id
LEFT JOIN product_series s ON s.product_line_id = pl.id
LEFT JOIN product_models pm ON (
    pm.product_series_id = s.id
    OR (pm.product_series_id IS NULL AND pm.product_manufacturer_id = mfr.id)
)
WHERE pm.id IS NOT NULL
ORDER BY mfr.name, pl.name, s.name NULLS LAST, pm.name;

-- Grant permissions
GRANT SELECT ON v_product_hierarchy TO authenticated;
GRANT SELECT ON v_models_by_manufacturer TO authenticated;

-- ============================================================================
-- STEP 8: Update RLS policies (rename from category to product_line)
-- ============================================================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "product_category_select" ON product_line;
DROP POLICY IF EXISTS "product_category_insert" ON product_line;
DROP POLICY IF EXISTS "product_category_update" ON product_line;
DROP POLICY IF EXISTS "product_category_delete" ON product_line;

-- Create new policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'product_line' AND policyname = 'product_line_select'
    ) THEN
        CREATE POLICY "product_line_select" ON product_line FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'product_line' AND policyname = 'product_line_insert'
    ) THEN
        CREATE POLICY "product_line_insert" ON product_line FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'product_line' AND policyname = 'product_line_update'
    ) THEN
        CREATE POLICY "product_line_update" ON product_line FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'product_line' AND policyname = 'product_line_delete'
    ) THEN
        CREATE POLICY "product_line_delete" ON product_line FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- ============================================================================
-- Schema Summary:
--
-- NEW HIERARCHY:
--
-- product_domain (Wall Systems, etc.)
--     ↓ (via manufacturer_product_domains junction)
-- product_manufacturers (Kwik-Wall, etc.)
--     ↓
-- product_line (Accordion, Operable, Glass, etc.) [formerly product_category]
--     ↓
-- product_series (2000 Series, MK Series, VL Series, etc.)
--     ↓
-- product_models (2010, MK-XX, VL-100, etc.)
--     ↓
-- product_variants (optional model variations)
--
-- ============================================================================
