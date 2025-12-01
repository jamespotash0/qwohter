/**
 * Board Service
 *
 * Centralized service for all board-related API calls (projects and workflow columns).
 * Used by React Query hooks for data fetching.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { TimelineMilestone } from '@/lib/timelineMilestones';

// ============================================================================
// Types
// ============================================================================

export type Project = Database['public']['Tables']['projects']['Row'] & {
  quote?: Database['public']['Tables']['quotes']['Row'] | null;
  timeline_milestones?: TimelineMilestone[];
};

export type WorkflowColumn = Database['public']['Tables']['project_workflow_columns']['Row'];

export type ProjectPriority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';

export interface CreateBoardItemData {
  quote_id: string;
  workflow_status: string;
  board_order?: number;
  priority?: ProjectPriority;
  completion_date?: string;
}

export interface UpdateBoardItemData {
  workflow_status?: string;
  board_order?: number | null;
  priority?: ProjectPriority | null;
  completion_date?: string | null;
  timeline_milestones?: TimelineMilestone[];
  updated_at?: string;
}

export interface CreateWorkflowColumnData {
  name: string;
  color: string;
  column_order: number;
  is_default: boolean;
}

export interface UpdateWorkflowColumnData {
  name?: string;
  color?: string;
  column_order?: number;
  is_default?: boolean;
}

// ============================================================================
// Project/Board Item Operations
// ============================================================================

/**
 * Fetch board items (projects) for an organization
 */
export async function fetchBoardItems(organizationId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      quotes!inner (
        id,
        proposal_number,
        project_name,
        quote_details,
        job_details,
        price_details,
        delivery_details,
        wall_details,
        status,
        is_main_version
      )
    `)
    .eq('organization_id', organizationId)
    .eq('quotes.is_main_version', true)
    .eq('quotes.status', 'Won')
    .order('board_order', { ascending: true });

  if (error) throw error;

  // Transform the data: Supabase returns 'quotes' as array, we need 'quote' as single object
  const transformedData = (data || []).map((item: any) => ({
    ...item,
    quote: Array.isArray(item.quotes) ? item.quotes[0] : item.quotes,
    quotes: undefined, // Remove the original quotes array
  }));

  return transformedData as Project[];
}

/**
 * Fetch single board item by ID
 */
export async function fetchBoardItemById(itemId: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      quotes!inner (
        id,
        proposal_number,
        project_name,
        quote_details,
        job_details,
        price_details,
        delivery_details,
        wall_details,
        status,
        is_main_version
      )
    `)
    .eq('id', itemId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Project not found');

  // Transform the data: Supabase returns 'quotes' as array, we need 'quote' as single object
  const transformedData = {
    ...data as any,
    quote: Array.isArray((data as any).quotes) ? (data as any).quotes[0] : (data as any).quotes,
    quotes: undefined,
  };

  return transformedData as Project;
}

/**
 * Create a new board item
 */
export async function createBoardItem(
  organizationId: string,
  itemData: CreateBoardItemData
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      ...itemData,
      organization_id: organizationId,
    } as any)
    .select(`
      *,
      quotes!inner (
        id,
        proposal_number,
        project_name,
        quote_details,
        job_details,
        price_details,
        status,
        is_main_version
      )
    `)
    .single();

  if (error) throw error;
  return data as Project;
}

/**
 * Update a board item
 */
export async function updateBoardItem(
  itemId: string,
  updates: UpdateBoardItemData
): Promise<Project> {
  // Convert undefined values to null for Supabase
  const cleanedUpdates = Object.fromEntries(
    Object.entries(updates).map(([key, value]) => [key, value === undefined ? null : value])
  );

  const { data, error } = await supabase
    .from('projects')
    .update(cleanedUpdates)
    .eq('id', itemId)
    .select(`
      *,
      quotes!inner (
        id,
        proposal_number,
        project_name,
        quote_details,
        job_details,
        price_details,
        status,
        is_main_version
      )
    `)
    .single();

  if (error) throw error;
  return data as Project;
}

/**
 * Delete a board item
 */
export async function deleteBoardItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

/**
 * Move board item to a different column
 */
export async function moveBoardItem(
  itemId: string,
  newColumnStatus: string,
  newOrder?: number
): Promise<Project> {
  const updates: UpdateBoardItemData = {
    workflow_status: newColumnStatus,
    updated_at: new Date().toISOString(),
  };

  if (newOrder !== undefined) {
    updates.board_order = newOrder;
  }

  return updateBoardItem(itemId, updates);
}

/**
 * Update board item priority
 */
export async function updateBoardItemPriority(
  itemId: string,
  priority: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest'
): Promise<Project> {
  return updateBoardItem(itemId, { priority });
}

/**
 * Set board item completion date
 */
export async function setBoardItemCompletionDate(
  itemId: string,
  completionDate: string | null
): Promise<Project> {
  return updateBoardItem(itemId, {
    completion_date: completionDate || undefined
  });
}

// ============================================================================
// Workflow Column Operations
// ============================================================================

/**
 * Fetch workflow columns for an organization
 */
export async function fetchWorkflowColumns(organizationId: string): Promise<WorkflowColumn[]> {
  const { data, error } = await supabase
    .from('project_workflow_columns')
    .select('*')
    .eq('organization_id', organizationId)
    .order('column_order', { ascending: true });

  if (error) throw error;
  return (data || []) as WorkflowColumn[];
}

/**
 * Create a new workflow column
 */
export async function createWorkflowColumn(
  organizationId: string,
  columnData: CreateWorkflowColumnData
): Promise<WorkflowColumn> {
  // Check for duplicate column names (case-insensitive)
  const { data: existingColumns } = await supabase
    .from('project_workflow_columns')
    .select('name')
    .eq('organization_id', organizationId)
    .ilike('name', columnData.name);

  if (existingColumns && existingColumns.length > 0) {
    throw new Error(`A workflow column named "${columnData.name}" already exists. Please choose a different name.`);
  }

  const { data, error } = await supabase
    .from('project_workflow_columns')
    .insert({
      ...columnData,
      organization_id: organizationId,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as WorkflowColumn;
}

/**
 * Update a workflow column
 */
export async function updateWorkflowColumn(
  columnId: string,
  updates: UpdateWorkflowColumnData
): Promise<WorkflowColumn> {
  // If renaming, check for duplicate column names (case-insensitive)
  if (updates.name) {
    // Get current column to find organization_id
    const { data: currentColumn } = await supabase
      .from('project_workflow_columns')
      .select('organization_id')
      .eq('id', columnId)
      .single();

    if (currentColumn) {
      const { data: existingColumns } = await supabase
        .from('project_workflow_columns')
        .select('id, name')
        .eq('organization_id', currentColumn.organization_id)
        .ilike('name', updates.name)
        .neq('id', columnId); // Exclude current column

      if (existingColumns && existingColumns.length > 0) {
        throw new Error(`A workflow column named "${updates.name}" already exists. Please choose a different name.`);
      }
    }
  }

  const { data, error } = await supabase
    .from('project_workflow_columns')
    .update(updates)
    .eq('id', columnId)
    .select()
    .single();

  if (error) throw error;
  return data as WorkflowColumn;
}

/**
 * Delete a workflow column
 */
export async function deleteWorkflowColumn(columnId: string): Promise<void> {
  const { error } = await supabase
    .from('project_workflow_columns')
    .delete()
    .eq('id', columnId);

  if (error) throw error;
}

/**
 * Reorder workflow columns
 */
export async function reorderWorkflowColumns(
  organizationId: string,
  columnOrders: { id: string; column_order: number }[]
): Promise<void> {
  // Update each column's order
  const updates = columnOrders.map((item) =>
    updateWorkflowColumn(item.id, { column_order: item.column_order })
  );

  await Promise.all(updates);
}

/**
 * Get default workflow column for organization
 */
export async function getDefaultWorkflowColumn(organizationId: string): Promise<WorkflowColumn | null> {
  const { data, error } = await supabase
    .from('project_workflow_columns')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_default', true)
    .maybeSingle();

  if (error) throw error;
  return data as WorkflowColumn | null;
}
