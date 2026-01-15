-- ============================================================================
-- Add Position Column to Project Tasks
-- ============================================================================
-- Enables drag and drop reordering of tasks within columns

BEGIN;

-- Add position column (nullable initially for existing tasks)
ALTER TABLE project_tasks
ADD COLUMN IF NOT EXISTS position INTEGER;

-- Initialize positions for existing tasks (by created_at within each status/org)
WITH ranked_tasks AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, status
      ORDER BY created_at DESC
    ) - 1 AS new_position
  FROM project_tasks
)
UPDATE project_tasks pt
SET position = rt.new_position
FROM ranked_tasks rt
WHERE pt.id = rt.id;

-- Make position NOT NULL with default 0 for new tasks
ALTER TABLE project_tasks
ALTER COLUMN position SET DEFAULT 0,
ALTER COLUMN position SET NOT NULL;

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_project_tasks_org_status_position
ON project_tasks (organization_id, status, position);

COMMIT;
