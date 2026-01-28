/**
 * Status Helper Utilities
 *
 * Provides case-insensitive status comparison helpers to prevent bugs
 * caused by inconsistent capitalization across the codebase.
 *
 * Usage:
 * ```typescript
 * // Instead of:
 * if (membership.status === 'Active') { ... }
 *
 * // Use:
 * if (isMembershipActive(membership.status)) { ... }
 * ```
 */

// ============================================================================
// MEMBERSHIP STATUS HELPERS
// ============================================================================

export type MembershipStatus = 'Active' | 'Pending' | 'Suspended' | 'Inactive';

/**
 * Check if membership status is Active (case-insensitive)
 */
export function isMembershipActive(status: string | null | undefined): boolean {
  return status?.toLowerCase() === 'active';
}

/**
 * Check if membership status is Pending (case-insensitive)
 */
export function isMembershipPending(status: string | null | undefined): boolean {
  return status?.toLowerCase() === 'pending';
}

/**
 * Check if membership status is Inactive (case-insensitive)
 */
export function isMembershipInactive(status: string | null | undefined): boolean {
  return status?.toLowerCase() === 'inactive';
}

/**
 * Check if membership status is Suspended (case-insensitive)
 */
export function isMembershipSuspended(status: string | null | undefined): boolean {
  return status?.toLowerCase() === 'suspended';
}

/**
 * Check if membership has any active status (Active or Pending)
 */
export function isMembershipValid(status: string | null | undefined): boolean {
  const lower = status?.toLowerCase();
  return lower === 'active' || lower === 'pending';
}

// ============================================================================
// PROPOSAL STATUS HELPERS (New system)
// ============================================================================

export type ProposalStatus = 'Won' | 'Rejected' | 'Submitted' | 'Draft';

/**
 * Check if proposal status is Won (case-insensitive)
 */
export function isProposalWon(status: string | null | undefined): boolean {
  return status?.toLowerCase() === 'won';
}

/**
 * Check if proposal status is Rejected (case-insensitive)
 */
export function isProposalRejected(status: string | null | undefined): boolean {
  return status?.toLowerCase() === 'rejected';
}

/**
 * Check if proposal status is Submitted (case-insensitive)
 */
export function isProposalSubmitted(status: string | null | undefined): boolean {
  return status?.toLowerCase() === 'submitted';
}

/**
 * Check if proposal status is Draft (case-insensitive)
 */
export function isProposalDraft(status: string | null | undefined): boolean {
  return status?.toLowerCase() === 'draft';
}

/**
 * Check if proposal is in a final state (Won or Rejected)
 */
export function isProposalFinal(status: string | null | undefined): boolean {
  const lower = status?.toLowerCase();
  return lower === 'won' || lower === 'rejected';
}

/**
 * Check if proposal can be edited (Draft only)
 */
export function isProposalEditable(status: string | null | undefined): boolean {
  return status?.toLowerCase() === 'draft';
}

// ============================================================================
// SUBSCRIPTION STATUS HELPERS
// ============================================================================

export type SubscriptionStatus = 'Active' | 'Trialing' | 'Canceled' | 'Paused' | 'Past Due' | 'Incomplete';

/**
 * Check if subscription status is Active (case-insensitive)
 */
export function isSubscriptionActive(status: string | null | undefined): boolean {
  return status?.toLowerCase() === 'active';
}

/**
 * Check if subscription status is Trialing (case-insensitive)
 */
export function isSubscriptionTrialing(status: string | null | undefined): boolean {
  return status?.toLowerCase() === 'trialing';
}

/**
 * Check if subscription status is Canceled (case-insensitive)
 */
export function isSubscriptionCanceled(status: string | null | undefined): boolean {
  const lower = status?.toLowerCase();
  return lower === 'canceled' || lower === 'cancelled'; // Handle both spellings
}

/**
 * Check if subscription status is Paused (case-insensitive)
 */
export function isSubscriptionPaused(status: string | null | undefined): boolean {
  return status?.toLowerCase() === 'paused';
}

/**
 * Check if subscription is valid (Active or Trialing)
 */
export function isSubscriptionValid(status: string | null | undefined): boolean {
  const lower = status?.toLowerCase();
  return lower === 'active' || lower === 'trialing';
}

// ============================================================================
// GENERIC STATUS MATCHER
// ============================================================================

/**
 * Case-insensitive status comparison
 * @param status - The status to check
 * @param expected - The expected status value(s)
 * @returns true if status matches any of the expected values (case-insensitive)
 *
 * @example
 * ```typescript
 * matchesStatus(member.status, 'Active') // true for 'Active', 'active', 'ACTIVE'
 * matchesStatus(proposal.status, ['Won', 'Rejected']) // true if won or rejected
 * ```
 */
export function matchesStatus(
  status: string | null | undefined,
  expected: string | string[]
): boolean {
  if (!status) return false;

  const lower = status.toLowerCase();
  const expectedArray = Array.isArray(expected) ? expected : [expected];

  return expectedArray.some(exp => exp.toLowerCase() === lower);
}

/**
 * Filter array by status (case-insensitive)
 * @param items - Array of items with status property
 * @param expectedStatus - Status value(s) to filter by
 * @returns Filtered array
 *

 * ```
 */
export function filterByStatus<T extends { status?: string | null }>(
  items: T[],
  expectedStatus: string | string[]
): T[] {
  return items.filter(item => matchesStatus(item.status, expectedStatus));
}

// ============================================================================
// ROLE HELPERS (same pattern as status helpers)
// ============================================================================

export type Role = 'Admin' | 'Member' | 'Owner';

/**
 * Check if role is Owner (case-insensitive)
 */
export function isRoleOwner(role: string | null | undefined): boolean {
  return role?.toLowerCase() === 'owner';
}

/**
 * Check if role is Admin (case-insensitive)
 */
export function isRoleAdmin(role: string | null | undefined): boolean {
  return role?.toLowerCase() === 'admin';
}

/**
 * Check if role is Member (case-insensitive)
 */
export function isRoleMember(role: string | null | undefined): boolean {
  return role?.toLowerCase() === 'member';
}

/**
 * Check if role has admin privileges (Admin or Owner)
 */
export function hasAdminPrivileges(role: string | null | undefined): boolean {
  const lower = role?.toLowerCase();
  return lower === 'admin' || lower === 'owner';
}

/**
 * Check if role can manage members (Admin or Owner)
 * Alias for hasAdminPrivileges for clarity
 */
export function canManageMembers(role: string | null | undefined): boolean {
  return hasAdminPrivileges(role);
}

/**
 * Case-insensitive role comparison
 * @param role - The role to check
 * @param expected - The expected role value(s)
 * @returns true if role matches any of the expected values (case-insensitive)
 */
export function matchesRole(
  role: string | null | undefined,
  expected: string | string[]
): boolean {
  return matchesStatus(role, expected); // Reuse matchesStatus logic
}

// ============================================================================
// DATABASE FIELD NORMALIZERS
// ============================================================================
// These functions normalize user input to match database constraints.
// Use before inserting/updating data to ensure proper capitalization.

/**
 * Valid proposal statuses that match database constraints
 */
export const PROPOSAL_STATUSES = ['Draft', 'Submitted', 'Won', 'Rejected'] as const;

/**
 * Valid membership statuses that match database constraints
 */
export const MEMBERSHIP_STATUSES = ['Active', 'Pending', 'Suspended', 'Inactive'] as const;

/**
 * Valid roles that match database constraints
 */
export const ROLES = ['Owner', 'Admin', 'Member'] as const;

/**
 * Valid task priorities that match database constraints
 */
export const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const;

/**
 * Valid task statuses that match database constraints
 */
export const TASK_STATUSES = ['To Do', 'In Progress', 'Done'] as const;

/**
 * Generic normalizer that converts user input to a valid DB enum value
 * @param value - User input (any case)
 * @param validValues - Array of valid values with correct capitalization
 * @param defaultValue - Optional default if no match found
 * @returns Properly capitalized value or null/default if invalid
 */
export function normalizeEnumValue<T extends string>(
  value: string | null | undefined,
  validValues: readonly T[],
  defaultValue?: T
): T | null {
  if (!value) return defaultValue ?? null;

  const normalized = value.trim().toLowerCase();
  const match = validValues.find(v => v.toLowerCase() === normalized);

  return match ?? defaultValue ?? null;
}

/**
 * Normalize proposal status for database insertion
 * @param status - User input (e.g., "draft", "DRAFT", "Draft")
 * @returns Properly capitalized status or null if invalid
 *
 * @example
 * normalizeProposalStatus('draft')     // 'Draft'
 * normalizeProposalStatus('WON')       // 'Won'
 * normalizeProposalStatus('invalid')   // null
 */
export function normalizeProposalStatus(status: string | null | undefined): ProposalStatus | null {
  return normalizeEnumValue(status, PROPOSAL_STATUSES);
}

/**
 * Normalize membership status for database insertion
 * @param status - User input (e.g., "active", "ACTIVE", "Active")
 * @returns Properly capitalized status or null if invalid
 */
export function normalizeMembershipStatus(status: string | null | undefined): MembershipStatus | null {
  return normalizeEnumValue(status, MEMBERSHIP_STATUSES);
}

/**
 * Normalize role for database insertion
 * @param role - User input (e.g., "admin", "ADMIN", "Admin")
 * @returns Properly capitalized role or null if invalid
 */
export function normalizeRole(role: string | null | undefined): Role | null {
  return normalizeEnumValue(role, ROLES);
}

/**
 * Normalize task priority for database insertion
 * @param priority - User input (e.g., "high", "HIGH", "High")
 * @param defaultPriority - Default if invalid (default: 'Medium')
 * @returns Properly capitalized priority
 */
export function normalizeTaskPriority(
  priority: string | null | undefined,
  defaultPriority: typeof TASK_PRIORITIES[number] = 'Medium'
): typeof TASK_PRIORITIES[number] {
  return normalizeEnumValue(priority, TASK_PRIORITIES, defaultPriority) ?? defaultPriority;
}

/**
 * Normalize task status for database insertion
 * @param status - User input (e.g., "to do", "TO DO", "To Do", "todo")
 * @param defaultStatus - Default if invalid (default: 'To Do')
 * @returns Properly capitalized status
 */
export function normalizeTaskStatus(
  status: string | null | undefined,
  defaultStatus: typeof TASK_STATUSES[number] = 'To Do'
): typeof TASK_STATUSES[number] {
  if (!status) return defaultStatus;

  // Handle common variations
  const normalized = status.trim().toLowerCase().replace(/[-_]/g, ' ');

  // Map common variations to standard values
  const statusMap: Record<string, typeof TASK_STATUSES[number]> = {
    'to do': 'To Do',
    'todo': 'To Do',
    'pending': 'To Do',
    'not started': 'To Do',
    'in progress': 'In Progress',
    'inprogress': 'In Progress',
    'working': 'In Progress',
    'started': 'In Progress',
    'done': 'Done',
    'completed': 'Done',
    'complete': 'Done',
    'finished': 'Done',
  };

  return statusMap[normalized] ?? defaultStatus;
}

// ============================================================================
// AI-RELATED NORMALIZERS
// ============================================================================

/**
 * Valid AI message roles that match database constraints
 */
export const AI_MESSAGE_ROLES = ['assistant', 'user', 'system'] as const;
export type AIMessageRole = (typeof AI_MESSAGE_ROLES)[number];

/**
 * Valid AI suggestion statuses that match database constraints
 */
export const AI_SUGGESTION_STATUSES = ['Pending', 'Applied', 'Dismissed', 'Expired'] as const;
export type AISuggestionStatus = (typeof AI_SUGGESTION_STATUSES)[number];

/**
 * Normalize AI message role for database insertion
 * @param role - User input (e.g., "user", "USER", "User")
 * @returns Properly capitalized role or null if invalid
 */
export function normalizeAIMessageRole(role: string | null | undefined): AIMessageRole | null {
  return normalizeEnumValue(role, AI_MESSAGE_ROLES);
}

/**
 * Normalize AI suggestion status for database insertion
 * @param status - User input (e.g., "pending", "PENDING", "Pending")
 * @returns Properly capitalized status or null if invalid
 */
export function normalizeAISuggestionStatus(
  status: string | null | undefined
): AISuggestionStatus | null {
  return normalizeEnumValue(status, AI_SUGGESTION_STATUSES);
}

// ============================================================================
// PROPOSAL APPROVAL NORMALIZERS
// ============================================================================

/**
 * Valid proposal approval request statuses that match database constraints
 */
export const PROPOSAL_APPROVAL_STATUSES = ['Pending', 'Approved', 'Rejected'] as const;
export type ProposalApprovalStatus = (typeof PROPOSAL_APPROVAL_STATUSES)[number];

/**
 * Normalize proposal approval status for database insertion
 * @param status - User input (e.g., "approved", "APPROVED", "Approved")
 * @returns Properly capitalized status or null if invalid
 */
export function normalizeProposalApprovalStatus(
  status: string | null | undefined
): ProposalApprovalStatus | null {
  return normalizeEnumValue(status, PROPOSAL_APPROVAL_STATUSES);
}

// ============================================================================
// PROPOSAL SIGNING NORMALIZERS
// ============================================================================

/**
 * Valid signature types that match database constraints
 */
export const SIGNATURE_TYPES = ['Type', 'Draw'] as const;
export type SignatureType = (typeof SIGNATURE_TYPES)[number];

/**
 * Valid signing activity event types that match database constraints
 */
export const SIGNING_EVENT_TYPES = ['Signed', 'Viewed', 'Sent', 'Opened', 'Declined'] as const;
export type SigningEventType = (typeof SIGNING_EVENT_TYPES)[number];

/**
 * Valid signing token statuses that match database constraints
 */
export const SIGNING_TOKEN_STATUSES = [
  'Pending',
  'Viewed',
  'Signed',
  'Expired',
  'Revoked',
] as const;
export type SigningTokenStatus = (typeof SIGNING_TOKEN_STATUSES)[number];

/**
 * Normalize signature type for database insertion
 * @param type - User input (e.g., "type", "TYPE", "Type", "draw", "DRAW")
 * @returns Properly capitalized type or null if invalid
 */
export function normalizeSignatureType(type: string | null | undefined): SignatureType | null {
  return normalizeEnumValue(type, SIGNATURE_TYPES);
}

/**
 * Normalize signing event type for database insertion
 * @param eventType - User input (e.g., "signed", "SIGNED", "Signed")
 * @returns Properly capitalized event type or null if invalid
 */
export function normalizeSigningEventType(
  eventType: string | null | undefined
): SigningEventType | null {
  return normalizeEnumValue(eventType, SIGNING_EVENT_TYPES);
}

/**
 * Normalize signing token status for database insertion
 * @param status - User input (e.g., "pending", "PENDING", "Pending")
 * @returns Properly capitalized status or null if invalid
 */
export function normalizeSigningTokenStatus(
  status: string | null | undefined
): SigningTokenStatus | null {
  return normalizeEnumValue(status, SIGNING_TOKEN_STATUSES);
}

// ============================================================================
// SCHEDULED NOTIFICATIONS NORMALIZERS
// ============================================================================

/**
 * Valid recurrence types that match database constraints
 */
export const RECURRENCE_TYPES = ['Daily', 'Once', 'Weekly'] as const;
export type RecurrenceType = (typeof RECURRENCE_TYPES)[number];

/**
 * Valid entity types for scheduled notifications that match database constraints
 */
export const NOTIFICATION_ENTITY_TYPES = ['Task', 'Proposal', 'Invoice', 'Project'] as const;
export type NotificationEntityType = (typeof NOTIFICATION_ENTITY_TYPES)[number];

/**
 * Normalize recurrence type for database insertion
 * @param recurrence - User input (e.g., "daily", "DAILY", "Daily")
 * @returns Properly capitalized recurrence type or null if invalid
 */
export function normalizeRecurrenceType(
  recurrence: string | null | undefined
): RecurrenceType | null {
  return normalizeEnumValue(recurrence, RECURRENCE_TYPES);
}

/**
 * Normalize notification entity type for database insertion
 * @param entityType - User input (e.g., "task", "TASK", "Task")
 * @returns Properly capitalized entity type or null if invalid
 */
export function normalizeNotificationEntityType(
  entityType: string | null | undefined
): NotificationEntityType | null {
  return normalizeEnumValue(entityType, NOTIFICATION_ENTITY_TYPES);
}
