-- Add priority and completion_date columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('highest', 'high', 'medium', 'low', 'lowest')),
ADD COLUMN IF NOT EXISTS completion_date DATE;

-- Update any existing 'normal' or 'medium' values to NULL
UPDATE projects SET priority = NULL WHERE priority IN ('normal', 'medium');

-- Add comment for clarity
COMMENT ON COLUMN projects.priority IS 'Project priority level: highest, high, medium, low, lowest (NULL for no priority)';
COMMENT ON COLUMN projects.completion_date IS 'Target or actual completion date for the project';
