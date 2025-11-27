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
        quote:quotes (
          project_name
        )
      )
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

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

  const { data, error } = await supabase
    .from('project_tasks')
    .insert({
      ...input,
      organization_id: organizationId,
      created_by: user.id,
      status: input.status || 'todo',
      priority: input.priority || 'medium',
    })
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

export async function updateProjectTask(
  taskId: string,
  input: UpdateProjectTaskInput
): Promise<ProjectTask> {
  const { data, error } = await supabase
    .from('project_tasks')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
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
