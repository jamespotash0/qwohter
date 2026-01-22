/**
 * Create Task Tool
 *
 * Creates a task for tracking work items.
 */

import { createTool } from './toolRegistry.ts';
import { normalizeTaskPriority, getNextTaskReference } from './utils.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface CreateTaskParams {
  title?: string;
  description?: string;
  due_date?: string;
  priority?: string;
}

export const createTaskTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'create_task',
      description:
        'Create a task for tracking work items. Use when user mentions needing to do something like call someone, send an email, follow up, review something, schedule a meeting, or complete any action item.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Clear, actionable task title describing what needs to be done (e.g., "Call John about the project", "Review contract terms")',
          },
          description: {
            type: ['string', 'null'],
            description: 'Optional additional details or context about the task',
          },
          due_date: {
            type: ['string', 'null'],
            description: 'Due date in ISO 8601 format (YYYY-MM-DD) or relative like "tomorrow", "next Friday". Parse to YYYY-MM-DD format.',
          },
          priority: {
            type: ['string', 'null'],
            enum: ['Low', 'Medium', 'High', null as any],
            description: 'Task priority level. Default is medium if not specified.',
          },
        },
        required: ['title'],
        additionalProperties: false,
      },
    },
  },
  metadata: {
    requiresConfirmation: true,
    requiresProposalId: false, // Tasks can be standalone
    category: 'task',
  },
  execute: async (params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const { supabase, organizationId, userId, projectId } = context;
    const taskParams = params as CreateTaskParams;

    // Normalize priority
    const priority = normalizeTaskPriority(taskParams.priority);

    // Generate task reference number (e.g., "WAL-42")
    const taskReference = await getNextTaskReference(supabase, organizationId);

    console.log('[create_task] Starting task creation:', {
      userId,
      organizationId,
      projectId,
      title: taskParams.title,
      priority,
      reference: taskReference,
    });

    const insertData = {
      project_id: projectId || null, // null for standalone tasks
      organization_id: organizationId,
      reference: taskReference,
      title: taskParams.title || 'New Task',
      description: taskParams.description || '',
      status: 'To Do',
      priority,
      due_date: taskParams.due_date || null,
      created_by: userId,
      assigned_to: userId,
    };

    const { data: task, error: taskError } = await supabase
      .from('project_tasks')
      .insert(insertData)
      .select()
      .single();

    if (taskError) {
      console.error('[create_task] Insert failed:', {
        code: taskError.code,
        message: taskError.message,
        details: taskError.details,
        hint: taskError.hint,
      });
      return {
        success: false,
        error: `Failed to create task: ${taskError.message} (${taskError.code})`,
      };
    }

    console.log('[create_task] Task created successfully:', task.id);

    return {
      success: true,
      data: {
        id: task.id,
        title: taskParams.title || 'New Task',
        type: 'task',
        reference: taskReference,
      },
    };
  },
});
