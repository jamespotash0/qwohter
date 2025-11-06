/**
 * Utility functions for detecting semantic markup in quote HTML
 *
 * Semantic markup includes data-type="dynamic" or data-type="conditional" attributes
 * that enable live-preview editing functionality.
 */

/**
 * Check if HTML contains semantic markup
 *
 * @param html - The HTML string to check
 * @returns true if semantic markup is detected, false otherwise
 */
export function hasSemanticMarkup(html: string): boolean {
  if (!html) return false;

  // Check for data-type attribute which indicates semantic markup
  return html.includes('data-type="dynamic"') || html.includes('data-type="conditional"');
}

/**
 * Check if a quote needs migration to semantic markup
 *
 * A quote needs migration if:
 * - It has customization data (was previously edited)
 * - But does NOT have semantic markup in the HTML
 *
 * @param quote - The quote object to check
 * @returns true if migration is recommended, false otherwise
 */
export function needsSemanticMarkupMigration(quote: any): boolean {
  // If quote has no customization, no migration needed (it will generate fresh)
  if (!quote.customization?.customSections && !quote.customization?.customHTML) {
    return false;
  }

  // Check the saved HTML for semantic markup
  const savedHTML = quote.customization?.customHTML || '';

  // If we have customization but no semantic markup, migration is recommended
  return !hasSemanticMarkup(savedHTML);
}

/**
 * Get a user-friendly migration message
 *
 * @returns Migration message explaining what will happen
 */
export function getMigrationMessage(): string {
  return `This quote was created before live-preview editing was available.
    Upgrading will enable real-time updates when you change form data,
    but any custom text edits will be lost. You can continue using the quote
    as-is, or upgrade to take advantage of the new editing features.`;
}
