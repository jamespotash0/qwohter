-- Add reference field to project_tasks for auto-generated task IDs
-- Format: 2-3 letter initials + "-" + number (e.g., CW-1, TES-2)

-- Add reference column
ALTER TABLE public.project_tasks
ADD COLUMN IF NOT EXISTS reference TEXT;

-- Add unique constraint per organization
ALTER TABLE public.project_tasks
ADD CONSTRAINT project_tasks_reference_unique UNIQUE (organization_id, reference);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_tasks_reference ON public.project_tasks(organization_id, reference);

-- Function to generate task reference based on organization name
CREATE OR REPLACE FUNCTION generate_task_reference(
  org_id UUID,
  task_title TEXT -- kept for backwards compatibility but not used
) RETURNS TEXT AS $$
DECLARE
  org_name TEXT;
  initials TEXT;
  words TEXT[];
  word TEXT;
  next_num INTEGER;
  new_ref TEXT;
BEGIN
  -- Get organization name
  SELECT name INTO org_name
  FROM public.organizations
  WHERE id = org_id;

  -- Fallback if org not found
  IF org_name IS NULL OR org_name = '' THEN
    org_name := 'TASK';
  END IF;

  -- Split org name into words and get initials (max 3 characters)
  words := string_to_array(upper(trim(org_name)), ' ');
  initials := '';

  FOREACH word IN ARRAY words LOOP
    IF length(word) > 0 THEN
      initials := initials || left(word, 1);
    END IF;
    EXIT WHEN length(initials) >= 3;
  END LOOP;

  -- If single word and less than 3 chars, take more letters
  IF array_length(words, 1) = 1 AND length(initials) < 3 THEN
    initials := upper(left(trim(org_name), 3));
  END IF;

  -- Ensure we have at least 2 characters
  IF length(initials) < 2 THEN
    initials := upper(left(trim(org_name), 2));
  END IF;

  -- Find the next number for this organization (sequential across all tasks)
  SELECT COALESCE(MAX(
    CAST(
      REGEXP_REPLACE(reference, '^[A-Z]+-', '') AS INTEGER
    )
  ), 0) + 1 INTO next_num
  FROM public.project_tasks
  WHERE organization_id = org_id
    AND reference ~ '^[A-Z]+-[0-9]+$';

  new_ref := initials || '-' || next_num;

  RETURN new_ref;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-generate reference on insert
CREATE OR REPLACE FUNCTION auto_generate_task_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := generate_task_reference(NEW.organization_id, NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS task_reference_trigger ON public.project_tasks;
CREATE TRIGGER task_reference_trigger
  BEFORE INSERT ON public.project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_task_reference();

-- Generate references for existing tasks that don't have one
DO $$
DECLARE
  task RECORD;
BEGIN
  FOR task IN
    SELECT id, organization_id, title
    FROM public.project_tasks
    WHERE reference IS NULL OR reference = ''
    ORDER BY created_at
  LOOP
    UPDATE public.project_tasks
    SET reference = generate_task_reference(task.organization_id, task.title)
    WHERE id = task.id;
  END LOOP;
END $$;

COMMENT ON COLUMN public.project_tasks.reference IS 'Auto-generated task reference (e.g., CW-1, TES-2)';
