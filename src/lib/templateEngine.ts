/**
 * LiquidJS Template Engine Configuration
 *
 * Used for dynamic product configuration templates.
 * Templates are stored in Supabase and rendered client-side.
 */

import { Liquid } from 'liquidjs';

// Create engine instance with strict mode for better error handling
const engine = new Liquid({
  strictFilters: true,
  strictVariables: false, // Allow undefined variables to render as empty
  trimTagRight: true,
  trimTagLeft: true,
});

// =============================================================================
// Custom Filters
// =============================================================================

/**
 * Format number as currency (USD)
 * Usage: {{ price | currency }}
 */
engine.registerFilter('currency', (value: number | string | null | undefined): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num === null || num === undefined || isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
});

/**
 * Format number as percentage
 * Usage: {{ 0.15 | percentage }} => "15%"
 */
engine.registerFilter('percentage', (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '0%';
  return `${(value * 100).toFixed(0)}%`;
});

/**
 * Format number with commas
 * Usage: {{ 1234567 | number_format }} => "1,234,567"
 */
engine.registerFilter('number_format', (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat('en-US').format(value);
});

/**
 * Calculate price with markup
 * Usage: {{ base_price | with_markup: 0.35 }}
 */
engine.registerFilter('with_markup', (value: number, markup: number): number => {
  if (!value || !markup) return value || 0;
  return value * (1 + markup);
});

/**
 * Calculate price with discount
 * Usage: {{ price | with_discount: 0.10 }}
 */
engine.registerFilter('with_discount', (value: number, discount: number): number => {
  if (!value) return 0;
  if (!discount) return value;
  return value * (1 - discount);
});

/**
 * Safe JSON stringify for data attributes
 * Usage: data-options='{{ options | json }}'
 */
engine.registerFilter('json', (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
});

/**
 * Get value from object by key (useful for dynamic access)
 * Usage: {{ options | get: selected_key }}
 */
engine.registerFilter('get', (obj: Record<string, unknown>, key: string): unknown => {
  if (!obj || typeof obj !== 'object') return null;
  return obj[key];
});

/**
 * Filter array by property value
 * Usage: {{ options | where: "category", "dimensions" }}
 */
engine.registerFilter('where_prop', (
  array: Array<Record<string, unknown>>,
  property: string,
  value: unknown
): Array<Record<string, unknown>> => {
  if (!Array.isArray(array)) return [];
  return array.filter(item => item[property] === value);
});

/**
 * Sum array of numbers or property values
 * Usage: {{ prices | sum }} or {{ items | sum: "price" }}
 */
engine.registerFilter('sum', (
  array: Array<number | Record<string, number>>,
  property?: string
): number => {
  if (!Array.isArray(array)) return 0;
  return array.reduce((total, item) => {
    if (property && typeof item === 'object') {
      return total + (item[property] || 0);
    }
    return total + (typeof item === 'number' ? item : 0);
  }, 0);
});

/**
 * Convert inches to feet and inches display
 * Usage: {{ 78 | inches_display }} => "6' 6\""
 */
engine.registerFilter('inches_display', (inches: number): string => {
  if (!inches) return '0"';
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  if (feet === 0) return `${remainingInches}"`;
  if (remainingInches === 0) return `${feet}'`;
  return `${feet}' ${remainingInches}"`;
});

/**
 * Convert square feet display
 * Usage: {{ 150 | sqft }} => "150 sq ft"
 */
engine.registerFilter('sqft', (value: number): string => {
  if (!value) return '0 sq ft';
  return `${new Intl.NumberFormat('en-US').format(value)} sq ft`;
});

// =============================================================================
// Custom Tags (if needed in future)
// =============================================================================

// Example: {% price_calculator base=100 markup=0.35 %}
// Can be added later if needed for complex calculations

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Render a template string with data
 */
export async function renderTemplate(
  template: string,
  data: Record<string, unknown>
): Promise<string> {
  try {
    return await engine.parseAndRender(template, data);
  } catch (error) {
    console.error('[templateEngine] Render error:', error);
    throw error;
  }
}

/**
 * Render a template synchronously (for simpler cases)
 */
export function renderTemplateSync(
  template: string,
  data: Record<string, unknown>
): string {
  try {
    return engine.parseAndRenderSync(template, data);
  } catch (error) {
    console.error('[templateEngine] Render error:', error);
    throw error;
  }
}

/**
 * Validate a template (check for syntax errors)
 */
export function validateTemplate(template: string): { valid: boolean; error?: string } {
  try {
    engine.parse(template);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown template error',
    };
  }
}

/**
 * Calculate price from selections and pricing rules
 */
export function calculateConfiguratorPrice(
  basePrice: number,
  selections: Record<string, string | number>,
  priceModifiers: Array<{
    condition_field: string;
    condition_value: string | number;
    price_adjustment: number;
    adjustment_type: 'fixed' | 'percentage';
  }>
): number {
  let total = basePrice;

  for (const modifier of priceModifiers) {
    const selectedValue = selections[modifier.condition_field];

    if (selectedValue === modifier.condition_value) {
      if (modifier.adjustment_type === 'fixed') {
        total += modifier.price_adjustment;
      } else if (modifier.adjustment_type === 'percentage') {
        total += basePrice * modifier.price_adjustment;
      }
    }
  }

  return Math.round(total * 100) / 100; // Round to 2 decimal places
}

// Export the engine for advanced usage
export { engine };
