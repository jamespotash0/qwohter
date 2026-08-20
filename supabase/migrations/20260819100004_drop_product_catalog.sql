-- Drop the product catalog hierarchy
--
-- The app carried a full product catalog: domains, categories, manufacturers,
-- product lines, series, models, and per-model configuration schemas with
-- option value sets and business rules.
--
-- For a contract furniture dealer that is the wrong thing to own. CET, Giza,
-- 2020, and ProjectMatrix already resolve the part number, validate the option
-- combination, and apply list price before a specification ever reaches this
-- app. Reproducing that means licensing manufacturer catalog data and tracking
-- quarterly price book updates across dozens of manufacturers — a permanent
-- cost with nothing to show for it, and not something a dealer can maintain by
-- hand.
--
-- What remains is `products`: a flat, org-scoped list a dealer curates for the
-- things no spec tool provides — labor, freight, delivery, install, and
-- ancillary items. It already stored manufacturer, series, and model as plain
-- text and never referenced this hierarchy, so it is untouched.
--
-- Safe to drop outright: there are no customers, so there is no catalog data to
-- preserve. Dropped in dependency order, with CASCADE as a backstop for the
-- foreign keys and policies that hang off these tables.

-- Reporting views over the hierarchy. CASCADE below would take them anyway;
-- dropping them explicitly keeps the intent readable.
DROP VIEW IF EXISTS public.v_models_by_manufacturer;
DROP VIEW IF EXISTS public.v_manufacturers_by_domain;

DROP TABLE IF EXISTS public.config_option_group_metadata CASCADE;
DROP TABLE IF EXISTS public.config_value_sets CASCADE;
DROP TABLE IF EXISTS public.product_models CASCADE;
DROP TABLE IF EXISTS public.product_series CASCADE;
DROP TABLE IF EXISTS public.product_line CASCADE;
DROP TABLE IF EXISTS public.manufacturer_product_domains CASCADE;
DROP TABLE IF EXISTS public.product_manufacturers CASCADE;
DROP TABLE IF EXISTS public.product_category CASCADE;
DROP TABLE IF EXISTS public.product_domain CASCADE;

-- ============================================================================
-- Functions
-- ============================================================================
-- DROP TABLE ... CASCADE removes the triggers attached to these tables but not
-- the functions themselves, so anything specific to the catalog is dropped by
-- hand. Note that the updated_at triggers all called the SHARED
-- handle_updated_at(), which many surviving tables still use -- it stays.

-- Validated the configuration schema JSONB on product_models. The CHECK
-- constraint that called it went with the table.
DROP FUNCTION IF EXISTS public.is_valid_config_schema(jsonb);

-- Resolved a model's merged configuration (schema + option values + rules) for
-- the cascading product selector, which has been replaced by a flat picker over
-- `products`.
DROP FUNCTION IF EXISTS public.get_model_configuration(uuid);

-- Read option value sets for the configuration UI. Both were only ever called
-- through that UI, which is gone.
DROP FUNCTION IF EXISTS public.get_value_set(character varying);
DROP FUNCTION IF EXISTS public.get_value_sets_by_slugs(character varying[]);

COMMENT ON TABLE public.products IS
  'The dealer''s own product list — labor, freight, install, and ancillary items. Manufacturer, series, and model are plain text; there is deliberately no catalog hierarchy behind them, because specification tools resolve furniture part numbers and list price upstream.';
