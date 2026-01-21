/**
 * Project Tasks Types
 *
 * Type definitions for project task management system
 */

export type TaskStatus = 'To Do' | 'In Progress' | 'Done';

export type TaskPriority = 'Low' | 'Medium' | 'High';

export type ReminderRecurrence = 'once' | 'daily';

// Reminder preset types for quick selection in UI
export type ReminderPreset = 'none' | 'day_of' | '1_day' | '2_days' | '1_week' | 'custom';

export interface ProjectTask {
  id: string;
  project_id: string | null; // Nullable for standalone tasks
  proposal_id: string | null; // Optional link to a proposal
  organization_id: string;
  created_by: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  status: string; // Dynamic status from task_board_columns
  priority: TaskPriority;
  due_date: string | null;
  reference: string | null; // Auto-generated reference (e.g., CW-1, TES-2)
  position: number; // Position within column for drag/drop ordering
  // Reminder fields
  reminder_date: string | null; // Exact date/time for reminder (ISO 8601 / TIMESTAMPTZ)
  reminder_recurrence: ReminderRecurrence; // 'once' or 'daily'
  last_reminder_sent_at: string | null; // Timestamp of last sent reminder
  reminder_sent: boolean; // Whether reminder was sent
  created_at: string;
  updated_at: string;
  // Joined data
  creator?: {
    id: string;
    full_name: string;
    email: string;
  };
  assignee?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  // Project info (for task board - only when fetching org tasks)
  project?: {
    id: string;
    proposal_id?: string;
    proposal?: {
      project_name?: string;
      proposal_number?: string;
    };
  } | null;
}

export interface CreateProjectTaskInput {
  project_id?: string | null; // Optional for standalone tasks
  title: string;
  description?: string;
  status?: string; // Dynamic status from task_board_columns
  priority?: TaskPriority;
  assigned_to?: string;
  due_date?: string;
  // Reminder fields
  reminder_date?: string | null;
  reminder_recurrence?: ReminderRecurrence;
}

export interface UpdateProjectTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string | null;
  due_date?: string | null;
  position?: number;
  // Reminder fields
  reminder_date?: string | null;
  reminder_recurrence?: ReminderRecurrence;
  last_reminder_sent_at?: string | null;
  reminder_sent?: boolean;
}

export interface ReorderTasksInput {
  taskId: string;
  newStatus: string;
  newPosition: number;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  'To Do': 'To Do',
  'In Progress': 'In Progress',
  'Done': 'Done',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  'To Do': 'bg-gray-100 text-gray-700 border-gray-200',
  'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
  'Done': 'bg-green-100 text-green-700 border-green-200',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  'Low': 'Low',
  'Medium': 'Medium',
  'High': 'High',
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  'Low': 'bg-gray-100 text-gray-600',
  'Medium': 'bg-yellow-100 text-yellow-700',
  'High': 'bg-red-100 text-red-700',
};
