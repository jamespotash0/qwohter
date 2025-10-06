-- Fix priority constraint to use capitalized values
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS projects_priority_check;

ALTER TABLE projects
ADD CONSTRAINT projects_priority_check CHECK (priority IN ('Highest', 'High', 'Medium', 'Low', 'Lowest'));

-- Update comment for clarity
COMMENT ON COLUMN projects.priority IS 'Project priority level: Highest, High, Medium, Low, Lowest (NULL for no priority)';
