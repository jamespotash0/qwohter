-- Migration: Consolidate UUID generation on gen_random_uuid()
-- Replaces the last two uuid-ossp column defaults with the core function.
--
-- gen_random_uuid() has been in core PostgreSQL since 13 and is already what
-- the rest of the schema uses. uuid-ossp was installed for exactly two column
-- defaults, and uuid_generate_v4 was the only function ever called from it.
-- Both emit ordinary v4 UUIDs, so this is a like-for-like swap.
--
-- Changing a column default affects rows inserted afterwards only: no table
-- rewrite, no backfill, and existing ids are untouched. The lock is a brief
-- ACCESS EXCLUSIVE on each table for the catalog update.

-- ============================================================
-- 1. Swap the defaults
-- ============================================================

ALTER TABLE public.available_integrations
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.integrations
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ============================================================
-- 2. Dropping the extension (deliberately NOT done here)
-- ============================================================
--
-- The extension is left installed. Dropping it is only safe once nothing else
-- in the database references it, and this repo can only see what is checked
-- in -- objects created outside migrations would not show up in a grep.
--
-- To retire it, first confirm no column defaults still call it:
--
--   SELECT c.relname AS table_name,
--          a.attname AS column_name,
--          pg_get_expr(d.adbin, d.adrelid) AS default_expr
--   FROM pg_attrdef d
--   JOIN pg_class c ON c.oid = d.adrelid
--   JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
--   WHERE pg_get_expr(d.adbin, d.adrelid) ILIKE '%uuid_generate%';
--
-- and that nothing else depends on it:
--
--   SELECT DISTINCT p.proname
--   FROM pg_proc p
--   JOIN pg_depend dep ON dep.objid = p.oid
--   JOIN pg_extension e ON e.oid = dep.refobjid
--   WHERE e.extname = 'uuid-ossp';
--
-- If the first query returns no rows, this is safe to run manually:
--
--   DROP EXTENSION IF EXISTS "uuid-ossp";
--
-- A plain DROP (without CASCADE) fails rather than breaking dependents, so it
-- is self-guarding. Never add CASCADE here.
