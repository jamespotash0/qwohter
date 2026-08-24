/**
 * Project Hub Service
 *
 * The project is the job. Everything a dealer does after a quote is won already
 * carries a project_id — proposals, sales orders, manufacturer orders,
 * receipts, work orders, tasks, attachments, payment jobs — and this reads that
 * graph back as one thing.
 *
 * Two of the four reads here are views rather than tables, on purpose:
 *
 *   project_activity  notes UNIONed with events derived from the tables that
 *                     already hold those facts. A written activity log is a
 *                     second copy, and the copy is what goes stale.
 *   project_progress  where the job actually is, rolled up from its orders.
 *                     Distinct from projects.workflow_status, which is the
 *                     Kanban column somebody dragged it to — an intention, not
 *                     a fact.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type NoteRow = Database['public']['Tables']['project_notes']['Row'];
type ChangeOrderRow = Database['public']['Tables']['change_orders']['Row'];
type ActivityRow = Database['public']['Views']['project_activity']['Row'];
type ProgressRow = Database['public']['Views']['project_progress']['Row'];

export type ProjectNote = NoteRow;
export type ChangeOrder = ChangeOrderRow;
export type ProjectActivity = ActivityRow;
export type ProjectProgress = ProgressRow;

export type ChangeOrderStatus = NonNullable<ChangeOrderRow['status']>;

/**
 * Trimmed value, or null when absent or blank. An explicit helper rather than
 * `??`, which keeps an empty string — and a blank change order number stored as
 * '' reads as a real one everywhere it is displayed.
 */
const trimmedOrNull = (value: string | null | undefined): string | null => {
  const t = value?.trim();
  return t === undefined || t.length === 0 ? null : t;
};

/** Statuses where the dealer still owes the customer an answer or a price. */
export const OPEN_CHANGE_ORDER_STATUSES: ChangeOrderStatus[] = [
  'Requested',
  'Pricing',
  'Submitted',
];

// ============================================================================
// Progress
// ============================================================================

export async function getProjectProgress(
  projectId: string
): Promise<ProjectProgress | null> {
  const { data, error } = await supabase
    .from('project_progress')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) {
    console.error('[projectHubService] getProjectProgress failed:', error);
    throw new Error(`Failed to load project progress: ${error.message}`);
  }

  return (data as unknown as ProjectProgress) ?? null;
}

/** Progress for every project in an organization, keyed by project id. */
export async function getAllProjectProgress(
  organizationId: string
): Promise<Record<string, ProjectProgress>> {
  const { data, error } = await supabase
    .from('project_progress')
    .select('*')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('[projectHubService] getAllProjectProgress failed:', error);
    throw new Error(`Failed to load project progress: ${error.message}`);
  }

  const rows = (data || []) as unknown as ProjectProgress[];
  return Object.fromEntries(rows.map(row => [row.project_id as string, row]));
}

// ============================================================================
// Activity
// ============================================================================

/**
 * The project timeline, pinned notes first and then newest.
 *
 * Ordered here rather than in the view because "pinned first" is a presentation
 * decision — site access details stay relevant for months while a status update
 * does not — and a caller building an export would want it strictly
 * chronological.
 */
export async function getProjectActivity(
  projectId: string,
  limit = 200
): Promise<ProjectActivity[]> {
  const { data, error } = await supabase
    .from('project_activity')
    .select('*')
    .eq('project_id', projectId)
    .order('is_pinned', { ascending: false })
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[projectHubService] getProjectActivity failed:', error);
    throw new Error(`Failed to load project activity: ${error.message}`);
  }

  return (data || []) as unknown as ProjectActivity[];
}

// ============================================================================
// Notes
// ============================================================================

export interface CreateNoteInput {
  organization_id: string;
  project_id: string;
  body: string;
  is_pinned?: boolean;
}

export async function createProjectNote(input: CreateNoteInput): Promise<ProjectNote> {
  const body = input.body.trim();
  if (!body) {
    throw new Error('A note needs something in it.');
  }

  const { data: auth } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('project_notes')
    .insert({
      organization_id: input.organization_id,
      project_id: input.project_id,
      body,
      is_pinned: input.is_pinned ?? false,
      created_by: auth.user?.id ?? null,
    } as never)
    .select()
    .single();

  if (error) {
    console.error('[projectHubService] createProjectNote failed:', error);
    throw new Error(`Failed to save the note: ${error.message}`);
  }

  return data as unknown as ProjectNote;
}

export async function setNotePinned(
  noteId: string,
  isPinned: boolean
): Promise<ProjectNote> {
  const { data, error } = await supabase
    .from('project_notes')
    .update({ is_pinned: isPinned } as never)
    .eq('id', noteId)
    .select()
    .single();

  if (error) {
    console.error('[projectHubService] setNotePinned failed:', error);
    throw new Error(`Failed to update the note: ${error.message}`);
  }

  return data as unknown as ProjectNote;
}

export async function deleteProjectNote(noteId: string): Promise<void> {
  const { error } = await supabase.from('project_notes').delete().eq('id', noteId);

  if (error) {
    console.error('[projectHubService] deleteProjectNote failed:', error);
    throw new Error(`Failed to delete the note: ${error.message}`);
  }
}

// ============================================================================
// Change orders
// ============================================================================

export async function getChangeOrders(projectId: string): Promise<ChangeOrder[]> {
  const { data, error } = await supabase
    .from('change_orders')
    .select('*')
    .eq('project_id', projectId)
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('[projectHubService] getChangeOrders failed:', error);
    throw new Error(`Failed to load change orders: ${error.message}`);
  }

  return (data || []) as unknown as ChangeOrder[];
}

export interface CreateChangeOrderInput {
  organization_id: string;
  project_id: string;
  title: string;
  description?: string | null;
  change_order_number?: string | null;
  requested_by_name?: string | null;
  requested_at?: string | null;
  sell_delta?: number | null;
  cost_delta?: number | null;
}

export async function createChangeOrder(
  input: CreateChangeOrderInput
): Promise<ChangeOrder> {
  const title = input.title.trim();
  if (!title) {
    throw new Error('A change order needs a title.');
  }

  const { data: auth } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('change_orders')
    .insert({
      ...input,
      title,
      description: trimmedOrNull(input.description),
      change_order_number: trimmedOrNull(input.change_order_number),
      requested_by_name: trimmedOrNull(input.requested_by_name),
      created_by: auth.user?.id ?? null,
    } as never)
    .select()
    .single();

  if (error) {
    console.error('[projectHubService] createChangeOrder failed:', error);
    throw new Error(`Failed to create the change order: ${error.message}`);
  }

  return data as unknown as ChangeOrder;
}

export interface UpdateChangeOrderInput {
  status?: ChangeOrderStatus;
  title?: string;
  description?: string | null;
  sell_delta?: number | null;
  cost_delta?: number | null;
  responded_at?: string | null;
  notes?: string | null;
}

/**
 * Update a change order.
 *
 * Approving or rejecting stamps `responded_at` when the caller has not, because
 * the database requires an answered change order to say when it was answered —
 * and the date somebody clicked is the honest default.
 */
export async function updateChangeOrder(
  changeOrderId: string,
  patch: UpdateChangeOrderInput
): Promise<ChangeOrder> {
  const answered = patch.status === 'Approved' || patch.status === 'Rejected';
  const payload = {
    ...patch,
    responded_at:
      patch.responded_at ??
      (answered ? new Date().toISOString().slice(0, 10) : undefined),
  };

  const { data, error } = await supabase
    .from('change_orders')
    .update(payload as never)
    .eq('id', changeOrderId)
    .select()
    .single();

  if (error) {
    console.error('[projectHubService] updateChangeOrder failed:', error);
    throw new Error(`Failed to update the change order: ${error.message}`);
  }

  return data as unknown as ChangeOrder;
}
