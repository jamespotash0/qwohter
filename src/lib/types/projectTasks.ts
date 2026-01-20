/**
 * Project Tasks Types
 *
 * Type definitions for project task management system
 */

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high';

export type ReminderRecurrence = 'once' | 'daily' | 'hourly';

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
  remind_before_days: number | null; // Days before due_date to start reminders (null = no reminder)
  reminder_time: string | null; // Time of day to send reminder (e.g., "09:00:00")
  reminder_recurrence: ReminderRecurrence; // 'once', 'daily', or 'hourly'
  reminder_hours_before: number | null; // For hourly: hours before due time to remind
  last_reminder_sent_at: string | null; // Timestamp of last sent reminder
  reminder_sent: boolean; // Legacy: whether one-time reminder was sent
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
  remind_before_days?: number | null;
  reminder_time?: string;
  reminder_recurrence?: ReminderRecurrence;
  reminder_hours_before?: number | null;
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
  remind_before_days?: number | null;
  reminder_time?: string | null;
  reminder_recurrence?: ReminderRecurrence;
  reminder_hours_before?: number | null;
  last_reminder_sent_at?: string | null;
  reminder_sent?: boolean;
}

export interface ReorderTasksInput {
  taskId: string;
  newStatus: string;
  newPosition: number;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-gray-100 text-gray-700 border-gray-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  done: 'bg-green-100 text-green-700 border-green-200',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};
