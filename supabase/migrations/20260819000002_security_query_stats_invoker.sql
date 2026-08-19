-- Migration: Make security_query_stats respect the querying user
--
-- Supabase's linter flagged public.security_query_stats as a SECURITY DEFINER
-- view. It was the only one of the eight views in public missing
-- security_invoker -- ai_feedback_analytics, proposals_needing_ai_attention,
-- safe_routines, subscriptions_pending_sync, unverified_profiles_to_cleanup,
-- v_manufacturers_by_domain and v_models_by_manufacturer all set it.
--
-- Impact was low but real: anon could read the view (15 rows) and get calls,
-- total_exec_time, rows and risk_level. The query text came back as
-- "<insufficient privilege>" because pg_stat_statements checks the *invoking*
-- role and a view's owner-rights do not change current_user -- so no SQL text
-- or table names leaked. That masking is incidental to pg_stat_statements'
-- internals, though, not something this schema configured, so it should not be
-- relied on.
--
-- Nothing in src/ or supabase/functions/ queries this view; it is an operator
-- tool.

ALTER VIEW public.security_query_stats SET (security_invoker = on);

-- security_invoker alone makes the underlying pg_stat_statements read fail for
-- anon with a permission error. Revoking as well means the request is refused
-- cleanly at the view instead.
REVOKE ALL ON public.security_query_stats FROM anon, authenticated;

-- Verify afterwards: reloptions must contain security_invoker=on.
--
--   SELECT c.relname, c.reloptions
--   FROM pg_class c
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public' AND c.relkind = 'v';
