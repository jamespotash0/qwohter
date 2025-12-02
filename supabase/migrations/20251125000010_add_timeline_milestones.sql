-- Add flexible timeline milestones JSONB column to projects table
-- This replaces the rigid shop_drawings_approval_date, estimated_delivery_date, installation_date approach
-- with a flexible array that works for all business types (wall systems, furniture, custom, etc.)

-- First, remove the old rigid date columns (if they exist)
-- These will be migrated into the new milestone structure
ALTER TABLE projects
DROP COLUMN IF EXISTS shop_drawings_approval_date,
DROP COLUMN IF EXISTS estimated_delivery_date,
DROP COLUMN IF EXISTS installation_date;

-- Add the new flexible timeline_milestones column
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS timeline_milestones JSONB DEFAULT '[]';

-- Add index for querying milestones
CREATE INDEX IF NOT EXISTS idx_projects_timeline_milestones ON projects USING gin(timeline_milestones);

-- Add comment explaining the structure
COMMENT ON COLUMN projects.timeline_milestones IS
'Flexible timeline milestones array. Each milestone has:
{
  "type": "shop_drawings_approval" | "track_delivery" | "panel_delivery" | "furniture_delivery" | "installation" | "completion" | etc,
  "date": "2025-01-15" (ISO date string, null if not set),
  "auto_calculated": true/false (whether this date was auto-calculated from quote data),
  "source": {
    "based_on": "shop_drawings_approval" (which milestone this is calculated from),
    "offset_weeks": 4 (number of weeks to add),
    "offset_days": 28 (number of days to add)
  }
}
This structure allows different business types (wall systems, furniture, custom) to have different milestone types without schema changes.';

-- Example data structure:
-- [
--   {"type": "shop_drawings_approval", "date": "2025-01-15", "auto_calculated": false},
--   {"type": "track_delivery", "date": "2025-02-12", "auto_calculated": true, "source": {"based_on": "shop_drawings_approval", "offset_weeks": 4}},
--   {"type": "panel_delivery", "date": "2025-03-12", "auto_calculated": true, "source": {"based_on": "shop_drawings_approval", "offset_weeks": 8}},
--   {"type": "completion", "date": "2025-04-01", "auto_calculated": false}
-- ]
