/**
 * Get Tasks Tool
 *
 * Search and list tasks (read-only, no confirmation needed).
 */

import { createTool } from './toolRegistry.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface GetTasksParams {
  status?: 'To Do' | 'In Progress' | 'Done';
  priority?: 'Low' | 'Medium' | 'High';
  assigned_to?: string;
  search_term?: string;
  include_overdue?: boolean;
  limit?: number;
}

type TaskRow = {
  id: string;
  reference: string | null;
  title: string;
  description: string | null;
  status: 'To Do' | 'In Progress' | 'Done';
  priority: 'Low' | 'Medium' | 'High' | null;
  due_date: string | null;
  assigned_to: string | null;
  created_at: string;
  proposal_id: string | null;
};

export const getTasksTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'get_tasks',
      description:
        'Search and list tasks. Use this when user asks about tasks, wants to see their to-do list, or asks about work items. Can filter by status (To Do, In Progress, Done), priority, or search by title.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: ['string', 'null'],
            enum: ['To Do', 'In Progress', 'Done', null as unknown as string],
            description: 'Filter by task status',
          },
          priority: {
            type: ['string', 'null'],
            enum: ['Low', 'Medium', 'High', null as unknown as string],
            description: 'Filter by priority level',
          },
          assigned_to: {
            type: ['string', 'null'],
            description: 'Filter by assigned user ID (use "me" for current user)',
          },
          search_term: {
            type: ['string', 'null'],
            description: 'Search in task title or description',
          },
          include_overdue: {
            type: ['boolean', 'null'],
            description: 'If true, only show overdue tasks',
          },
          limit: {
            type: ['number', 'null'],
            description: 'Maximum number of results (default 20, max 50)',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  metadata: {
    requiresConfirmation: false, // Read-only operation
    requiresProposalId: false,
    category: 'search',
  },
  execute: async (params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const { supabase, organizationId, userId } = context;
    const searchParams = params as GetTasksParams;

    console.log('[get_tasks] Searching tasks:', { organizationId, ...searchParams });

    const resultLimit = Math.min(searchParams.limit || 20, 50);

    // Build query
    let query = supabase
      .from('project_tasks')
      .select('id, reference, title, description, status, priority, due_date, assigned_to, created_at, proposal_id')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(resultLimit);

    // Apply filters
    if (searchParams.status) {
      query = query.eq('status', searchParams.status);
    }

    if (searchParams.priority) {
      query = query.eq('priority', searchParams.priority);
    }

    if (searchParams.assigned_to) {
      const assignee = searchParams.assigned_to === 'me' ? userId : searchParams.assigned_to;
      query = query.eq('assigned_to', assignee);
    }

    if (searchParams.search_term) {
      query = query.or(
        `title.ilike.%${searchParams.search_term}%,description.ilike.%${searchParams.search_term}%`
      );
    }

    if (searchParams.include_overdue) {
      const today = new Date().toISOString().split('T')[0];
      query = query.lt('due_date', today).neq('status', 'Done');
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('[get_tasks] Failed to fetch tasks:', error);
      return { success: false, error: `Failed to fetch tasks: ${error.message}` };
    }

    const typedTasks = (tasks ?? []) as TaskRow[];

    // Calculate overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Format results
    const formattedTasks = typedTasks.map(t => {
      const dueDate = t.due_date ? new Date(t.due_date) : null;
      const isOverdue = dueDate && dueDate < today && t.status !== 'Done';

      return {
        id: t.id,
        reference: t.reference || 'Task',
        title: t.title,
        status: t.status,
        priority: t.priority || 'Medium',
        dueDate: t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No due date',
        isOverdue,
        description: t.description || '',
      };
    });

    // Count by status
    const todoCount = formattedTasks.filter(t => t.status === 'To Do').length;
    const inProgressCount = formattedTasks.filter(t => t.status === 'In Progress').length;
    const doneCount = formattedTasks.filter(t => t.status === 'Done').length;
    const overdueCount = formattedTasks.filter(t => t.isOverdue).length;

    // Build summary
    let summary = `Found ${formattedTasks.length} task${formattedTasks.length !== 1 ? 's' : ''}`;
    if (searchParams.status) summary += ` with status "${searchParams.status}"`;
    if (searchParams.priority) summary += ` with ${searchParams.priority} priority`;
    summary += `. ${todoCount} to do, ${inProgressCount} in progress, ${doneCount} done.`;
    if (overdueCount > 0) summary += ` ${overdueCount} overdue!`;

    return {
      success: true,
      data: {
        id: 'tasks-search',
        title: 'Tasks Search',
        type: 'tasks',
        count: formattedTasks.length,
        todoCount,
        inProgressCount,
        doneCount,
        overdueCount,
        tasks: formattedTasks,
        summary,
      },
    };
  },
});
