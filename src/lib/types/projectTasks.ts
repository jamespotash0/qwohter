/**
 * Project Tasks Types
 *
 * Type definitions for project task management system
 */

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface ProjectTask {
  id: string;
  project_id: string | null; // Nullable for standalone tasks
  organization_id: string;
  created_by: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  status: string; // Dynamic status from task_board_columns
  priority: TaskPriority;
  due_date: string | null;
  reference: string | null; // Auto-generated reference (e.g., CW-1, TES-2)
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
}

export interface UpdateProjectTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string | null;
  due_date?: string | null;
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
