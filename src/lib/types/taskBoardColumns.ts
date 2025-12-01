/**
 * Task Board Column Types
 */

export interface TaskBoardColumn {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  color: string;
  position: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskBoardColumnInput {
  name: string;
  slug?: string; // Auto-generated if not provided
  color?: string;
  position?: number;
}

export interface UpdateTaskBoardColumnInput {
  name?: string;
  color?: string;
  position?: number;
}

// Column colors using hex values (like Project Board)
export const COLUMN_COLORS = [
  { label: 'Slate', value: '#94A3B8' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Indigo', value: '#6366F1' },
  { label: 'Purple', value: '#8B5CF6' },
  { label: 'Pink', value: '#EC4899' },
  { label: 'Orange', value: '#F59E0B' },
  { label: 'Green', value: '#10B981' },
  { label: 'Yellow', value: '#EAB308' },
  { label: 'Red', value: '#EF4444' },
  { label: 'Teal', value: '#14B8A6' },
];
