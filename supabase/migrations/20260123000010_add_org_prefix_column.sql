--HAVENT MIGRATED YET
-- Add org_prefix column to organizations table
-- This stores a stable prefix for task references (e.g., "WAL" for WallQu)
-- Generated from org name at creation time, stays fixed even if org is renamed

-- Step 1: Add the column (nullable initially for backfill)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS org_prefix TEXT;

-- Step 2: Backfill existing organizations using the same logic as getOrgInitials
-- - Single word: first 3 letters (e.g., "WallQu" -> "WAL")
-- - Multiple words: first letter of first 3 words (e.g., "Acme Corp" -> "AC")
UPDATE organizations
SET org_prefix = UPPER(
  CASE
    -- Single word: take first 3 letters
    WHEN array_length(
      regexp_split_to_array(
        regexp_replace(trim(name), '[-_]', ' ', 'g'),
        '\s+'
      ), 1
    ) = 1 THEN
      LEFT(
        regexp_replace(name, '[^a-zA-Z]', '', 'g'),
        3
      )
    -- Multiple words: first letter of first 3 words
    ELSE
      (
        SELECT COALESCE(
          string_agg(LEFT(word, 1), ''),
          'TSK'
        )
        FROM (
          SELECT unnest(
            regexp_split_to_array(
              regexp_replace(
                regexp_replace(trim(name), '[-_]', ' ', 'g'),
                '[^a-zA-Z\s]', '', 'g'
              ),
              '\s+'
            )
          ) AS word
          LIMIT 3
        ) words
        WHERE word ~ '[a-zA-Z]'
      )
  END
)
WHERE org_prefix IS NULL;

-- Step 3: Set default for any edge cases (empty result)
UPDATE organizations
SET org_prefix = 'TSK'
WHERE org_prefix IS NULL OR org_prefix = '';

-- Step 4: Make column NOT NULL after backfill
ALTER TABLE organizations
ALTER COLUMN org_prefix SET NOT NULL;

-- Step 5: Add comment
COMMENT ON COLUMN organizations.org_prefix IS 'Stable prefix for task references, generated from original org name (e.g., WAL for WallQu). Does not change when org is renamed.';
