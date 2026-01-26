-- =============================================================================
-- Migration: Create config_value_sets table
-- =============================================================================
--
-- This table stores shared value libraries that can be referenced by
-- config_schema via the values_ref property.
--
-- Examples:
-- - "vinyl_colors" - 50+ vinyl color options for finishes
-- - "ral_paints" - 200+ RAL paint colors
-- - "standard_support_systems" - 5 support system options shared across all products
-- - "oak_finishes" - Oak finish variations
--
-- Values are stored as JSONB array with structure:
-- [{ "code": "AW", "label": "Arctic White", "hex": "#FAFAFA", ... }, ...]
-- =============================================================================

-- Step 1: Create the config_value_sets table
CREATE TABLE IF NOT EXISTS config_value_sets (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,

  -- Categorization
  category VARCHAR(100),

  -- Optional manufacturer scoping (NULL = global, available to all)
  manufacturer_id UUID REFERENCES product_manufacturers(id) ON DELETE SET NULL,

  -- The actual values as JSONB array
  -- Format: [{ code, label, hex?, image_url?, description?, sort_order?, is_active?, metadata? }]
  "values" JSONB NOT NULL DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_config_value_sets_slug
ON config_value_sets(slug);

CREATE INDEX IF NOT EXISTS idx_config_value_sets_category
ON config_value_sets(category);

CREATE INDEX IF NOT EXISTS idx_config_value_sets_manufacturer
ON config_value_sets(manufacturer_id);

-- GIN index for searching within values array
CREATE INDEX IF NOT EXISTS idx_config_value_sets_values
ON config_value_sets USING GIN ("values");

-- Composite index for filtered queries
CREATE INDEX IF NOT EXISTS idx_config_value_sets_category_manufacturer
ON config_value_sets(category, manufacturer_id);

-- Step 3: Enable Row Level Security
ALTER TABLE config_value_sets ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
-- Public read access (product catalog is public)
DROP POLICY IF EXISTS "config_value_sets_select" ON config_value_sets;
CREATE POLICY "config_value_sets_select" ON config_value_sets
  FOR SELECT USING (true);

-- Authenticated users can insert
DROP POLICY IF EXISTS "config_value_sets_insert" ON config_value_sets;
CREATE POLICY "config_value_sets_insert" ON config_value_sets
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update
DROP POLICY IF EXISTS "config_value_sets_update" ON config_value_sets;
CREATE POLICY "config_value_sets_update" ON config_value_sets
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Authenticated users can delete
DROP POLICY IF EXISTS "config_value_sets_delete" ON config_value_sets;
CREATE POLICY "config_value_sets_delete" ON config_value_sets
  FOR DELETE USING (auth.role() = 'authenticated');

-- Step 5: Create updated_at trigger
DROP TRIGGER IF EXISTS update_config_value_sets_updated_at ON config_value_sets;
CREATE TRIGGER update_config_value_sets_updated_at
  BEFORE UPDATE ON config_value_sets
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Step 6: Add table and column comments
COMMENT ON TABLE config_value_sets IS
'Shared value libraries for product configuration. Referenced by config_schema via values_ref property. Examples: vinyl_colors, ral_paints, standard_support_systems.';

COMMENT ON COLUMN config_value_sets.slug IS
'URL-safe unique identifier used in config_schema values_ref. Example: "vinyl_colors", "ral_paints"';

COMMENT ON COLUMN config_value_sets.name IS
'Human-readable display name. Example: "Vinyl Colors", "RAL Paint Colors"';

COMMENT ON COLUMN config_value_sets.category IS
'Category for organizing in admin UI. Example: "materials", "colors", "hardware", "structural"';

COMMENT ON COLUMN config_value_sets.manufacturer_id IS
'Optional manufacturer scoping. NULL means globally available to all manufacturers.';

COMMENT ON COLUMN config_value_sets."values" IS
'Array of value options. Format: [{code, label, hex?, image_url?, description?, sort_order?, is_active?, metadata?}]';

-- Step 7: Create helper function to get value set by slug
CREATE OR REPLACE FUNCTION get_value_set(p_slug VARCHAR)
RETURNS TABLE (
  id UUID,
  slug VARCHAR,
  name VARCHAR,
  category VARCHAR,
  manufacturer_id UUID,
  "values" JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    cvs.id,
    cvs.slug,
    cvs.name,
    cvs.category,
    cvs.manufacturer_id,
    cvs."values",
    cvs.created_at,
    cvs.updated_at
  FROM config_value_sets cvs
  WHERE cvs.slug = p_slug;
$$;

COMMENT ON FUNCTION get_value_set(VARCHAR) IS
'Get a config_value_set by its slug. Returns the complete value set record.';

-- Step 8: Create function to get multiple value sets by slugs (for batch fetching)
CREATE OR REPLACE FUNCTION get_value_sets_by_slugs(p_slugs VARCHAR[])
RETURNS TABLE (
  id UUID,
  slug VARCHAR,
  name VARCHAR,
  category VARCHAR,
  manufacturer_id UUID,
  "values" JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    cvs.id,
    cvs.slug,
    cvs.name,
    cvs.category,
    cvs.manufacturer_id,
    cvs."values",
    cvs.created_at,
    cvs.updated_at
  FROM config_value_sets cvs
  WHERE cvs.slug = ANY(p_slugs);
$$;

COMMENT ON FUNCTION get_value_sets_by_slugs(VARCHAR[]) IS
'Get multiple config_value_sets by their slugs. Used for batch fetching when resolving config_schema.';

-- Step 9: Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_value_set(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_value_sets_by_slugs(VARCHAR[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_value_set(VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION get_value_sets_by_slugs(VARCHAR[]) TO anon;

-- =============================================================================
-- Step 10: Data Migration Note
-- =============================================================================
-- IMPORTANT: Seed data is NOT included here.
-- Use the data migration script: supabase/migrations/20260125000003_migrate_pc_data_to_config_value_sets.sql
-- That script migrates data from the existing pc_option_groups and pc_option_values tables
-- into the new config_value_sets format.
-- =============================================================================

-- =============================================================================
-- Verification
-- =============================================================================

DO $$
DECLARE
  tbl_exists BOOLEAN;
  idx_count INTEGER;
  seed_count INTEGER;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'config_value_sets'
  ) INTO tbl_exists;

  -- Count indexes
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE tablename = 'config_value_sets';

  -- Count seeded records
  SELECT COUNT(*) INTO seed_count
  FROM config_value_sets;

  IF tbl_exists THEN
    RAISE NOTICE '✅ Migration successful:';
    RAISE NOTICE '   - config_value_sets table created';
    RAISE NOTICE '   - % indexes created', idx_count;
    RAISE NOTICE '   - % value sets seeded', seed_count;
  ELSE
    RAISE WARNING '⚠️ Migration failed: config_value_sets table not created';
  END IF;
END $$;
