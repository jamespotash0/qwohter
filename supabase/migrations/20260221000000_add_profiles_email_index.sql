-- Add unique btree index on profiles.email for fast signup lookups
-- Previously, email existence checks during signup triggered full table scans
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles USING btree (email);
