/**
 * Config Value Set Types
 *
 * Type definitions for shared value libraries stored in config_value_sets table.
 * These are referenced by config_schema via the values_ref property.
 *
 * Examples:
 * - "vinyl_colors" - 50+ vinyl color options
 * - "ral_paints" - 200+ RAL paint colors
 * - "standard_support_systems" - 5 support system options shared across all products
 */

// =============================================================================
// DATABASE TYPES
// =============================================================================

/**
 * Shared value set stored in config_value_sets table
 */
export interface ConfigValueSet {
  /** Unique identifier (UUID) */
  id: string;

  /**
   * URL-safe unique identifier used in config_schema values_ref
   * @example "vinyl_colors", "ral_paints", "standard_support_systems"
   */
  slug: string;

  /**
   * Human-readable display name
   * @example "Vinyl Colors", "RAL Paint Colors", "Standard Support Systems"
   */
  name: string;

  /**
   * Category for organizing value sets in admin UI
   * @example "materials", "colors", "hardware", "structural"
   */
  category?: string | null;

  /**
   * Optional manufacturer scoping
   * If set, this value set is specific to one manufacturer
   * If null, this value set is globally available
   */
  manufacturer_id?: string | null;

  /** Array of value options */
  values: ValueOption[];

  /** Timestamp when created */
  created_at: string;

  /** Timestamp when last updated */
  updated_at: string;
}

/**
 * Single value option within a value set
 */
export interface ValueOption {
  /**
   * Unique code identifier within the set
   * Used for storage and as the actual value saved to form data
   * @example "AW", "RAL9010", "PDRILL"
   */
  code: string;

  /**
   * Human-readable display label
   * @example "Arctic White", "Pure White (RAL 9010)", "Pre-Drilled Steel Beam"
   */
  label: string;

  /**
   * Color hex code for color swatches
   * @example "#FAFAFA", "#1E88E5"
   */
  hex?: string;

  /**
   * URL to swatch/preview image
   * Useful for materials, fabrics, patterns
   */
  image_url?: string;

  /**
   * Extended description shown in tooltips or details view
   */
  description?: string;

  /**
   * Sort order for display (lower = first)
   * If not specified, values are shown in array order
   */
  sort_order?: number;

  /**
   * Category for cascading/filtering relationships
   * Used when values need to be filtered by a parent selection
   * @example "Standard Vinyl", "Upgrade Fabric" for finish_color filtered by finish_style
   */
  category?: string;

  /**
   * Additional custom metadata
   * Useful for manufacturer-specific data, pricing info, etc.
   */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// INPUT TYPES (for create/update operations)
// =============================================================================

/**
 * Input for creating a new value set
 */
export interface CreateValueSetInput {
  slug: string;
  name: string;
  category?: string;
  manufacturer_id?: string;
  values: ValueOption[];
}

/**
 * Input for updating an existing value set
 */
export interface UpdateValueSetInput {
  slug?: string;
  name?: string;
  category?: string | null;
  manufacturer_id?: string | null;
  values?: ValueOption[];
}

/**
 * Input for adding values to an existing set
 */
export interface AddValuesInput {
  values: ValueOption[];
}

// =============================================================================
// QUERY/FILTER TYPES
// =============================================================================

/**
 * Filters for querying value sets
 */
export interface ValueSetFilters {
  /** Filter by category */
  category?: string;

  /** Filter by manufacturer (null = global only, undefined = all) */
  manufacturer_id?: string | null;

  /** Search in slug and name */
  search?: string;
}

/**
 * Value set list item (minimal fields for list views)
 */
export interface ValueSetListItem {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  manufacturer_id: string | null;
  value_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Value set usage information
 */
export interface ValueSetUsage {
  /** Value set slug */
  slug: string;

  /** Models that reference this value set */
  models: Array<{
    model_id: string;
    model_name: string;
    field_key: string;
  }>;

  /** Total usage count */
  usage_count: number;
}

// =============================================================================
// IMPORT/EXPORT TYPES
// =============================================================================

/**
 * CSV import row for bulk adding values
 */
export interface ValueImportRow {
  code: string;
  label: string;
  hex?: string;
  image_url?: string;
  description?: string;
  sort_order?: number;
}

/**
 * Result of a CSV import operation
 */
export interface ValueImportResult {
  /** Number of values successfully added */
  added: number;

  /** Number of existing values updated */
  updated: number;

  /** Number of values skipped (duplicates, invalid) */
  skipped: number;

  /** Error messages for failed rows */
  errors: Array<{
    row: number;
    code: string;
    message: string;
  }>;
}

// =============================================================================
// PREDEFINED CATEGORIES
// =============================================================================

/**
 * Common categories for organizing value sets
 */
export const VALUE_SET_CATEGORIES = [
  'materials',
  'colors',
  'finishes',
  'hardware',
  'structural',
  'track',
  'fabrics',
  'glass',
  'acoustic',
  'accessories',
  'other',
] as const;

export type ValueSetCategory = (typeof VALUE_SET_CATEGORIES)[number];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Type guard to check if a value is a valid ConfigValueSet
 */
export function isValidConfigValueSet(value: unknown): value is ConfigValueSet {
  if (typeof value !== 'object' || value === null) return false;

  const set = value as Record<string, unknown>;

  return (
    typeof set.id === 'string' &&
    typeof set.slug === 'string' &&
    typeof set.name === 'string' &&
    Array.isArray(set.values)
  );
}

/**
 * Type guard to check if a value is a valid ValueOption
 */
export function isValidValueOption(value: unknown): value is ValueOption {
  if (typeof value !== 'object' || value === null) return false;

  const opt = value as Record<string, unknown>;

  return typeof opt.code === 'string' && typeof opt.label === 'string';
}

/**
 * Generate a slug from a name
 * @example "Vinyl Colors" -> "vinyl_colors"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Validate a slug format
 * Must be lowercase alphanumeric with underscores, no spaces
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(slug);
}

/**
 * Sort value options by sort_order, then by label
 */
export function sortValueOptions(options: ValueOption[]): ValueOption[] {
  return [...options].sort((a, b) => {
    // Sort by sort_order first (undefined = last)
    const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // Then by label alphabetically
    return a.label.localeCompare(b.label);
  });
}

/**
 * Find a value option by code
 */
export function findValueByCode(
  options: ValueOption[],
  code: string
): ValueOption | undefined {
  return options.find((opt) => opt.code === code);
}

/**
 * Check if a code exists in the options
 */
export function codeExists(options: ValueOption[], code: string): boolean {
  return options.some((opt) => opt.code === code);
}

/**
 * Create an empty value set
 */
export function createEmptyValueSet(
  slug: string,
  name: string
): Omit<ConfigValueSet, 'id' | 'created_at' | 'updated_at'> {
  return {
    slug,
    name,
    category: null,
    manufacturer_id: null,
    values: [],
  };
}

/**
 * Parse CSV string to ValueOption array
 * Expected format: code,label,hex,image_url,description
 */
export function parseValuesCsv(csv: string): {
  values: ValueOption[];
  errors: string[];
} {
  const lines = csv.trim().split('\n');
  const values: ValueOption[] = [];
  const errors: string[] = [];

  // Skip header row if present
  const startIndex = lines[0]?.toLowerCase().includes('code') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;

    const parts = line.split(',').map((p) => p.trim());

    if (parts.length < 2) {
      errors.push(`Row ${i + 1}: Missing required fields (code, label)`);
      continue;
    }

    const [code, label, hex, image_url, description] = parts;

    if (!code || !label) {
      errors.push(`Row ${i + 1}: Code and label are required`);
      continue;
    }

    values.push({
      code,
      label,
      hex: hex || undefined,
      image_url: image_url || undefined,
      description: description || undefined,
      sort_order: values.length,
    });
  }

  return { values, errors };
}

/**
 * Convert ValueOption array to CSV string
 */
export function valuesToCsv(options: ValueOption[]): string {
  const header = 'code,label,hex,image_url,description';
  const rows = options.map(
    (opt) =>
      `${opt.code},${opt.label},${opt.hex || ''},${opt.image_url || ''},${opt.description || ''}`
  );

  return [header, ...rows].join('\n');
}
