-- =============================================================================
-- Migration: Add config_schema column to product_models
-- =============================================================================
--
-- This migration adds the config_schema JSONB column to product_models.
-- This column will store the complete product configuration schema including:
-- - Option field definitions (select, number, text, computed, etc.)
-- - Cascading relationships (depends_on, values_ref)
-- - Conditional filtering (filter_by)
-- - Auto-computed fields (compute_rules)
-- - UI grouping and ordering
--
-- The existing default_configurations column will be migrated to config_schema
-- format in a separate data migration script.
-- =============================================================================

-- Step 1: Add config_schema column with default empty schema
ALTER TABLE product_models
ADD COLUMN IF NOT EXISTS config_schema JSONB DEFAULT '{"version": "2.0", "options": {}, "groups": []}';

-- Step 2: Add GIN index for efficient JSONB queries
-- This enables fast queries like: WHERE config_schema @> '{"options": {"material_type": ...}}'
CREATE INDEX IF NOT EXISTS idx_product_models_config_schema
ON product_models USING GIN (config_schema);

-- Step 3: Add partial index for models that have config_schema defined
-- This speeds up queries for models with non-empty configurations
CREATE INDEX IF NOT EXISTS idx_product_models_has_config
ON product_models ((config_schema IS NOT NULL AND config_schema != '{"version": "2.0", "options": {}, "groups": []}'::jsonb))
WHERE config_schema IS NOT NULL AND config_schema != '{"version": "2.0", "options": {}, "groups": []}'::jsonb;

-- Step 4: Add comment documenting the column
COMMENT ON COLUMN product_models.config_schema IS
'Product configuration schema (v2.0). Stores option definitions, cascading rules, computed fields, and UI grouping. Replaces the legacy default_configurations column. See src/lib/types/configSchema.ts for TypeScript types.';

-- Step 5: Create a function to validate config_schema structure
-- This can be used in a CHECK constraint or trigger if desired
CREATE OR REPLACE FUNCTION is_valid_config_schema(schema JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Check required top-level keys
  IF schema IS NULL THEN
    RETURN TRUE; -- NULL is allowed
  END IF;

  IF NOT (schema ? 'version' AND schema ? 'options') THEN
    RETURN FALSE;
  END IF;

  -- Check version is a string
  IF jsonb_typeof(schema->'version') != 'string' THEN
    RETURN FALSE;
  END IF;

  -- Check options is an object
  IF jsonb_typeof(schema->'options') != 'object' THEN
    RETURN FALSE;
  END IF;

  -- If groups exists, it must be an array
  IF schema ? 'groups' AND jsonb_typeof(schema->'groups') != 'array' THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION is_valid_config_schema(JSONB) IS
'Validates that a config_schema JSONB value has the required structure (version, options, optional groups).';

-- Step 6: Add CHECK constraint for schema validation
-- Using a separate DO block to handle if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'product_models'
    AND constraint_name = 'product_models_config_schema_valid'
  ) THEN
    ALTER TABLE product_models
    ADD CONSTRAINT product_models_config_schema_valid
    CHECK (is_valid_config_schema(config_schema));
  END IF;
END $$;

-- =============================================================================
-- Verification
-- =============================================================================

DO $$
DECLARE
  col_exists BOOLEAN;
  idx_exists BOOLEAN;
BEGIN
  -- Check column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_models' AND column_name = 'config_schema'
  ) INTO col_exists;

  -- Check index exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'product_models' AND indexname = 'idx_product_models_config_schema'
  ) INTO idx_exists;

  IF col_exists AND idx_exists THEN
    RAISE NOTICE '✅ Migration successful: config_schema column and index created on product_models';
  ELSE
    RAISE WARNING '⚠️ Migration may have issues: column_exists=%, index_exists=%', col_exists, idx_exists;
  END IF;
END $$;
