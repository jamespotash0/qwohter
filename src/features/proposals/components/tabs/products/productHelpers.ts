/**
 * Shared utility functions for product display and data processing.
 * Extracted from ProductsTab to keep sub-components focused.
 */

/** Format a number as USD currency */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format dimension value to feet-inches notation.
 * Input: "16" -> "16'", "12-3" -> "12'-3""
 */
export const formatDimension = (value: string): string => {
  if (!value) return '';
  const trimmed = value.trim();

  if (trimmed.includes('-')) {
    const [feet, inches] = trimmed.split('-');
    return `${feet}'-${inches}"`;
  }

  return `${trimmed}'`;
};

/**
 * Key info field definitions — order matters, first match wins.
 * Cover common variations from database field names.
 */
export const KEY_INFO_FIELDS = {
  height: [
    'Wall Height', 'Partition Height', 'Height', 'height',
    'Panel Height', 'wall_height', 'partition_height', 'panel_height',
    'WallHeight', 'PartitionHeight', 'PanelHeight',
  ],
  width: [
    'Wall Width', 'Width', 'width', 'Panel Width', 'Partition Width',
    'wall_width', 'panel_width', 'partition_width',
    'WallWidth', 'PanelWidth', 'PartitionWidth',
  ],
  panelCount: [
    'Panel Count', 'PanelCount', 'panelCount', 'Panels', 'panels',
    'Number of Panels', 'panel_count', 'number_of_panels',
    'NumPanels', 'num_panels', 'Total Panels',
  ],
  quantity: ['Quantity', 'quantity', 'Qty', 'qty', 'QTY', 'Count', 'count'],
  glassType: [
    'Glass Type', 'glass_type', 'glassType', 'GlassType',
    'Glass', 'glass',
  ],
};

/** Find a field value by checking multiple possible keys (case-insensitive fallback) */
export function findFieldValue(
  rawData: Record<string, unknown> | undefined,
  possibleKeys: string[],
): unknown {
  if (!rawData) return undefined;

  // First try exact match
  for (const key of possibleKeys) {
    if (key in rawData && rawData[key] !== null && rawData[key] !== undefined && rawData[key] !== '') {
      return rawData[key];
    }
  }

  // Then try case-insensitive match
  const rawDataKeys = Object.keys(rawData);
  for (const searchKey of possibleKeys) {
    const foundKey = rawDataKeys.find(k => k.toLowerCase() === searchKey.toLowerCase());
    if (foundKey && rawData[foundKey] !== null && rawData[foundKey] !== undefined && rawData[foundKey] !== '') {
      return rawData[foundKey];
    }
  }

  return undefined;
}

/** Get specification fields from rawData, excluding metadata and key info fields */
export function getSpecificationFields(
  rawData: Record<string, unknown> | undefined,
): [string, unknown][] {
  if (!rawData) return [];
  const metaFields = [
    'source', 'productDomain', 'productLine', 'manufacturer', 'series', 'model',
    '_specificationLabels',
    'series_id', 'model_id',
  ];
  const keyInfoFields = [
    ...KEY_INFO_FIELDS.height,
    ...KEY_INFO_FIELDS.width,
    ...KEY_INFO_FIELDS.panelCount,
    ...KEY_INFO_FIELDS.quantity,
    ...KEY_INFO_FIELDS.glassType,
  ];
  const excludeFields = [...metaFields, ...keyInfoFields];
  return Object.entries(rawData)
    .filter(([key]) => !excludeFields.includes(key))
    .filter(([_, value]) => value !== null && value !== undefined && value !== '')
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
}

/** Format field keys to human-readable labels (snake_case/camelCase -> Title Case) */
export function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}
