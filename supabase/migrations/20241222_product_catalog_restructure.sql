-- ============================================================================
-- Product Catalog Schema Restructure
-- Hierarchy: Domain → Category → Manufacturer → Series → Model → Variant
-- ============================================================================

-- ============================================================================
-- STEP 1: Rename tables
-- ============================================================================

-- Rename product_types to product_domain
ALTER TABLE IF EXISTS product_types RENAME TO product_domain;

-- Rename product_categories to product_category
ALTER TABLE IF EXISTS product_categories RENAME TO product_category;

-- ============================================================================
-- STEP 2: Update product_category to reference domain
-- ============================================================================

-- Add domain_id to product_category (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_category' AND column_name = 'domain_id'
  ) THEN
    ALTER TABLE product_category ADD COLUMN domain_id uuid REFERENCES product_domain(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Migrate existing type_id data to domain_id if type_id exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_category' AND column_name = 'type_id'
  ) THEN
    UPDATE product_category SET domain_id = type_id WHERE domain_id IS NULL;
    ALTER TABLE product_category DROP COLUMN IF EXISTS type_id;
  END IF;
END $$;

-- Remove has_series and other flag columns from product_category
ALTER TABLE product_category DROP COLUMN IF EXISTS has_series;
ALTER TABLE product_category DROP COLUMN IF EXISTS has_models;
ALTER TABLE product_category DROP COLUMN IF EXISTS is_active;

-- ============================================================================
-- STEP 3: Create manufacturer_product_domains junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS manufacturer_product_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id uuid NOT NULL REFERENCES product_manufacturers(id) ON DELETE CASCADE,
  domain_id uuid NOT NULL REFERENCES product_domain(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(manufacturer_id, domain_id)
);

-- Enable RLS
ALTER TABLE manufacturer_product_domains ENABLE ROW LEVEL SECURITY;

-- RLS policies for manufacturer_product_domains (public read, authenticated write)
CREATE POLICY "manufacturer_product_domains_select" ON manufacturer_product_domains
  FOR SELECT USING (true);

CREATE POLICY "manufacturer_product_domains_insert" ON manufacturer_product_domains
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "manufacturer_product_domains_update" ON manufacturer_product_domains
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "manufacturer_product_domains_delete" ON manufacturer_product_domains
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================================
-- STEP 4: Migrate existing manufacturer relationships
-- ============================================================================

-- If product_manufacturers had a type_id, migrate to junction table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_manufacturers' AND column_name = 'type_id'
  ) THEN
    -- Insert existing relationships into junction table
    INSERT INTO manufacturer_product_domains (manufacturer_id, domain_id)
    SELECT id, type_id FROM product_manufacturers WHERE type_id IS NOT NULL
    ON CONFLICT (manufacturer_id, domain_id) DO NOTHING;

    -- Drop the old column
    ALTER TABLE product_manufacturers DROP COLUMN IF EXISTS type_id;
  END IF;
END $$;

-- Remove flag columns from product_manufacturers
ALTER TABLE product_manufacturers DROP COLUMN IF EXISTS is_active;
ALTER TABLE product_manufacturers DROP COLUMN IF EXISTS has_series;

-- ============================================================================
-- STEP 5: Update series table
-- ============================================================================

-- Ensure series references manufacturer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_series' AND column_name = 'manufacturer_id'
  ) THEN
    ALTER TABLE product_series ADD COLUMN manufacturer_id uuid REFERENCES product_manufacturers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Remove flag columns from series
ALTER TABLE product_series DROP COLUMN IF EXISTS is_active;
ALTER TABLE product_series DROP COLUMN IF EXISTS has_models;

-- ============================================================================
-- STEP 6: Update product_models table
-- ============================================================================

-- Model can reference:
-- 1. series_id (when model belongs to a series)
-- 2. manufacturer_id (when model has no series, directly under manufacturer)
-- 3. category_id (optional categorization)
DO $$
BEGIN
  -- Add category_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_models' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE product_models ADD COLUMN category_id uuid REFERENCES product_category(id) ON DELETE SET NULL;
  END IF;

  -- Add series_id if not exists (optional - model may not have a series)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_models' AND column_name = 'series_id'
  ) THEN
    ALTER TABLE product_models ADD COLUMN series_id uuid REFERENCES product_series(id) ON DELETE CASCADE;
  END IF;

  -- Add manufacturer_id if not exists (for models without a series)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_models' AND column_name = 'manufacturer_id'
  ) THEN
    ALTER TABLE product_models ADD COLUMN manufacturer_id uuid REFERENCES product_manufacturers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Remove flag columns from models
ALTER TABLE product_models DROP COLUMN IF EXISTS is_active;
ALTER TABLE product_models DROP COLUMN IF EXISTS has_variants;
ALTER TABLE product_models DROP COLUMN IF EXISTS required;

-- Add constraint: model must have either series_id OR manufacturer_id (but not neither)
-- Note: We use a check constraint instead of NOT NULL to allow flexibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'product_models' AND constraint_name = 'product_models_series_or_manufacturer'
  ) THEN
    ALTER TABLE product_models ADD CONSTRAINT product_models_series_or_manufacturer
      CHECK (series_id IS NOT NULL OR manufacturer_id IS NOT NULL);
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Create product_variants table (new)
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES product_models(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  description text,
  specifications jsonb DEFAULT '{}',
  pricing jsonb DEFAULT '{}',
  is_default boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_variants
CREATE POLICY "product_variants_select" ON product_variants
  FOR SELECT USING (true);

CREATE POLICY "product_variants_insert" ON product_variants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "product_variants_update" ON product_variants
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "product_variants_delete" ON product_variants
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================================
-- STEP 8: Create/Update Indexes for Query Performance
-- ============================================================================

-- Domain indexes
CREATE INDEX IF NOT EXISTS idx_product_domain_name ON product_domain(name);

-- Category indexes
CREATE INDEX IF NOT EXISTS idx_product_category_domain_id ON product_category(domain_id);
CREATE INDEX IF NOT EXISTS idx_product_category_name ON product_category(name);

-- Manufacturer domain junction indexes
CREATE INDEX IF NOT EXISTS idx_manufacturer_product_domains_manufacturer_id ON manufacturer_product_domains(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_manufacturer_product_domains_domain_id ON manufacturer_product_domains(domain_id);

-- Series indexes
CREATE INDEX IF NOT EXISTS idx_product_series_manufacturer_id ON product_series(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_product_series_name ON product_series(name);

-- Model indexes
CREATE INDEX IF NOT EXISTS idx_product_models_series_id ON product_models(series_id);
CREATE INDEX IF NOT EXISTS idx_product_models_category_id ON product_models(category_id);
CREATE INDEX IF NOT EXISTS idx_product_models_manufacturer_id ON product_models(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_product_models_name ON product_models(name);

-- Variant indexes
CREATE INDEX IF NOT EXISTS idx_product_variants_model_id ON product_variants(model_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_name ON product_variants(name);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_manufacturer_product_domains_composite
  ON manufacturer_product_domains(domain_id, manufacturer_id);

CREATE INDEX IF NOT EXISTS idx_product_models_series_category
  ON product_models(series_id, category_id);

CREATE INDEX IF NOT EXISTS idx_product_models_manufacturer_category
  ON product_models(manufacturer_id, category_id);

-- ============================================================================
-- STEP 9: Update Triggers for updated_at
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for each table
DROP TRIGGER IF EXISTS update_product_domain_updated_at ON product_domain;
CREATE TRIGGER update_product_domain_updated_at
  BEFORE UPDATE ON product_domain
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_category_updated_at ON product_category;
CREATE TRIGGER update_product_category_updated_at
  BEFORE UPDATE ON product_category
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_manufacturers_updated_at ON product_manufacturers;
CREATE TRIGGER update_product_manufacturers_updated_at
  BEFORE UPDATE ON product_manufacturers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_series_updated_at ON product_series;
CREATE TRIGGER update_product_series_updated_at
  BEFORE UPDATE ON product_series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_models_updated_at ON product_models;
CREATE TRIGGER update_product_models_updated_at
  BEFORE UPDATE ON product_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_variants_updated_at ON product_variants;
CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 10: Helpful Views for Common Queries
-- ============================================================================

-- View: Get manufacturers for a domain
CREATE OR REPLACE VIEW v_manufacturers_by_domain AS
SELECT
  d.id as domain_id,
  d.name as domain_name,
  m.id as manufacturer_id,
  m.name as manufacturer_name
FROM product_domain d
JOIN manufacturer_product_domains md ON md.domain_id = d.id
JOIN product_manufacturers m ON m.id = md.manufacturer_id
ORDER BY d.name, m.name;

-- View: Full product hierarchy (handles both series-based and direct manufacturer models)
CREATE OR REPLACE VIEW v_product_hierarchy AS
SELECT
  d.id as domain_id,
  d.name as domain_name,
  c.id as category_id,
  c.name as category_name,
  mfr.id as manufacturer_id,
  mfr.name as manufacturer_name,
  s.id as series_id,
  s.name as series_name,
  pm.id as model_id,
  pm.name as model_name,
  pv.id as variant_id,
  pv.name as variant_name,
  pv.sku as variant_sku
FROM product_domain d
LEFT JOIN product_category c ON c.domain_id = d.id
LEFT JOIN manufacturer_product_domains md ON md.domain_id = d.id
LEFT JOIN product_manufacturers mfr ON mfr.id = md.manufacturer_id
LEFT JOIN product_series s ON s.manufacturer_id = mfr.id
-- Join models: either via series OR directly via manufacturer
LEFT JOIN product_models pm ON (pm.series_id = s.id OR (pm.series_id IS NULL AND pm.manufacturer_id = mfr.id))
LEFT JOIN product_variants pv ON pv.model_id = pm.id;

-- View: Models by manufacturer (includes both series-based and direct models)
CREATE OR REPLACE VIEW v_models_by_manufacturer AS
SELECT
  mfr.id as manufacturer_id,
  mfr.name as manufacturer_name,
  s.id as series_id,
  s.name as series_name,
  pm.id as model_id,
  pm.name as model_name,
  pm.category_id,
  c.name as category_name,
  CASE WHEN pm.series_id IS NOT NULL THEN 'series' ELSE 'direct' END as model_path
FROM product_manufacturers mfr
LEFT JOIN product_series s ON s.manufacturer_id = mfr.id
LEFT JOIN product_models pm ON (pm.series_id = s.id OR (pm.series_id IS NULL AND pm.manufacturer_id = mfr.id))
LEFT JOIN product_category c ON c.id = pm.category_id
WHERE pm.id IS NOT NULL
ORDER BY mfr.name, s.name NULLS LAST, pm.name;

-- ============================================================================
-- STEP 11: Grant permissions to authenticated users
-- ============================================================================

GRANT SELECT ON v_manufacturers_by_domain TO authenticated;
GRANT SELECT ON v_product_hierarchy TO authenticated;
GRANT SELECT ON v_models_by_manufacturer TO authenticated;

-- ============================================================================
-- Schema Summary:
--
-- HIERARCHY STRUCTURE:
--
-- product_domain (top level - e.g., "Operable Walls", "Demountable Partitions")
--     ↓
-- product_category (domain_id FK - e.g., "Accordion Fold", "Panel")
--
-- product_manufacturers ←→ manufacturer_product_domains ←→ product_domain (many-to-many)
--     ↓
-- product_series (manufacturer_id FK) [OPTIONAL - some products go direct to model]
--     ↓
-- product_models:
--   - series_id FK (when model belongs to a series)
--   - manufacturer_id FK (when model has NO series, directly under manufacturer)
--   - category_id FK (optional categorization)
--   - CONSTRAINT: must have either series_id OR manufacturer_id
--     ↓
-- product_variants (model_id FK)
--
-- TWO PATHS TO MODELS:
-- 1. Domain → Manufacturer → Series → Model (traditional hierarchy)
-- 2. Domain → Manufacturer → Model (direct, no series)
--
-- ============================================================================
