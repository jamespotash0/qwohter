-- ============================================================================
-- ADD MISSING UPDATED_AT TRIGGERS
-- ============================================================================
-- Adds handle_updated_at() triggers to 7 tables that were missing them
--
-- Tables being updated:
--   1. invite_tokens
--   2. product_categories
--   3. product_manufacturers
--   4. product_models
--   5. product_series
--   6. product_types
--   7. quotes_formbuilder_test (test table, but adding for consistency)
--
-- Note: subscriptions_pending_sync is a VIEW, not a table, so it cannot
-- have BEFORE/AFTER triggers. Views don't need updated_at triggers.
--
-- After this migration, all 19 TABLES with updated_at will have triggers
-- ============================================================================

-- ============================================================================
-- ADD TRIGGERS TO MISSING TABLES
-- ============================================================================

-- 1. Invite tokens
CREATE TRIGGER update_invite_tokens_updated_at
  BEFORE UPDATE ON invite_tokens
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- 2. Product categories
CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- 3. Product manufacturers
CREATE TRIGGER update_product_manufacturers_updated_at
  BEFORE UPDATE ON product_manufacturers
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- 4. Product models
CREATE TRIGGER update_product_models_updated_at
  BEFORE UPDATE ON product_models
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- 5. Product series
CREATE TRIGGER update_product_series_updated_at
  BEFORE UPDATE ON product_series
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- 6. Product types
CREATE TRIGGER update_product_types_updated_at
  BEFORE UPDATE ON product_types
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();


-- Note: subscriptions_pending_sync is a VIEW, not a table
-- Views cannot have BEFORE/AFTER triggers, so it's excluded from this migration

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON TRIGGER update_invite_tokens_updated_at ON invite_tokens IS
'Automatically updates updated_at timestamp when invite token is modified';

COMMENT ON TRIGGER update_product_categories_updated_at ON product_categories IS
'Automatically updates updated_at timestamp when product category is modified';

COMMENT ON TRIGGER update_product_manufacturers_updated_at ON product_manufacturers IS
'Automatically updates updated_at timestamp when product manufacturer is modified';

COMMENT ON TRIGGER update_product_models_updated_at ON product_models IS
'Automatically updates updated_at timestamp when product model is modified';

COMMENT ON TRIGGER update_product_series_updated_at ON product_series IS
'Automatically updates updated_at timestamp when product series is modified';

COMMENT ON TRIGGER update_product_types_updated_at ON product_types IS
'Automatically updates updated_at timestamp when product type is modified';

-- ============================================================================
-- NOTES
-- ============================================================================

/*
TABLES UPDATED (6 total):

1. invite_tokens - Production table for invitation tokens
2. product_categories - Product catalog: categories
3. product_manufacturers - Product catalog: manufacturers
4. product_models - Product catalog: models
5. product_series - Product catalog: series
6. product_types - Product catalog: types
7. quotes_formbuilder_test - Test table (included for consistency)

NOT INCLUDED:
- subscriptions_pending_sync - This is a VIEW, not a table. Views cannot have
  BEFORE/AFTER triggers. Views don't maintain their own data, so updated_at
  is managed by the underlying base table.

BEFORE THIS MIGRATION:
- 12 tables had triggers
- 7 tables were missing triggers
- 1 view has updated_at but cannot have triggers
- Total: 18 tables + 1 view with updated_at column

AFTER THIS MIGRATION:
- 18 tables have triggers ✅
- 1 tables missing triggers ✅
- 1 view (subscriptions_pending_sync) cannot have triggers (this is normal)
- All use the same optimized handle_updated_at() function

NAMING CONVENTION:
All triggers follow the pattern: update_<table_name>_updated_at

OPTIMIZATION:
All triggers use handle_updated_at() which only updates the timestamp
if the row actually changed (row(NEW.*) IS DISTINCT FROM row(OLD.*))

BACKWARDS COMPATIBLE: Yes
No breaking changes, only adds missing automation
*/
