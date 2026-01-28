/**
 * Organization Prefix Generator
 *
 * Generates a stable prefix for task references from an organization name.
 * This prefix is created once at org creation and never changes (Jira-style).
 *
 * Examples:
 * - "WallQu" -> "WAL" (single word: first 3 letters)
 * - "Acme Corp" -> "AC" (multi-word: first letter of each word)
 * - "B-Office Solutions" -> "BOS" (treats hyphens as word separators)
 */

/**
 * Generate organization prefix from name
 *
 * Rules:
 * - Single word: First 3 letters (uppercase)
 * - Multiple words: First letter of first 3 words (uppercase)
 * - Hyphens and underscores are treated as word separators
 * - Non-letter characters are stripped
 * - Returns 'TSK' if name cannot be parsed
 *
 * @param orgName - Organization name
 * @returns 2-3 character uppercase prefix
 */
export function generateOrgPrefix(orgName: string): string {
  if (!orgName?.trim()) {
    return 'TSK';
  }

  // Replace hyphens and underscores with spaces (word separators)
  // Remove everything except letters and spaces
  const cleanedName = orgName
    .replace(/[-_]/g, ' ')
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .toUpperCase();

  if (!cleanedName) {
    return 'TSK';
  }

  // Split into words
  const words = cleanedName.split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) {
    return 'TSK';
  }

  if (words.length === 1) {
    // Single word: take first 3 letters
    const lettersOnly = words[0]!.replace(/[^A-Z]/g, '');
    return lettersOnly.slice(0, 3) || 'TSK';
  }

  // Multiple words: first letter of first 3 words
  const initials = words
    .slice(0, 3)
    .map((w) => w.match(/[A-Z]/)?.[0] || '')
    .filter((c) => c.length > 0)
    .join('');

  return initials || 'TSK';
}

/**
 * Validate an org prefix
 *
 * @param prefix - Prefix to validate
 * @returns true if valid (2-5 uppercase letters)
 */
export function isValidOrgPrefix(prefix: string): boolean {
  return /^[A-Z]{2,5}$/.test(prefix);
}
