/**
 * Project Tasks Service
 *
 * Service for managing project tasks
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ProjectTask,
  CreateProjectTaskInput,
  UpdateProjectTaskInput,
} from '@/lib/types/projectTasks';

// =============================================================================
// Task Reference Generation (app-side with retry)
// =============================================================================

/**
 * Generate org initials from name (e.g., "Acme Corp" -> "AC", "WallQu" -> "WAL")
 */
function getOrgInitials(orgName: string): string {
  if (!orgName?.trim()) return 'TSK';

  const words = orgName.trim().toUpperCase().split(/\s+/).filter(w => w.length > 0);

  if (words.length === 0) return 'TSK';

  if (words.length === 1) {
    // Single word: take first 3 chars
    return words[0]!.slice(0, 3);
  }

  // Multiple words: take first letter of each (max 3)
  return words
    .slice(0, 3)
    .map(w => w[0])
    .join('');
}

/**
 * Get the next task reference number for an organization
 */
async function getNextTaskReference(organizationId: string): Promise<string> {
  // Get org name for prefix
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single();

  const orgData = org as { name: string } | null;
  const initials = getOrgInitials(orgData?.name || 'TASK');

  // Find max existing reference number
  const { data: tasks } = await supabase
    .from('project_tasks')
    .select('reference')
    .eq('organization_id', organizationId)
    .not('reference', 'is', null);

  let maxNum = 0;
  const pattern = new RegExp(`^${initials}-(\\d+)$`);

  const taskList = (tasks || []) as { reference: string | null }[];
  for (const task of taskList) {
    if (!task.reference) continue;
    const match = task.reference.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `${initials}-${maxNum + 1}`;
}

const MAX_RETRY_ATTEMPTS = 3;

export async function fetchProjectTasks(projectId: string): Promise<ProjectTask[]> {
  const { data, error } = await supabase
    .from('project_tasks')
    .select(`
      *,
      creator:profiles!project_tasks_created_by_fkey (
        id,
        full_name,
        email
      ),
      assignee:profiles!project_tasks_assigned_to_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as ProjectTask[];
}

/**
 * Fetch all tasks for an organization (for Task Board)
 * Includes project info for linked tasks
 */
export async function fetchOrganizationTasks(organizationId: string): Promise<ProjectTask[]> {
  const { data, error } = await supabase
    .from('project_tasks')
    .select(`
      *,
      creator:profiles!project_tasks_created_by_fkey (
        id,
        full_name,
        email
      ),
      assignee:profiles!project_tasks_assigned_to_fkey (
        id,
        full_name,
        email
      ),
      project:projects (
        id,
        proposal_id,
        proposal:proposals (
          project_name,
          proposal_number
        )
      )
    `)
    .eq('organization_id', organizationId)
    .order('position', { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as ProjectTask[];
}

export async function fetchProjectTaskById(taskId: string): Promise<ProjectTask> {
  const { data, error } = await supabase
    .from('project_tasks')
    .select(`
      *,
      creator:profiles!project_tasks_created_by_fkey (
        id,
        full_name,
        email
      ),
      assignee:profiles!project_tasks_assigned_to_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq('id', taskId)
    .single();

  if (error) throw error;
  return data as unknown as ProjectTask;
}

export async function createProjectTask(
  organizationId: string,
  input: CreateProjectTaskInput
): Promise<ProjectTask> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Retry loop for handling reference conflicts (race condition)
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    // Generate reference app-side (allows retry on conflict)
    const reference = await getNextTaskReference(organizationId);

    // Build insert object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertData: any = {
      organization_id: organizationId,
      created_by: user.id,
      reference, // App-generated reference
      title: input.title,
      description: input.description || null,
      status: input.status || 'todo',
      priority: input.priority || null,
      due_date: input.due_date || null,
      assigned_to: input.assigned_to || null,
    };

    // Only include project_id if it's truthy (not null/undefined)
    if (input.project_id) {
      insertData.project_id = input.project_id;
    }

    const { data, error } = await supabase
      .from('project_tasks')
      .insert(insertData)
      .select(`
        *,
        creator:profiles!project_tasks_created_by_fkey (
          id,
          full_name,
          email
        ),
        assignee:profiles!project_tasks_assigned_to_fkey (
          id,
          full_name,
          email
        )
      `)
      .single();

    if (!error) {
      return data as unknown as ProjectTask;
    }

    // Check if it's a duplicate reference error (code 23505)
    if (error.code === '23505' && error.message.includes('reference')) {
      lastError = new Error(`Duplicate reference conflict: ${error.message}`);
      // Small delay before retry to reduce collision chance
      await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
      continue;
    }

    // Other error - throw immediately
    throw error;
  }

  // All retries failed
  throw lastError || new Error('Failed to create task after multiple attempts');
}

export async function updateProjectTask(
  taskId: string,
  input: UpdateProjectTaskInput
): Promise<ProjectTask> {
  // Type assertion needed until migration is applied and types regenerated
  const { data, error } = await (supabase
    .from('project_tasks') as ReturnType<typeof supabase.from>)
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('id', taskId)
    .select(`
      *,
      creator:profiles!project_tasks_created_by_fkey (
        id,
        full_name,
        email
      ),
      assignee:profiles!project_tasks_assigned_to_fkey (
        id,
        full_name,
        email
      )
    `)
    .single();

  if (error) throw error;
  return data as unknown as ProjectTask;
}

export async function deleteProjectTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('project_tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw error;
}

export async function assignTask(taskId: string, userId: string | null): Promise<ProjectTask> {
  return updateProjectTask(taskId, { assigned_to: userId });
}

export async function updateTaskStatus(
  taskId: string,
  status: 'todo' | 'in_progress' | 'done'
): Promise<ProjectTask> {
  return updateProjectTask(taskId, { status });
}

export async function updateTaskPriority(
  taskId: string,
  priority: 'low' | 'medium' | 'high'
): Promise<ProjectTask> {
  return updateProjectTask(taskId, { priority });
}

// Type helper for task position queries
interface TaskPositionRow {
  id: string;
  position: number;
  status?: string;
}

/**
 * Reorder a task within or across columns
 * Updates the task's status and position, and shifts other tasks accordingly
 */
export async function reorderTask(
  organizationId: string,
  taskId: string,
  newStatus: string,
  newPosition: number
): Promise<void> {
  // Get the current task to know its old status
  const { data: currentTaskData, error: fetchError } = await supabase
    .from('project_tasks')
    .select('status, position')
    .eq('id', taskId)
    .single();

  if (fetchError) throw fetchError;

  const currentTask = currentTaskData as unknown as { status: string; position: number };
  const oldStatus = currentTask.status;
  const oldPosition = currentTask.position;
  const isSameColumn = oldStatus === newStatus;

  // Helper to shift tasks
  const shiftTasks = async (tasks: TaskPositionRow[], delta: number) => {
    for (const task of tasks) {
      await (supabase
        .from('project_tasks') as ReturnType<typeof supabase.from>)
        .update({ position: task.position + delta } as Record<string, unknown>)
        .eq('id', task.id);
    }
  };

  // 1. If moving to different column, shift tasks in old column up
  if (!isSameColumn) {
    const { data: tasksToShiftData } = await supabase
      .from('project_tasks')
      .select('id, position')
      .eq('organization_id', organizationId)
      .eq('status', oldStatus)
      .gt('position', oldPosition);

    const tasksToShift = (tasksToShiftData || []) as unknown as TaskPositionRow[];
    await shiftTasks(tasksToShift, -1);
  }

  // 2. Shift tasks in target column to make room
  if (isSameColumn) {
    // Moving within same column
    if (newPosition < oldPosition) {
      // Moving up: shift tasks between newPosition and oldPosition down
      const { data: tasksToShiftData } = await supabase
        .from('project_tasks')
        .select('id, position')
        .eq('organization_id', organizationId)
        .eq('status', newStatus)
        .gte('position', newPosition)
        .lt('position', oldPosition);

      const tasksToShift = (tasksToShiftData || []) as unknown as TaskPositionRow[];
      await shiftTasks(tasksToShift, 1);
    } else if (newPosition > oldPosition) {
      // Moving down: shift tasks between oldPosition and newPosition up
      const { data: tasksToShiftData } = await supabase
        .from('project_tasks')
        .select('id, position')
        .eq('organization_id', organizationId)
        .eq('status', newStatus)
        .gt('position', oldPosition)
        .lte('position', newPosition);

      const tasksToShift = (tasksToShiftData || []) as unknown as TaskPositionRow[];
      await shiftTasks(tasksToShift, -1);
    }
  } else {
    // Moving to different column: shift tasks at and after newPosition down
    const { data: tasksToShiftData } = await supabase
      .from('project_tasks')
      .select('id, position')
      .eq('organization_id', organizationId)
      .eq('status', newStatus)
      .gte('position', newPosition);

    const tasksToShift = (tasksToShiftData || []) as unknown as TaskPositionRow[];
    await shiftTasks(tasksToShift, 1);
  }

  // 3. Update the dragged task's status and position
  const { error: updateError } = await (supabase
    .from('project_tasks') as ReturnType<typeof supabase.from>)
    .update({
      status: newStatus,
      position: newPosition,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('id', taskId);

  if (updateError) throw updateError;
}
