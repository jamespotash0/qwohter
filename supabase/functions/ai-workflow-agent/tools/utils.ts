/**
 * Tool Utilities
 *
 * Shared utility functions for tool implementations.
 */

//@ts-ignore
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================================================
// Task Priority/Status Types
// ============================================================================

export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'To Do' | 'In Progress' | 'Done';

const TASK_PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High'];
const TASK_STATUSES: TaskStatus[] = ['To Do', 'In Progress', 'Done'];

// ============================================================================
// Normalization Functions
// ============================================================================

/**
 * Generic function to normalize a value to match an allowed list (case-insensitive)
 */
function normalizeEnumValue<T extends string>(
  value: string | null | undefined,
  allowedValues: T[],
  defaultValue: T
): T {
  if (!value) return defaultValue;

  const normalized = value.trim();

  // Exact match (case-insensitive)
  const exactMatch = allowedValues.find(
    (v) => v.toLowerCase() === normalized.toLowerCase()
  );
  if (exactMatch) return exactMatch;

  // Capitalize first letter, lowercase rest
  const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  if (allowedValues.includes(capitalized as T)) {
    return capitalized as T;
  }

  return defaultValue;
}

/**
 * Normalize task priority for database insertion
 * Accepts variations: "high", "HIGH", "High" -> "High"
 */
export function normalizeTaskPriority(
  priority: string | null | undefined,
  defaultPriority: TaskPriority = 'Medium'
): TaskPriority {
  return normalizeEnumValue(priority, TASK_PRIORITIES, defaultPriority);
}

/**
 * Normalize task status for database insertion
 * Accepts variations: "todo", "to do", "TO DO" -> "To Do"
 */
export function normalizeTaskStatus(
  status: string | null | undefined,
  defaultStatus: TaskStatus = 'To Do'
): TaskStatus {
  if (!status) return defaultStatus;

  const normalized = status.trim().toLowerCase().replace(/[-_]/g, ' ');

  const statusMap: Record<string, TaskStatus> = {
    'to do': 'To Do',
    'todo': 'To Do',
    'pending': 'To Do',
    'not started': 'To Do',
    'in progress': 'In Progress',
    'inprogress': 'In Progress',
    'working': 'In Progress',
    'active': 'In Progress',
    'done': 'Done',
    'complete': 'Done',
    'completed': 'Done',
    'finished': 'Done',
  };

  return statusMap[normalized] || defaultStatus;
}

// ============================================================================
// Reference Generation
// ============================================================================

/**
 * Generate org initials from name (e.g., "Acme Corp" -> "AC", "B-Office" -> "BO", "WallQu" -> "WAL")
 * Treats hyphens, underscores, and other separators as word boundaries.
 * Only uses letters (A-Z) for initials, skipping numbers and special characters.
 */
function getOrgInitials(orgName: string): string {
  if (!orgName?.trim()) return 'TSK';

  // Remove all non-letter characters except spaces, hyphens, underscores (word separators)
  // Then replace separators with spaces
  const normalizedName = orgName
    .replace(/[-_]/g, ' ')  // Convert separators to spaces
    .replace(/[^a-zA-Z\s]/g, '');  // Remove everything except letters and spaces

  const words = normalizedName.trim().toUpperCase().split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) return 'TSK';

  if (words.length === 1) {
    // Single word: take first 3 letters
    const lettersOnly = words[0]!.replace(/[^A-Z]/g, '');
    return lettersOnly.slice(0, 3) || 'TSK';
  }

  // Multiple words: take first letter of first 3 words (only if it's a letter)
  const initials = words
    .slice(0, 3)
    .map((w) => w.match(/[A-Z]/)?.[0] || '')
    .filter((c) => c.length > 0)
    .join('');

  return initials || 'TSK';
}

/**
 * Get the next task reference number for an organization
 */
export async function getNextTaskReference(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string> {
  // Get org name for prefix
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single();

  const orgData = org as { name: string } | null;
  const initials = getOrgInitials(orgData?.name || 'TASK');

  // Find max existing reference number
  const { data: tasks } = await supabase
    .from('project_tasks')
    .select('reference')
    .eq('organization_id', organizationId)
    .not('reference', 'is', null);

  let maxNum = 0;
  const pattern = new RegExp(`^${initials}-(\\d+)$`);

  const taskList = (tasks || []) as { reference: string | null }[];
  for (const task of taskList) {
    if (!task.reference) continue;
    const match = task.reference.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `${initials}-${maxNum + 1}`;
}

// ============================================================================
// Proposal Number Generation
// ============================================================================

/**
 * Get the next proposal number for an organization
 */
export async function getNextProposalNumber(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string> {
  const { data: lastProposal } = await supabase
    .from('proposals')
    .select('proposal_number')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastProposal?.proposal_number) {
    const match = lastProposal.proposal_number.match(/P-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `P-${String(nextNumber).padStart(3, '0')}`;
}
