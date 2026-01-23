/**
 * Create Task Tool
 *
 * Creates a task for tracking work items.
 * Supports natural language dates and user assignment by name.
 */

import { createTool } from './toolRegistry.ts';
import {
  normalizeTaskPriority,
  getNextTaskReference,
  parseNaturalDate,
  lookupTeamMember,
} from './utils.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface CreateTaskParams {
  title?: string;
  description?: string;
  due_date?: string;
  priority?: string;
  assigned_to?: string; // Can be user ID, name, or "me"
}

export const createTaskTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'create_task',
      description:
        'Create a task for tracking work items. IMPORTANT: Before creating a task, ask the user for key details they might want to include: 1) Priority (High/Medium/Low), 2) Due date, 3) Any additional description. Only create immediately if user provides all details upfront or explicitly says to skip details.',
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
            description: 'Due date - accepts ISO format (YYYY-MM-DD) OR natural language like "tomorrow", "next Friday", "in 3 days", "January 15"',
          },
          priority: {
            type: ['string', 'null'],
            enum: ['Low', 'Medium', 'High', null as any],
            description: 'Task priority level. Default is medium if not specified.',
          },
          assigned_to: {
            type: ['string', 'null'],
            description: 'Who to assign the task to. Can be "me" for current user, a team member name like "John", or a user ID.',
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

    // Parse natural language date (e.g., "tomorrow", "next Friday" -> "2024-01-15")
    const parsedDueDate = parseNaturalDate(taskParams.due_date);

    // Resolve assigned_to - can be "me", a name, or a user ID
    let assignedToUserId = userId; // Default to current user
    if (taskParams.assigned_to) {
      const assignee = taskParams.assigned_to.toLowerCase().trim();
      if (assignee === 'me' || assignee === 'myself') {
        assignedToUserId = userId;
      } else if (assignee.match(/^[0-9a-f-]{36}$/)) {
        // Already a UUID
        assignedToUserId = taskParams.assigned_to;
      } else {
        // Look up by name
        const member = await lookupTeamMember(supabase, organizationId, taskParams.assigned_to);
        if (member) {
          assignedToUserId = member.id;
          console.log(`[create_task] Resolved "${taskParams.assigned_to}" to user ${member.displayName} (${member.id})`);
        } else {
          console.warn(`[create_task] Could not find team member "${taskParams.assigned_to}", defaulting to current user`);
        }
      }
    }

    // Generate task reference number (e.g., "WAL-42")
    const taskReference = await getNextTaskReference(supabase, organizationId);

    console.log('[create_task] Starting task creation:', {
      userId,
      organizationId,
      projectId,
      title: taskParams.title,
      priority,
      reference: taskReference,
      dueDate: parsedDueDate,
      assignedTo: assignedToUserId,
    });

    const insertData = {
      project_id: projectId || null, // null for standalone tasks
      organization_id: organizationId,
      reference: taskReference,
      title: taskParams.title || 'New Task',
      description: taskParams.description || '',
      status: 'To Do',
      priority,
      due_date: parsedDueDate,
      created_by: userId,
      assigned_to: assignedToUserId,
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
