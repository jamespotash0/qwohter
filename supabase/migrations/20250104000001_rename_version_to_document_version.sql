-- Migration: Rename 'version' column to 'document_version' in quotes table
-- Purpose: Avoid confusion between document versioning and other version fields
-- Date: 2025-01-04

-- Rename the column
ALTER TABLE quotes
RENAME COLUMN version TO document_version;

-- Ensure document_version has a default value of 0
ALTER TABLE quotes
ALTER COLUMN document_version SET DEFAULT 0;

-- Set NOT NULL constraint (should already exist, but ensure it)
ALTER TABLE quotes
ALTER COLUMN document_version SET NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN quotes.document_version IS 'Document version number for tracking customization changes to the quote template. Incremented when customizations are saved. Regular form data updates do not increment this value.';

-- No index changes needed as the column rename preserves any existing indexes
