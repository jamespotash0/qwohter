/**
 * Google Docs Service
 *
 * Service for generating Google Docs from templates using the edge function.
 */

import { supabase } from '@/integrations/supabase/client';
import type { FormBuilderData } from '@/features/proposals/context/FormBuilderContext';
import { formatLocalDate } from '@/lib/utils';
import {
  getAvailableFieldsForProduct,
  getProductFieldValue,
  isCatalogProduct,
  resolveRawDataValue,
} from '@/features/proposals/utils/productVariables';

/** Data for dynamic table row duplication */
export interface TableRowData {
  /** Unique identifier for the table (e.g., 'pricing', 'products') */
  tableId: string;
  /** Array of row data - each object's keys become {{row.key}} variables */
  rows: Array<Record<string, string | number>>;
}

/** Data for dynamic block/paragraph duplication per product type */
export interface BlockProductData {
  /** Product domain for TYPE matching (e.g., "Operable Wall") */
  productDomain: string;
  /** Product alias or name for identification */
  label: string;
  /** All resolved variables for this product (wall.Series, wall.Height, etc.) */
  variables: Record<string, string>;
}

export interface GenerateDocRequest {
  templateDocId: string;
  proposalId?: string;
  organizationId: string;
  variables: Record<string, string>;
  /** Optional table data for row duplication */
  tableData?: TableRowData[];
  /** Optional block data for paragraph duplication per product type */
  blockData?: BlockProductData[];
  outputTitle?: string;
  mode?: 'create' | 'overwrite' | 'update';
  existingDocId?: string;
  version?: number;
}

export interface GenerateDocResponse {
  success: boolean;
  docId: string;
  docUrl: string;
  version?: number;
  title?: string;
}

export interface GeneratedDocVersion {
  docId: string;
  version: number;
  title: string;
  createdAt: string;
  createdBy?: string;
}

/**
 * Build variables object from proposal and form data
 */
export function buildProposalVariables(
  proposalData: {
    proposal_number?: string;
    project_name?: string;
    // Direct organization fields (stored on proposal)
    organization_name?: string;
    form_data?: {
      info?: {
        projectName?: string;
        proposalDate?: string;
        estimatedDueDate?: string;
        proposalSource?: string;
        jobNotes?: string;
        // Contact (internal contact person)
        contactName?: string;
        contactEmail?: string;
        // Client (external customer)
        clientName?: string;
        clientCompany?: string;
        clientEmail?: string;
        clientPhone?: string;
        clientAddress?: string;
        // Job location
        jobLocation?: string;
        jobLocationName?: string;
        jobFloor?: string;
        locationType?: string;
        // Work details
        isUnion?: boolean;
        isPrevailingWage?: boolean;
        projectType?: string;
        scope?: string;
      };
    };
    organization?: {
      name?: string;
      phone_number?: string;
      fax_number?: string;
      company_address?: string;
      website?: string;
    } | null;
  },
  formData: FormBuilderData
): Record<string, string> {
  // Info data comes from proposal form_data (not FormBuilderData which has different structure)
  const info = proposalData?.form_data?.info || {};
  const org = proposalData?.organization || {};
  const pricing = formData?.pricing;
  const summary = pricing?.summary;

  // Organization name: check direct field first, then nested organization
  const orgName = proposalData?.organization_name || org.name || '';


  // Format currency helper
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date helper using centralized utility with long month format
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    return formatLocalDate(dateStr, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const variables: Record<string, string> = {
    // Proposal info
    'proposal.number': proposalData?.proposal_number || '',
    'proposal.date': formatDate(info.proposalDate) || formatDate(new Date().toISOString()),

    // Project info
    'project.name': info.projectName || proposalData?.project_name || '',
    'project.date': formatDate(info.proposalDate) || formatDate(new Date().toISOString()), // Alias for proposal.date
    'project.dueDate': formatDate(info.estimatedDueDate) || '',
    'project.source': info.proposalSource || '',
    'project.notes': info.jobNotes || '',
    'project.location': info.jobLocation || '',
    'project.locationName': info.jobLocationName || '',
    'project.floor': info.jobFloor || '',
    'project.locationType': info.locationType || '',
    'project.type': info.projectType || '',
    'project.workType': info.scope || '',

    // Labor & Wage info
    'project.laborType': info.isUnion ? 'Union' : 'Non-Union',
    'project.wageType': info.isPrevailingWage ? 'Prevailing Wage' : 'Standard Wage',

    // Contact (internal contact person)
    'contact.name': info.contactName || '',
    'contact.email': info.contactEmail || '',

    // Client info (external customer)
    'client.name': info.clientName || '',
    'client.company': info.clientCompany || '',
    'client.email': info.clientEmail || '',
    'client.phone': info.clientPhone || '',
    'client.address': info.clientAddress || '',

    // Organization info (check direct proposal fields first, then nested org object)
    'org.name': orgName,
    'org.phone': org.phone_number || '',
    'org.fax': org.fax_number || '',
    'org.address': org.company_address || '',
    'org.website': org.website || '',

    // ============ PRICING TOTALS ============
    // Total Selling Price (sum of all sections, excluding tax)
    'pricing.totalSellingPrice': formatCurrency(summary?.subtotal),

    // Tax
    'pricing.tax': formatCurrency(summary?.totalTax),
    'pricing.taxRate': pricing?.salesTaxPercent
      ? `${pricing.salesTaxPercent}%`
      : '',

    // Grand Total (sum of all sections including tax)
    'pricing.grandTotal': formatCurrency(summary?.grandTotal),
  };

  // ============ PRICING SECTION TOTALS ============
  // Each section (e.g., "Materials", "Labor", "Equipment") gets its own totals
  if (pricing?.sections) {
    pricing.sections.forEach((section, index) => {
      const sectionKey = section.name.toLowerCase().replace(/\s+/g, '_');

      // Calculate section totals
      let sectionSellTotal = 0; // Total Selling Price (what customer pays)

      section.lineItems.forEach((item) => {
        sectionSellTotal += item.sellPrice || 0;
      });

      // Section totals by name (e.g., pricing.materials.sellingPrice)
      variables[`pricing.${sectionKey}.sellingPrice`] = formatCurrency(sectionSellTotal);

      // Also add by index for predictable ordering (e.g., pricing.section1.sellingPrice)
      variables[`pricing.section${index + 1}.name`] = section.name;
      variables[`pricing.section${index + 1}.sellingPrice`] = formatCurrency(sectionSellTotal);

      // ============ LINE ITEM VARIABLES ============
      // Each line item gets its own variables using the item name as key
      // e.g., pricing.materials.track_installation.quantity
      section.lineItems.forEach((item) => {
        if (!item.name) return; // Skip items without names

        const itemKey = item.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const prefix = `pricing.${sectionKey}.${itemKey}`;

        variables[`${prefix}.name`] = item.name;
        variables[`${prefix}.quantity`] = item.quantity?.toString() || '0';
        variables[`${prefix}.unitCost`] = formatCurrency(item.unitCost);
        variables[`${prefix}.sellPrice`] = formatCurrency(item.sellPrice);
      });
    });
  }

  // Add lead times - use phase name as key (camelCase)
  // Format: {{leadtimes.panelDelivery.duration}} instead of {{leadtimes.project_timeline_panelDelivery.duration}}
  // IMPORTANT: Only include variables with actual values so empty placeholders stay in the doc
  // This allows users to add data later and use "Update Values" to fill them in
  if (formData?.leadTimes?.sections) {
    formData.leadTimes.sections.forEach((section) => {
      section.phases.forEach((phase, index) => {
        // Convert phase name to camelCase key (e.g., "Track Installation" -> "trackInstallation")
        const phaseKey = phase.phaseName
          ? phase.phaseName
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, '')
              .split(/\s+/)
              .map((word, idx) => idx === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
              .join('')
          : `phase${index + 1}`;

        // Only add variables with actual values - leave placeholders for empty values
        if (phase.phaseName) {
          variables[`leadtimes.${phaseKey}.name`] = phase.phaseName;
        }
        if (phase.duration) {
          // Combine duration value with unit (e.g., "2 weeks", "3 days")
          const durationWithUnit = phase.durationUnit
            ? `${phase.duration} ${phase.durationUnit}`
            : phase.duration;
          variables[`leadtimes.${phaseKey}.duration`] = durationWithUnit;
        }
        if (phase.estCompletionDate) {
          variables[`leadtimes.${phaseKey}.completion`] = phase.estCompletionDate;
        }
      });
    });
  }

  // Add products with rawData fields
  if (formData?.products?.items) {
    formData.products.items.forEach((product, index) => {
      const prefix = `product.${index + 1}`;
      variables[`${prefix}.name`] = product.name || '';
      variables[`${prefix}.quantity`] = product.quantity?.toString() || '';
      variables[`${prefix}.unit`] = product.unit || '';
      variables[`${prefix}.description`] = product.description || '';

      // Add rawData fields with Upper Case naming
      const rawData = product.rawData || {};

      // Basic product info
      variables[`${prefix}.Manufacturer`] = rawData.manufacturer || '';
      variables[`${prefix}.ProductDomain`] = rawData.productDomain || '';
      variables[`${prefix}.ProductLine`] = rawData.productLine || '';
      variables[`${prefix}.Series`] = rawData.series || '';
      variables[`${prefix}.Model`] = rawData.model || '';

      // Dimensions (formatted with ' and " marks)
      const dims = rawData.dimensions || {};
      variables[`${prefix}.Height`] = formatDimension(dims.height || '');
      variables[`${prefix}.Width`] = formatDimension(dims.width || '');
      variables[`${prefix}.Length`] = formatDimension(dims.length || '');
      variables[`${prefix}.Thickness`] = formatDimension(dims.thickness || '');

      // Performance ratings
      const perf = rawData.performanceRatings || {};
      variables[`${prefix}.STC`] = perf.stc?.toString() || '';
      variables[`${prefix}.Fire_Rating`] = perf.fireRating || '';
      variables[`${prefix}.Acoustic_Rating`] = perf.acousticRating || '';

      // Appearance - with Finish_Color falling back to Finish
      const appearance = rawData.appearance || {};
      const finishColor = appearance.color || '';
      const finishStyle = appearance.finish || '';
      // Finish_Color uses color if available, otherwise falls back to finish
      variables[`${prefix}.Finish_Color`] = finishColor || finishStyle;
      variables[`${prefix}.Finish_Style`] = finishStyle;
      variables[`${prefix}.Color`] = finishColor;
      variables[`${prefix}.Finish`] = finishStyle;
      variables[`${prefix}.Trim`] = appearance.trim || '';

      // Materials
      const mats = rawData.materials || {};
      variables[`${prefix}.Core`] = mats.core || '';
      variables[`${prefix}.Face`] = mats.face || '';
      variables[`${prefix}.Frame`] = mats.frame || '';

      // Certifications as comma-separated list
      variables[`${prefix}.Certifications`] = (rawData.certifications || []).join(', ');

      // Add ALL available fields by alias (direct: "Wall A.field" and prefixed: "product.Wall A.field")
      if (product.alias) {
        const alias = product.alias;
        const aliasPrefix = `product.${alias}`;
        const availableFields = getAvailableFieldsForProduct(product);

        for (const field of availableFields) {
          let value: string;

          // For catalog spec fields, resolve codes to labels
          // _specificationLabels is keyed by field name → resolved label (e.g., "track_system": "425 Multi-Directional")
          if (isCatalogProduct(product) && field.category === 'Specifications') {
            const raw = product.rawData as Record<string, unknown>;
            const specLabels = raw._specificationLabels as Record<string, string> | undefined;
            value = specLabels?.[field.key] || resolveRawDataValue(raw[field.key], specLabels) || '-';
          } else {
            const fieldValue = getProductFieldValue(product, field);
            value = fieldValue !== null ? String(fieldValue) : '-';
          }

          // Format dimension fields with proper ' and " marks
          if (DIMENSION_FIELD_KEYS.has(field.key) && value && value !== '-') {
            value = formatDimension(value);
          }

          // Direct alias key (matches side panel: {{Wall A.track_system}})
          variables[`${alias}.${field.key}`] = value;
          // Prefixed key (legacy: {{product.Wall A.track_system}})
          variables[`${aliasPrefix}.${field.key}`] = value;
        }

        // Also add the legacy Upper Case keys for backward compatibility
        variables[`${aliasPrefix}.Finish_Color`] = finishColor || finishStyle;
        variables[`${aliasPrefix}.Finish_Style`] = finishStyle;
      }
    });
  }

  // Add miscellaneous fields
  if (formData?.miscellaneous?.fields) {
    formData.miscellaneous.fields.forEach((field) => {
      const fieldKey = field.label.toLowerCase().replace(/\s+/g, '_');
      variables[`misc.${fieldKey}`] = field.value || '';
    });
  }
  if (formData?.miscellaneous?.notes) {
    variables['misc.notes'] = formData.miscellaneous.notes;
  }

  // ============ DYNAMIC TABLE VARIABLES ============
  // These generate formatted text blocks for tables

  // Products table - all products in a formatted list
  if (formData?.products?.items && formData.products.items.length > 0) {
    const productRows = formData.products.items.map((product, idx) => {
      const name = product.name || `Product ${idx + 1}`;
      const qty = product.quantity || 0;
      const unit = product.unit || 'ea';
      const desc = product.description ? ` - ${product.description}` : '';
      return `${name}\t${qty} ${unit}${desc}`;
    });
    variables['products.table'] = productRows.join('\n');
    variables['products.count'] = formData.products.items.length.toString();
    // Comma-separated list of product names
    variables['products.list'] = formData.products.items
      .map((p) => p.name)
      .filter(Boolean)
      .join(', ');
  } else {
    variables['products.table'] = '';
    variables['products.count'] = '0';
    variables['products.list'] = '';
  }

  // Pricing items table - all line items across all sections
  // pricing.list outputs a formatted table with: Name, Qty, Unit Price, Discount, Line Total
  if (pricing?.sections && pricing.sections.length > 0) {
    const allLineItems: Array<{
      name: string;
      quantity: number;
      unitSellPrice: number;
      discount: string;
      lineTotal: number;
    }> = [];

    pricing.sections.forEach((section) => {
      section.lineItems.forEach((item) => {
        // Calculate per-unit sell price (unit cost + markup)
        const baseCost = item.unitCost || 0;
        let unitSellPrice: number;
        if (item.markupType === 'dollar') {
          unitSellPrice = baseCost + ((item.markupValue || 0) / (item.quantity || 1));
        } else {
          unitSellPrice = baseCost * (1 + (item.markupValue || 0) / 100);
        }

        // Format discount
        let discount = '';
        if (item.discountValue) {
          discount = item.discountType === 'percent'
            ? `${item.discountValue}%`
            : formatCurrency(item.discountValue);
        }

        allLineItems.push({
          name: item.name,
          quantity: item.quantity,
          unitSellPrice,
          discount,
          lineTotal: item.sellPrice || 0,
        });
      });
    });

    if (allLineItems.length > 0) {
      // Format as tab-separated table rows: Name | Qty | Unit Price | Discount | Line Total
      const pricingRows = allLineItems.map((item) => {
        return `${item.name}\t${item.quantity}\t${formatCurrency(item.unitSellPrice)}\t${item.discount}\t${formatCurrency(item.lineTotal)}`;
      });

      // Add total row
      const grandTotal = summary?.grandTotal || allLineItems.reduce((sum, item) => sum + item.lineTotal, 0);
      pricingRows.push(`\t\t\tTOTAL:\t${formatCurrency(grandTotal)}`);

      variables['pricing.list'] = pricingRows.join('\n');
      variables['pricing.itemsTable'] = pricingRows.join('\n'); // Alias
      variables['pricing.itemsCount'] = allLineItems.length.toString();
    } else {
      variables['pricing.list'] = '';
      variables['pricing.itemsTable'] = '';
      variables['pricing.itemsCount'] = '0';
    }
  } else {
    variables['pricing.list'] = '';
    variables['pricing.itemsTable'] = '';
    variables['pricing.itemsCount'] = '0';
  }

  return variables;
}

/**
 * Generate a Google Doc from a template
 */
export async function generateGoogleDoc(
  request: GenerateDocRequest
): Promise<GenerateDocResponse> {
  const { data, error } = await supabase.functions.invoke('generate-google-doc', {
    body: request,
  });

  if (error) {
    throw new Error(error.message || 'Failed to generate document');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to generate document');
  }

  return data as GenerateDocResponse;
}

export interface GenerateProposalDocOptions {
  templateDocId: string;
  proposalId: string;
  organizationId: string;
  proposalData: Parameters<typeof buildProposalVariables>[0];
  formData: FormBuilderData;
  outputTitle?: string;
  mode?: 'create' | 'overwrite' | 'update';
  existingDocId?: string;
  version?: number;
}

/** Field keys that represent dimensions and should be formatted with ' and " marks */
const DIMENSION_FIELD_KEYS = new Set([
  'height', 'width', 'length', 'thickness',
  'wall_height', 'wall_width',
]);

/**
 * Format a single dimension value to feet-inches notation.
 * "32-4" → "32'-4\"", "16" → "16'", already formatted → pass through
 */
function formatDimension(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();

  // Already formatted (contains ' or ")
  if (trimmed.includes("'") || trimmed.includes('"')) return trimmed;

  // Feet-inches format: "32-4" → "32'-4\""
  if (trimmed.includes('-')) {
    const [feet, inches] = trimmed.split('-');
    return `${feet}'-${inches}"`;
  }

  // Just feet: "16" → "16'"
  return `${trimmed}'`;
}

/**
 * Format dimensions into a readable string (e.g., "32'-4" L x 8'-6" H")
 */
function formatDimensions(dims: {
  height?: string | null;
  width?: string | null;
  length?: string | null;
  thickness?: string | null;
}): string {
  const parts: string[] = [];

  // Check for length x height format (common for walls)
  if (dims.length && dims.height) {
    return `${formatDimension(dims.length)} L x ${formatDimension(dims.height)} H`;
  }

  // Check for width x height format
  if (dims.width && dims.height) {
    return `${formatDimension(dims.width)} W x ${formatDimension(dims.height)} H`;
  }

  // Fall back to listing available dimensions
  if (dims.length) parts.push(`${formatDimension(dims.length)} L`);
  if (dims.width) parts.push(`${formatDimension(dims.width)} W`);
  if (dims.height) parts.push(`${formatDimension(dims.height)} H`);
  if (dims.thickness) parts.push(`${formatDimension(dims.thickness)} T`);

  return parts.join(' x ') || '';
}

/**
 * Calculate per-unit sell price (unit cost + markup, before quantity multiplication)
 */
function calculateUnitSellPrice(item: {
  unitCost: number;
  quantity: number;
  markupValue: number;
  markupType?: 'percent' | 'dollar';
}): number {
  const baseCost = item.unitCost || 0;
  if (item.markupType === 'dollar') {
    // Dollar markup is a total amount, distribute per unit
    return baseCost + ((item.markupValue || 0) / (item.quantity || 1));
  }
  // Percentage markup (default)
  return baseCost * (1 + (item.markupValue || 0) / 100);
}

/**
 * Format discount for display
 */
function formatDiscountValue(
  value: number | undefined,
  type: string | undefined,
  formatCurrency: (amount: number | undefined) => string
): string {
  if (!value) return '';
  if (type === 'percent') return `${value}%`;
  return formatCurrency(value);
}

/**
 * Build table data for dynamic row duplication in Google Docs
 */
export function buildTableData(formData: FormBuilderData): TableRowData[] {
  const tables: TableRowData[] = [];
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Products table with rawData fields
  if (formData?.products?.items && formData.products.items.length > 0) {
    tables.push({
      tableId: 'products',
      rows: formData.products.items.map((product, idx) => {
        const rawData = product.rawData || {};
        const dims = rawData.dimensions || {};
        const perf = rawData.performanceRatings || {};
        const appearance = rawData.appearance || {};
        const mats = rawData.materials || {};

        const finishColor = appearance.color || '';
        const finishStyle = appearance.finish || '';

        return {
          index: idx + 1,
          name: product.name || '',
          quantity: product.quantity || 0,
          unit: product.unit || 'ea',
          description: product.description || '',
          alias: product.alias || '',
          // Product info - Upper Case
          Manufacturer: rawData.manufacturer || '',
          Product_Domain: rawData.productDomain || '',
          Product_Line: rawData.productLine || '',
          Series: rawData.series || '',
          Model: rawData.model || '',
          // Dimensions (formatted with ' and " marks)
          Height: formatDimension(dims.height || ''),
          Width: formatDimension(dims.width || ''),
          Length: formatDimension(dims.length || ''),
          Thickness: formatDimension(dims.thickness || ''),
          // Performance
          STC: perf.stc?.toString() || '',
          Fire_Rating: perf.fireRating || '',
          Acoustic_Rating: perf.acousticRating || '',
          // Appearance - Finish_Color falls back to Finish
          Finish_Color: finishColor || finishStyle,
          Finish_Style: finishStyle,
          Color: finishColor,
          Finish: finishStyle,
          Trim: appearance.trim || '',
          // Materials
          Core: mats.core || '',
          Face: mats.face || '',
          Frame: mats.frame || '',
          Certifications: (rawData.certifications || []).join(', '),
        };
      }),
    });

    // Wall specs table - resolves catalog config fields with label resolution
    // Designed for {{#TABLE:wallspecs}} in templates
    tables.push({
      tableId: 'wallspecs',
      rows: formData.products.items.map((product) => {
        const rawData = product.rawData || {};
        const raw = rawData as Record<string, unknown>;
        const specLabels = raw._specificationLabels as Record<string, string> | undefined;
        // _specificationLabels is keyed by field name (e.g., "initial_closure_system": "Pocket Door")
        // so look up the field key directly, not the raw value code
        const resolve = (key: string) => specLabels?.[key] || String(raw[key] ?? '') || '';

        // For catalog products, resolve config fields; for AI products, fall back to nested data
        const dims = rawData.dimensions || {};
        const perf = rawData.performanceRatings || {};
        const appearance = rawData.appearance || {};

        const wallWidth = formatDimension(resolve('wall_width') || dims.width || '');
        const wallHeight = formatDimension(resolve('wall_height') || dims.height || '');
        const dimensionsStr = wallWidth && wallHeight
          ? `${wallWidth} L x ${wallHeight} H`
          : formatDimensions(dims);

        // Extract wall type from productDomain (e.g., "Operable Wall" → "Operable")
        const domain = rawData.productDomain || rawData.productLine || '';
        const wallType = typeof domain === 'string'
          ? domain.split(/\s+/)[0] || product.name || ''
          : product.name || '';

        return {
          wall: wallType,
          dimensions: dimensionsStr,
          stc: resolve('stc_rating') || perf.stc?.toString() || '',
          finish: resolve('finish_material') || appearance.finish || appearance.color || '',
          // Pocket doors: check dedicated pocket door type field (not closure system)
          pocketDoors: resolve('pocket_doors_type') || resolve('pocket_door_type') || resolve('Pocket Door Type') || '-',
          // Pass doors: show "option | type" if both exist, type only if just type, else "-"
          passDoors: (() => {
            const type = resolve('pass_door_type') || resolve('Pass Door Type');
            const option = resolve('pass_door_option') || resolve('Pass Door Option') || resolve('pass_door_qty');
            if (type && option) return `${option} | ${type}`;
            if (type) return type;
            return '-';
          })(),
          panelCount: resolve('panel_count') || '',
          qty: product.quantity?.toString() || '',
        };
      }),
    });

    // Specifications table - designed for wall/product specs tables
    // Uses product data with additional fields from rawData.specifications
    tables.push({
      tableId: 'specifications',
      rows: formData.products.items.map((product, idx) => {
        const rawData = product.rawData || {};
        const dims = rawData.dimensions || {};
        const perf = rawData.performanceRatings || {};
        const appearance = rawData.appearance || {};
        const specs = (rawData.specifications || {}) as Record<string, unknown>;

        // Format finish - use color if available, otherwise finish style
        const finishDisplay = appearance.color || appearance.finish || '';

        return {
          index: idx + 1,
          // Wall name/alias (e.g., "Operable A", "Glass A")
          wall: product.alias || product.name || '',
          name: product.name || '',
          alias: product.alias || '',
          // Formatted dimensions string
          dimensions: formatDimensions(dims),
          // Individual dimension fields
          height: dims.height || '',
          width: dims.width || '',
          length: dims.length || '',
          thickness: dims.thickness || '',
          // Performance
          stc: perf.stc?.toString() || '',
          fireRating: perf.fireRating || '',
          acousticRating: perf.acousticRating || '',
          // Appearance
          finish: finishDisplay,
          color: appearance.color || '',
          finishStyle: appearance.finish || '',
          trim: appearance.trim || '',
          // Door specifications from rawData.specifications
          pocketDoors: String(specs.pocketDoors || specs.pocket_doors || ''),
          passDoors: String(specs.passDoors || specs.pass_doors || ''),
          // Count and quantity
          count: String(specs.count || specs.panelCount || specs.panel_count || ''),
          qty: product.quantity?.toString() || '',
          quantity: product.quantity?.toString() || '',
          // Additional spec fields that might be useful
          manufacturer: rawData.manufacturer || '',
          model: rawData.model || '',
          series: rawData.series || '',
          productDomain: rawData.productDomain || '',
          productLine: rawData.productLine || '',
        };
      }),
    });
  }

  // Pricing items table - all line items across all sections
  if (formData?.pricing?.sections && formData.pricing.sections.length > 0) {
    const allItems: Array<Record<string, string | number>> = [];
    let itemIndex = 1;

    formData.pricing.sections.forEach((section) => {
      section.lineItems.forEach((item) => {
        const unitSellPriceValue = calculateUnitSellPrice(item);

        allItems.push({
          index: itemIndex++,
          section: section.name,
          name: item.name || '',
          quantity: item.quantity || 0,
          unitCost: formatCurrency(item.unitCost),
          sellPrice: formatCurrency(item.sellPrice),
          // Raw numeric values for calculations
          unitCostRaw: item.unitCost || 0,
          sellPriceRaw: item.sellPrice || 0,

          // Per-unit sell price (after markup, before quantity)
          unitSellPrice: formatCurrency(unitSellPriceValue),
          unitSellPriceRaw: unitSellPriceValue,

          // Discount fields
          discount: formatDiscountValue(item.discountValue, item.discountType, formatCurrency),
          discountValue: item.discountValue || 0,
          discountType: item.discountType || '',
          // Always show percentage format (0% if no discount)
          discountPercent: `${item.discountValue || 0}%`,

          // Line total alias (same as sellPrice, clearer naming for templates)
          lineTotal: formatCurrency(item.sellPrice),
          lineTotalRaw: item.sellPrice || 0,
        });
      });
    });

    if (allItems.length > 0) {
      tables.push({
        tableId: 'pricing',
        rows: allItems,
      });
    }
  }

  return tables;
}

/**
 * Build block data for paragraph duplication per product type in Google Docs.
 * Each product with a productDomain gets a variables map for {{wall.*}} resolution.
 * Also surfaces all specifications JSONB keys so custom fields work automatically.
 */
export function buildBlockData(formData: FormBuilderData): BlockProductData[] {
  const blocks: BlockProductData[] = [];

  if (!formData?.products?.items) return blocks;

  for (const product of formData.products.items) {
    const rawData = product.rawData || {};
    const productDomain = rawData.productDomain;

    // Skip products without a domain — can't match to any TYPE block
    if (!productDomain) continue;

    const dims = rawData.dimensions || {};
    const perf = rawData.performanceRatings || {};
    const appearance = rawData.appearance || {};
    const mats = rawData.materials || {};
    const specs = (rawData.specifications || {}) as Record<string, unknown>;

    const finishColor = appearance.color || '';
    const finishStyle = appearance.finish || '';

    const variables: Record<string, string> = {
      // Basic info (keep empty for structural fields)
      name: product.name || '',
      quantity: product.quantity?.toString() || '',
      unit: product.unit || '',
      description: product.description || '',
      alias: product.alias || '',
      // Product identity
      Manufacturer: rawData.manufacturer || '-',
      Product_Domain: productDomain,
      Product_Line: rawData.productLine || '-',
      Series: rawData.series || '-',
      Model: rawData.model || '-',
      // Dimensions (formatted with ' and " marks)
      Height: formatDimension(dims.height || '') || '-',
      Width: formatDimension(dims.width || '') || '-',
      Length: formatDimension(dims.length || '') || '-',
      Thickness: formatDimension(dims.thickness || '') || '-',
      // Performance
      STC: perf.stc?.toString() || '-',
      Fire_Rating: perf.fireRating || '-',
      Acoustic_Rating: perf.acousticRating || '-',
      // Appearance
      Finish_Color: finishColor || finishStyle || '-',
      Finish_Style: finishStyle || '-',
      Color: finishColor || '-',
      Finish: finishStyle || '-',
      Trim: appearance.trim || '-',
      // Materials
      Core: mats.core || '-',
      Face: mats.face || '-',
      Frame: mats.frame || '-',
      // Certifications
      Certifications: (rawData.certifications || []).join(', ') || '-',
    };

    // Surface ALL specifications JSONB keys as variables so custom fields
    // (like trackLayout, panelType, insulation, etc.) work automatically
    for (const [key, value] of Object.entries(specs)) {
      if (key.startsWith('_')) continue; // Skip internal keys like _specificationLabels
      if (value !== null && value !== undefined) {
        variables[key] = String(value);
      }
    }

    // For catalog products, also surface flat rawData spec keys with label resolution
    // _specificationLabels is keyed by field name (e.g., "initial_closure_system": "Pocket Door")
    if (isCatalogProduct(product)) {
      const dynamicFields = getAvailableFieldsForProduct(product);
      const specLabels = (rawData as Record<string, unknown>)._specificationLabels as Record<string, string> | undefined;
      for (const field of dynamicFields) {
        if (field.category === 'Specifications') {
          // Use pre-resolved label directly, fall back to raw value
          let resolved = specLabels?.[field.key] || String((rawData as Record<string, unknown>)[field.key] ?? '') || '-';
          // Format dimension fields with proper ' and " marks
          if (DIMENSION_FIELD_KEYS.has(field.key) && resolved && resolved !== '-') {
            resolved = formatDimension(resolved);
          }
          variables[field.key] = resolved;
        }
      }
    }

    blocks.push({
      productDomain,
      label: product.alias || product.name || '',
      variables,
    });
  }

  return blocks;
}

/**
 * Generate a Google Doc from proposal data
 */
export async function generateProposalDoc(
  templateDocId: string,
  proposalId: string,
  organizationId: string,
  proposalData: Parameters<typeof buildProposalVariables>[0],
  formData: FormBuilderData,
  outputTitle?: string,
  options?: { mode?: 'create' | 'overwrite' | 'update'; existingDocId?: string; version?: number }
): Promise<GenerateDocResponse> {
  const variables = buildProposalVariables(proposalData, formData);
  const tableData = buildTableData(formData);
  const blockData = buildBlockData(formData);

  // Debug logging
  console.log('[generateProposalDoc] Block data:', blockData.length, 'products');
  blockData.forEach((b, idx) => {
    console.log(`[generateProposalDoc] Block product ${idx}: domain="${b.productDomain}", label="${b.label}", vars=${Object.keys(b.variables).length}`);
  });
  console.log('[generateProposalDoc] Products items:', formData?.products?.items?.length || 0);
  formData?.products?.items?.forEach((p, idx) => {
    console.log(`[generateProposalDoc] Product ${idx}: name="${p.name}", alias="${p.alias}", domain="${p.rawData?.productDomain}", source="${p.rawData?.source}"`);
  });
  console.log('[generateProposalDoc] Pricing sections:', formData?.pricing?.sections?.length || 0);
  formData?.pricing?.sections?.forEach((section, idx) => {
    console.log(`[generateProposalDoc] Section ${idx} "${section.name}": ${section.lineItems?.length || 0} items`);
  });
  const pricingTable = tableData.find(t => t.tableId === 'pricing');
  console.log('[generateProposalDoc] Pricing table rows:', pricingTable?.rows?.length || 0);
  if (pricingTable?.rows) {
    pricingTable.rows.forEach((row, idx) => {
      console.log(`[generateProposalDoc] Row ${idx}: ${row.name}`);
    });
  }

  return generateGoogleDoc({
    templateDocId,
    proposalId,
    organizationId,
    variables,
    tableData,
    blockData,
    outputTitle,
    mode: options?.mode,
    existingDocId: options?.existingDocId,
    version: options?.version,
  });
}
