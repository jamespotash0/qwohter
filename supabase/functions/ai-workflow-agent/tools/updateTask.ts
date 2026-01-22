/**
 * Update Task Tool
 *
 * Updates an existing task's title, description, status, priority, or due date.
 * Supports finding tasks by ID, reference, title search, or relative queries like "most recent".
 */

import { createTool } from './toolRegistry.ts';
import { normalizeTaskPriority, normalizeTaskStatus } from './utils.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface UpdateTaskParams {
  task_id?: string;
  task_reference?: string;
  task_query?: 'most_recent' | 'last_created' | 'newest';
  search_title?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  assigned_to?: string;
}

type TaskRow = {
  id: string;
  title: string;
  reference: string | null;
};

/**
 * Find a task based on various criteria
 */
async function findTask(
  supabase: ToolContext['supabase'],
  organizationId: string,
  params: UpdateTaskParams
): Promise<{ task: TaskRow | null; error: string | null }> {
  // Priority 1: Direct ID
  if (params.task_id) {
    const { data, error } = await supabase
      .from('project_tasks')
      .select('id, title, reference')
      .eq('id', params.task_id)
      .eq('organization_id', organizationId)
      .single();

    if (error) return { task: null, error: `Task not found with ID: ${params.task_id}` };
    return { task: data as TaskRow, error: null };
  }

  // Priority 2: Reference number (e.g., "WAL-42")
  if (params.task_reference) {
    const { data, error } = await supabase
      .from('project_tasks')
      .select('id, title, reference')
      .eq('reference', params.task_reference.toUpperCase())
      .eq('organization_id', organizationId)
      .single();

    if (error) return { task: null, error: `Task not found with reference: ${params.task_reference}` };
    return { task: data as TaskRow, error: null };
  }

  // Priority 3: Query-based search (most_recent, last_created, newest)
  if (params.task_query) {
    const { data, error } = await supabase
      .from('project_tasks')
      .select('id, title, reference')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) return { task: null, error: 'No tasks found in this organization' };
    return { task: data as TaskRow, error: null };
  }

  // Priority 4: Title search
  if (params.search_title) {
    const { data, error } = await supabase
      .from('project_tasks')
      .select('id, title, reference')
      .eq('organization_id', organizationId)
      .ilike('title', `%${params.search_title}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) return { task: null, error: `No task found matching: "${params.search_title}"` };
    return { task: data as TaskRow, error: null };
  }

  return { task: null, error: 'No task identifier provided. Please specify task_id, task_reference, task_query, or search_title.' };
}

export const updateTaskTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'update_task',
      description:
        'Update an existing task. Can find tasks by: task_id (UUID), task_reference (e.g., "WAL-42"), task_query ("most_recent" for the last created task), or search_title (partial match). Can modify: title, description, status, priority, due date, assigned user. CANNOT modify: task reference number - these are system-generated and immutable.',
      parameters: {
        type: 'object',
        properties: {
          task_id: {
            type: ['string', 'null'],
            description: 'The UUID of the task to update (if known)',
          },
          task_reference: {
            type: ['string', 'null'],
            description: 'The reference number of the task (e.g., "WAL-42", "BO-1")',
          },
          task_query: {
            type: ['string', 'null'],
            enum: ['most_recent', 'last_created', 'newest', null as unknown as string],
            description: 'Query to find task: "most_recent" or "last_created" for the newest task',
          },
          search_title: {
            type: ['string', 'null'],
            description: 'Search for task by title (partial match)',
          },
          title: {
            type: ['string', 'null'],
            description: 'New title for the task',
          },
          description: {
            type: ['string', 'null'],
            description: 'New description for the task',
          },
          status: {
            type: ['string', 'null'],
            enum: ['To Do', 'In Progress', 'Done', null as unknown as string],
            description: 'New status (To Do, In Progress, or Done)',
          },
          priority: {
            type: ['string', 'null'],
            enum: ['Low', 'Medium', 'High', null as unknown as string],
            description: 'New priority level',
          },
          due_date: {
            type: ['string', 'null'],
            description: 'New due date in ISO 8601 format (YYYY-MM-DD). For relative dates like "tomorrow", convert to actual date.',
          },
          assigned_to: {
            type: ['string', 'null'],
            description: 'User ID to assign the task to',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  metadata: {
    requiresConfirmation: true,
    requiresProposalId: false,
    category: 'task',
  },
  execute: async (params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const { supabase, organizationId } = context;
    const taskParams = params as unknown as UpdateTaskParams;

    console.log('[update_task] Finding and updating task:', {
      task_id: taskParams.task_id,
      task_reference: taskParams.task_reference,
      task_query: taskParams.task_query,
      search_title: taskParams.search_title,
    });

    // First, find the task
    const { task, error: findError } = await findTask(supabase, organizationId, taskParams);

    if (findError || !task) {
      console.error('[update_task] Failed to find task:', findError);
      return {
        success: false,
        error: findError || 'Task not found',
      };
    }

    console.log('[update_task] Found task:', task.id, task.reference, task.title);

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (taskParams.title !== undefined && taskParams.title !== null) {
      updateData.title = taskParams.title;
    }
    if (taskParams.description !== undefined && taskParams.description !== null) {
      updateData.description = taskParams.description;
    }
    if (taskParams.status !== undefined && taskParams.status !== null) {
      updateData.status = normalizeTaskStatus(taskParams.status);
    }
    if (taskParams.priority !== undefined && taskParams.priority !== null) {
      updateData.priority = normalizeTaskPriority(taskParams.priority);
    }
    if (taskParams.due_date !== undefined && taskParams.due_date !== null) {
      updateData.due_date = taskParams.due_date;
    }
    if (taskParams.assigned_to !== undefined && taskParams.assigned_to !== null) {
      updateData.assigned_to = taskParams.assigned_to;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 1) {
      return {
        success: false,
        error: 'No fields provided to update',
      };
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from('project_tasks')
      .update(updateData)
      .eq('id', task.id)
      .eq('organization_id', organizationId)
      .select('id, title, reference')
      .single();

    if (updateError) {
      console.error('[update_task] Failed to update task:', updateError);
      return {
        success: false,
        error: `Failed to update task: ${updateError.message}`,
      };
    }

    const updatedTaskData = updatedTask as TaskRow;

    return {
      success: true,
      data: {
        id: updatedTaskData.id,
        title: updatedTaskData.title || 'Task Updated',
        type: 'task',
        reference: updatedTaskData.reference,
      },
    };
  },
});
