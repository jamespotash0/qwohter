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

// ============================================================================
// Date Parsing Utilities
// ============================================================================

/**
 * Parse natural language date expressions into ISO date strings
 * Handles: "tomorrow", "next Friday", "in 3 days", "next week", etc.
 *
 * @param dateExpression - Natural language date string
 * @param referenceDate - Base date for calculations (defaults to now)
 * @returns ISO date string (YYYY-MM-DD) or null if unparseable
 */
export function parseNaturalDate(
  dateExpression: string | null | undefined,
  referenceDate: Date = new Date()
): string | null {
  if (!dateExpression) return null;

  const input = dateExpression.trim().toLowerCase();

  // Already an ISO date format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  // Common date formats (MM/DD/YYYY, DD/MM/YYYY, etc.)
  const dateMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dateMatch) {
    const [, first, second, year] = dateMatch;
    // Assume MM/DD/YYYY format (US standard)
    const month = parseInt(first!, 10);
    const day = parseInt(second!, 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Create a working date starting at midnight
  const result = new Date(referenceDate);
  result.setHours(0, 0, 0, 0);

  // Today
  if (input === 'today' || input === 'now') {
    return formatDateToISO(result);
  }

  // Tomorrow
  if (input === 'tomorrow') {
    result.setDate(result.getDate() + 1);
    return formatDateToISO(result);
  }

  // Yesterday (for reference queries, not typically for due dates)
  if (input === 'yesterday') {
    result.setDate(result.getDate() - 1);
    return formatDateToISO(result);
  }

  // "In X days/weeks/months"
  const inPattern = /^in\s+(\d+)\s+(day|days|week|weeks|month|months)$/;
  const inMatch = input.match(inPattern);
  if (inMatch) {
    const amount = parseInt(inMatch[1]!, 10);
    const unit = inMatch[2]!;
    if (unit.startsWith('day')) {
      result.setDate(result.getDate() + amount);
    } else if (unit.startsWith('week')) {
      result.setDate(result.getDate() + amount * 7);
    } else if (unit.startsWith('month')) {
      result.setMonth(result.getMonth() + amount);
    }
    return formatDateToISO(result);
  }

  // "X days/weeks from now" or "X days/weeks from today"
  const fromNowPattern = /^(\d+)\s+(day|days|week|weeks|month|months)\s+(from\s+)?(now|today)$/;
  const fromNowMatch = input.match(fromNowPattern);
  if (fromNowMatch) {
    const amount = parseInt(fromNowMatch[1]!, 10);
    const unit = fromNowMatch[2]!;
    if (unit.startsWith('day')) {
      result.setDate(result.getDate() + amount);
    } else if (unit.startsWith('week')) {
      result.setDate(result.getDate() + amount * 7);
    } else if (unit.startsWith('month')) {
      result.setMonth(result.getMonth() + amount);
    }
    return formatDateToISO(result);
  }

  // "Next week" / "This week"
  if (input === 'next week') {
    // Next Monday
    const dayOfWeek = result.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    result.setDate(result.getDate() + daysUntilMonday);
    return formatDateToISO(result);
  }

  if (input === 'this week' || input === 'end of week') {
    // This Friday
    const dayOfWeek = result.getDay();
    const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 5 + 7 - dayOfWeek;
    result.setDate(result.getDate() + daysUntilFriday);
    return formatDateToISO(result);
  }

  // "Next month"
  if (input === 'next month') {
    result.setMonth(result.getMonth() + 1);
    result.setDate(1);
    return formatDateToISO(result);
  }

  // "End of month"
  if (input === 'end of month' || input === 'eom') {
    result.setMonth(result.getMonth() + 1);
    result.setDate(0); // Last day of current month
    return formatDateToISO(result);
  }

  // Days of the week: "Monday", "Tuesday", "next Monday", "this Friday", etc.
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const nextDayPattern = /^(next\s+|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/;
  const dayMatch = input.match(nextDayPattern);
  if (dayMatch) {
    const isNext = dayMatch[1]?.includes('next');
    const targetDay = dayNames.indexOf(dayMatch[2]!);
    const currentDay = result.getDay();

    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0 || isNext) {
      daysToAdd += 7;
    }
    if (isNext && daysToAdd <= 7) {
      daysToAdd += 7;
    }

    result.setDate(result.getDate() + daysToAdd);
    return formatDateToISO(result);
  }

  // "Month Day" format: "January 15", "Jan 15"
  const monthDayPattern = /^(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?$/;
  const monthDayMatch = input.match(monthDayPattern);
  if (monthDayMatch) {
    const monthName = monthDayMatch[1]!;
    const day = parseInt(monthDayMatch[2]!, 10);
    const monthIndex = getMonthIndex(monthName);

    if (monthIndex !== -1 && day >= 1 && day <= 31) {
      result.setMonth(monthIndex);
      result.setDate(day);

      // If the date is in the past, assume next year
      if (result < referenceDate) {
        result.setFullYear(result.getFullYear() + 1);
      }

      return formatDateToISO(result);
    }
  }

  // Could not parse - return null
  return null;
}

/**
 * Get month index from name (0-11)
 */
function getMonthIndex(monthName: string): number {
  const months: Record<string, number> = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11,
  };
  return months[monthName.toLowerCase()] ?? -1;
}

/**
 * Format a Date object to ISO date string (YYYY-MM-DD)
 */
function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============================================================================
// User Lookup Utilities
// ============================================================================

export interface TeamMember {
  id: string;
  email: string;
  displayName: string;
  role: 'Owner' | 'Admin' | 'Member';
}

/**
 * Look up a user by name, email, or partial match within an organization
 * Used to resolve "assign to John" type requests
 *
 * @param supabase - Supabase client
 * @param organizationId - Organization to search within
 * @param query - Name or email to search for
 * @returns Matching team member or null
 */
export async function lookupTeamMember(
  supabase: SupabaseClient,
  organizationId: string,
  query: string
): Promise<TeamMember | null> {
  if (!query || query.trim().length < 2) return null;

  const normalizedQuery = query.trim().toLowerCase();

  // Special case: "me" returns null (handled by caller with userId)
  if (normalizedQuery === 'me' || normalizedQuery === 'myself') {
    return null; // Signal to use current user
  }

  // Get all organization members
  const { data: members, error } = await supabase
    .from('organization_members')
    .select(`
      user_id,
      role,
      profiles:user_id (
        id,
        email,
        display_name
      )
    `)
    .eq('organization_id', organizationId);

  if (error || !members) {
    console.error('[lookupTeamMember] Failed to fetch members:', error);
    return null;
  }

  type MemberRow = {
    user_id: string;
    role: string;
    profiles: {
      id: string;
      email: string;
      display_name: string | null;
    } | null;
  };

  const memberList = members as MemberRow[];

  // Build searchable list
  const searchableMembers = memberList
    .filter(m => m.profiles)
    .map(m => ({
      id: m.profiles!.id,
      email: m.profiles!.email,
      displayName: m.profiles!.display_name || m.profiles!.email.split('@')[0] || 'Unknown',
      role: m.role as 'Owner' | 'Admin' | 'Member',
    }));

  // Exact email match
  const exactEmail = searchableMembers.find(
    m => m.email.toLowerCase() === normalizedQuery
  );
  if (exactEmail) return exactEmail;

  // Exact display name match
  const exactName = searchableMembers.find(
    m => m.displayName.toLowerCase() === normalizedQuery
  );
  if (exactName) return exactName;

  // Partial name match (starts with)
  const startsWithName = searchableMembers.find(
    m => m.displayName.toLowerCase().startsWith(normalizedQuery)
  );
  if (startsWithName) return startsWithName;

  // First name match
  const firstNameMatch = searchableMembers.find(m => {
    const firstName = m.displayName.split(' ')[0]?.toLowerCase();
    return firstName === normalizedQuery;
  });
  if (firstNameMatch) return firstNameMatch;

  // Contains match (less strict)
  const containsMatch = searchableMembers.find(
    m => m.displayName.toLowerCase().includes(normalizedQuery)
  );
  if (containsMatch) return containsMatch;

  // No match found
  return null;
}

/**
 * Get all team members for an organization
 * Useful for showing "who can this be assigned to" suggestions
 */
export async function getOrganizationTeamMembers(
  supabase: SupabaseClient,
  organizationId: string
): Promise<TeamMember[]> {
  const { data: members, error } = await supabase
    .from('organization_members')
    .select(`
      user_id,
      role,
      profiles:user_id (
        id,
        email,
        display_name
      )
    `)
    .eq('organization_id', organizationId);

  if (error || !members) {
    console.error('[getOrganizationTeamMembers] Failed to fetch members:', error);
    return [];
  }

  type MemberRow = {
    user_id: string;
    role: string;
    profiles: {
      id: string;
      email: string;
      display_name: string | null;
    } | null;
  };

  return (members as MemberRow[])
    .filter(m => m.profiles)
    .map(m => ({
      id: m.profiles!.id,
      email: m.profiles!.email,
      displayName: m.profiles!.display_name || m.profiles!.email.split('@')[0] || 'Unknown',
      role: m.role as 'Owner' | 'Admin' | 'Member',
    }));
}
