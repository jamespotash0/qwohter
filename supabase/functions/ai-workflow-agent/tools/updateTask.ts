/**
 * Update Task Tool
 *
 * Updates an existing task's title, description, status, priority, or due date.
 */

import { createTool } from './toolRegistry.ts';
import { normalizeTaskPriority, normalizeTaskStatus } from './utils.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface UpdateTaskParams {
  task_id: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  assigned_to?: string;
}

export const updateTaskTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'update_task',
      description:
        'Update an existing task. Use when user wants to change a task title, mark it complete, update its priority, change the due date, or modify other task details.',
      parameters: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            description: 'The ID or reference of the task to update',
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
            enum: ['To Do', 'In Progress', 'Done', null as any],
            description: 'New status (To Do, In Progress, or Done)',
          },
          priority: {
            type: ['string', 'null'],
            enum: ['Low', 'Medium', 'High', null as any],
            description: 'New priority level',
          },
          due_date: {
            type: ['string', 'null'],
            description: 'New due date in ISO 8601 format (YYYY-MM-DD)',
          },
          assigned_to: {
            type: ['string', 'null'],
            description: 'User ID to assign the task to',
          },
        },
        required: ['task_id'],
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

    console.log('[update_task] Updating task:', taskParams.task_id);

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (taskParams.title !== undefined) {
      updateData.title = taskParams.title;
    }
    if (taskParams.description !== undefined) {
      updateData.description = taskParams.description;
    }
    if (taskParams.status !== undefined) {
      updateData.status = normalizeTaskStatus(taskParams.status);
    }
    if (taskParams.priority !== undefined) {
      updateData.priority = normalizeTaskPriority(taskParams.priority);
    }
    if (taskParams.due_date !== undefined) {
      updateData.due_date = taskParams.due_date;
    }
    if (taskParams.assigned_to !== undefined) {
      updateData.assigned_to = taskParams.assigned_to;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 1) {
      return {
        success: false,
        error: 'No fields provided to update',
      };
    }

    const { data: task, error: updateError } = await supabase
      .from('project_tasks')
      .update(updateData)
      .eq('id', taskParams.task_id)
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

    return {
      success: true,
      data: {
        id: task.id,
        title: task.title || 'Task Updated',
        type: 'task',
        reference: task.reference,
      },
    };
  },
});
