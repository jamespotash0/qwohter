-- Update task reference generation to use organization name instead of task title
-- This creates references like CW-1 for "Contemporary Walls" organization

-- Update the function to use organization name
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

-- Regenerate all existing task references using the new logic
-- This will update KLK-1 to CW-1, etc.
DO $$
DECLARE
  org RECORD;
  task RECORD;
  initials TEXT;
  words TEXT[];
  word TEXT;
  new_ref TEXT;
  org_task_count INTEGER;
BEGIN
  -- Process each organization that has tasks
  FOR org IN
    SELECT DISTINCT o.id, o.name
    FROM public.project_tasks pt
    JOIN public.organizations o ON o.id = pt.organization_id
  LOOP
    -- Generate initials for this organization
    words := string_to_array(upper(trim(org.name)), ' ');
    initials := '';

    FOREACH word IN ARRAY words LOOP
      IF length(word) > 0 THEN
        initials := initials || left(word, 1);
      END IF;
      EXIT WHEN length(initials) >= 3;
    END LOOP;

    IF array_length(words, 1) = 1 AND length(initials) < 3 THEN
      initials := upper(left(trim(org.name), 3));
    END IF;

    IF length(initials) < 2 THEN
      initials := upper(left(trim(org.name), 2));
    END IF;

    -- Reset counter for this org
    org_task_count := 0;

    -- Update all tasks for this organization in order of creation
    FOR task IN
      SELECT id
      FROM public.project_tasks
      WHERE organization_id = org.id
      ORDER BY created_at
    LOOP
      org_task_count := org_task_count + 1;
      new_ref := initials || '-' || org_task_count;

      UPDATE public.project_tasks
      SET reference = new_ref
      WHERE id = task.id;
    END LOOP;
  END LOOP;
END $$;

COMMENT ON FUNCTION generate_task_reference IS 'Generates task reference from organization name (e.g., CW-1 for Contemporary Walls)';
