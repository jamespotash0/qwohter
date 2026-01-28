-- Migration: Update task priority and status to use human-readable capitalized values
-- Priority: 'low'/'medium'/'high' -> 'Low'/'Medium'/'High'
-- Status: 'todo'/'in_progress'/'done' -> 'To Do'/'In Progress'/'Done'

-- =============================================================================
-- Step 1: DROP the old priority constraint FIRST (before any updates)
-- This allows updates to work regardless of current values
-- =============================================================================
ALTER TABLE public.project_tasks DROP CONSTRAINT IF EXISTS project_tasks_priority_check;

-- =============================================================================
-- Step 2: Update existing priority data to use capitalized values
-- =============================================================================
UPDATE public.project_tasks SET priority = 'Low' WHERE priority = 'low';
UPDATE public.project_tasks SET priority = 'Medium' WHERE priority = 'medium';
UPDATE public.project_tasks SET priority = 'High' WHERE priority = 'high';

-- =============================================================================
-- Step 3: Update existing status data to use human-readable values
-- =============================================================================
UPDATE public.project_tasks SET status = 'To Do' WHERE status = 'todo';
UPDATE public.project_tasks SET status = 'In Progress' WHERE status = 'in_progress';
UPDATE public.project_tasks SET status = 'Done' WHERE status = 'done';

-- =============================================================================
-- Step 4: Update the task_board_columns slugs to match new status values
-- =============================================================================
UPDATE public.task_board_columns SET slug = 'To Do', name = 'To Do' WHERE slug = 'todo';
UPDATE public.task_board_columns SET slug = 'In Progress', name = 'In Progress' WHERE slug = 'in_progress';
UPDATE public.task_board_columns SET slug = 'Done', name = 'Done' WHERE slug = 'done';

-- =============================================================================
-- Step 5: Add the new priority constraint with capitalized values
-- =============================================================================
ALTER TABLE public.project_tasks ADD CONSTRAINT project_tasks_priority_check
    CHECK (priority IS NULL OR priority IN ('Low', 'Medium', 'High'));

-- Note: Status constraint was already relaxed in 20251127000002_create_task_board_columns.sql
-- to allow custom column statuses (CHECK status IS NOT NULL AND status <> ''), so no constraint change needed.
