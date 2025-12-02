/**
 * Task Board Columns Service
 *
 * Service for managing custom kanban board columns
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  TaskBoardColumn,
  CreateTaskBoardColumnInput,
  UpdateTaskBoardColumnInput,
} from '@/lib/types/taskBoardColumns';

/**
 * Generate a slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Fetch all columns for an organization
 */
export async function fetchTaskBoardColumns(organizationId: string): Promise<TaskBoardColumn[]> {
  const { data, error } = await supabase
    .from('task_board_columns')
    .select('*')
    .eq('organization_id', organizationId)
    .order('position', { ascending: true });

  if (error) throw error;
  return (data || []) as TaskBoardColumn[];
}

/**
 * Create a new column
 */
export async function createTaskBoardColumn(
  organizationId: string,
  input: CreateTaskBoardColumnInput
): Promise<TaskBoardColumn> {
  // Get the highest position
  const { data: existing } = await supabase
    .from('task_board_columns')
    .select('position')
    .eq('organization_id', organizationId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from('task_board_columns')
    .insert({
      organization_id: organizationId,
      name: input.name,
      slug: input.slug || generateSlug(input.name),
      color: input.color || '#94A3B8', // Slate gray
      position: input.position ?? nextPosition,
      is_default: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as TaskBoardColumn;
}

/**
 * Update a column
 */
export async function updateTaskBoardColumn(
  columnId: string,
  input: UpdateTaskBoardColumnInput
): Promise<TaskBoardColumn> {
  const { data, error } = await supabase
    .from('task_board_columns')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', columnId)
    .select()
    .single();

  if (error) throw error;
  return data as TaskBoardColumn;
}

/**
 * Delete a column (only non-default columns can be deleted)
 */
export async function deleteTaskBoardColumn(columnId: string): Promise<void> {
  // First check if it's a default column
  const { data: column } = await supabase
    .from('task_board_columns')
    .select('is_default')
    .eq('id', columnId)
    .single();

  if (column?.is_default) {
    throw new Error('Cannot delete default columns');
  }

  const { error } = await supabase
    .from('task_board_columns')
    .delete()
    .eq('id', columnId);

  if (error) throw error;
}

/**
 * Reorder columns by updating their positions
 */
export async function reorderTaskBoardColumns(
  organizationId: string,
  columnIds: string[]
): Promise<void> {
  // Update each column's position based on array index
  const updates = columnIds.map((id, index) => ({
    id,
    position: index,
    updated_at: new Date().toISOString(),
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from('task_board_columns')
      .update({ position: update.position, updated_at: update.updated_at })
      .eq('id', update.id)
      .eq('organization_id', organizationId);

    if (error) throw error;
  }
}
