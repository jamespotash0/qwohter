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
// QUOTE STATUS HELPERS
// ============================================================================

export type QuoteStatus = 'Won' | 'Rejected' | 'Submitted' | 'Draft' | 'Incomplete';

/**
 * Check if quote status is Won (case-insensitive)
 */
export function isQuoteWon(status: string | null | undefined): boolean {
  return status?.toLowerCase() === 'won';
}

/**
 * Check if quote status is Rejected (case-insensitive)
 */
export function isQuoteRejected(status: string | null | undefined): boolean {
  return status?.toLowerCase() === 'rejected';
}

/**
 * Check if quote status is Submitted (case-insensitive)
 */
export function isQuoteSubmitted(status: string | null | undefined): boolean {
  return status?.toLowerCase() === 'submitted';
}

/**
 * Check if quote status is Draft (case-insensitive)
 */
export function isQuoteDraft(status: string | null | undefined): boolean {
  return status?.toLowerCase() === 'draft';
}

/**
 * Check if quote status is Incomplete (case-insensitive)
 */
export function isQuoteIncomplete(status: string | null | undefined): boolean {
  return status?.toLowerCase() === 'incomplete';
}

/**
 * Check if quote is in a final state (Won or Rejected)
 */
export function isQuoteFinal(status: string | null | undefined): boolean {
  const lower = status?.toLowerCase();
  return lower === 'won' || lower === 'rejected';
}

/**
 * Check if quote is in progress (Submitted, Draft, Incomplete)
 */
export function isQuoteInProgress(status: string | null | undefined): boolean {
  const lower = status?.toLowerCase();
  return lower === 'submitted' || lower === 'draft' || lower === 'incomplete';
}

/**
 * Check if quote can be edited (Draft or Incomplete)
 */
export function isQuoteEditable(status: string | null | undefined): boolean {
  const lower = status?.toLowerCase();
  return lower === 'draft' || lower === 'incomplete';
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
 * matchesStatus(quote.status, ['Won', 'Rejected']) // true if won or rejected
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
 * @example
 * ```typescript
 * const activeMembers = filterByStatus(members, 'Active');
 * const finalQuotes = filterByStatus(quotes, ['Won', 'Rejected']);
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
