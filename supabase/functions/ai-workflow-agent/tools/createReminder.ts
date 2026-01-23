/**
 * Create Reminder Tool
 *
 * Creates a reminder (implemented as a task with notification).
 * Supports natural language dates like "tomorrow", "next Friday".
 */

import { createTool } from './toolRegistry.ts';
import { getNextTaskReference, parseNaturalDate } from './utils.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface CreateReminderParams {
  title?: string;
  due_date?: string;
  message?: string;
  priority?: string;
}

export const createReminderTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'create_reminder',
      description:
        'Create a reminder for a future date/time. IMPORTANT: Before creating, ask: 1) When should the reminder be sent? (required), 2) Would you like to create a related task to track this work? 3) Should this be connected to a specific project? Only proceed immediately if user provides the date/time upfront.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'What the user wants to be reminded about (e.g., "Follow up with client", "Review proposal")',
          },
          due_date: {
            type: ['string', 'null'],
            description: 'When to send the reminder - accepts ISO format (YYYY-MM-DD) OR natural language like "tomorrow", "next Friday", "in 3 days", "January 15". Required for timed reminders.',
          },
          message: {
            type: ['string', 'null'],
            description: 'Optional additional details or context for the reminder',
          },
          priority: {
            type: ['string', 'null'],
            enum: ['Low', 'Medium', 'High', null as any],
            description: 'Reminder priority level',
          },
        },
        required: ['title'],
        additionalProperties: false,
      },
    },
  },
  metadata: {
    requiresConfirmation: true,
    requiresProposalId: false, // Reminders can be standalone
    category: 'task',
  },
  execute: async (params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const { supabase, organizationId, userId, projectId, proposalId } = context;
    const reminderParams = params as CreateReminderParams;

    // Normalize priority
    const validPriorities = ['Low', 'Medium', 'High'];
    const rawPriority = (reminderParams.priority || 'Medium').trim();
    const normalizedPriority = rawPriority.charAt(0).toUpperCase() + rawPriority.slice(1).toLowerCase();
    const priority = validPriorities.includes(normalizedPriority) ? normalizedPriority : 'Medium';

    // Parse natural language date (e.g., "tomorrow", "next Friday" -> "2024-01-15")
    const parsedDueDate = parseNaturalDate(reminderParams.due_date);

    // Generate task reference
    const taskReference = await getNextTaskReference(supabase, organizationId);

    console.log('[create_reminder] Starting reminder creation:', {
      userId,
      organizationId,
      projectId,
      title: reminderParams.title,
      due_date: parsedDueDate,
      originalDueDate: reminderParams.due_date,
      priority,
      reference: taskReference,
    });

    const insertData = {
      project_id: projectId || null,
      organization_id: organizationId,
      reference: taskReference,
      title: reminderParams.title || 'Reminder',
      description: reminderParams.message || `Reminder: ${reminderParams.title || 'Follow up'}`,
      status: 'To Do',
      priority,
      due_date: parsedDueDate,
      created_by: userId,
      assigned_to: userId,
    };

    const { data: task, error: taskError } = await supabase
      .from('project_tasks')
      .insert(insertData)
      .select()
      .single();

    if (taskError) {
      console.error('[create_reminder] Insert failed:', {
        code: taskError.code,
        message: taskError.message,
        details: taskError.details,
        hint: taskError.hint,
      });
      return {
        success: false,
        error: `Failed to create reminder: ${taskError.message} (${taskError.code})`,
      };
    }

    console.log('[create_reminder] Task created successfully:', task.id);

    // Create scheduled notification if due_date was specified and parsed successfully
    if (parsedDueDate && task) {
      try {
        await supabase.from('scheduled_notifications').insert({
          entity_type: 'Task',
          entity_id: task.id,
          user_id: userId,
          organization_id: organizationId,
          scheduled_for: parsedDueDate,
          notification_type: 'Reminder',
          title: `Reminder: ${reminderParams.title || 'Follow up'}`,
          message: reminderParams.message || `Your reminder "${reminderParams.title}" is due`,
          link: `/task-board?task=${task.id}`,
          metadata: { proposal_id: proposalId },
        });
      } catch (notifError) {
        console.warn('Failed to create scheduled notification:', notifError);
      }
    }

    return {
      success: true,
      data: {
        id: task.id,
        title: reminderParams.title || 'Reminder',
        type: 'task',
        reference: taskReference,
      },
    };
  },
});
