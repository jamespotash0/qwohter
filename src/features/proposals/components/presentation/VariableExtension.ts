/**
 * Variable Extension for Tiptap
 *
 * Custom node for inserting variable placeholders in the editor.
 * Variables display as styled inline elements and resolve to actual values.
 * Supports both static variables and dynamic product-based variables.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import type {
  Product,
  FormBuilderData,
  PricingSection,
  LeadTimeSection,
  MiscField,
} from '../../context/FormBuilderContext';
import {
  getAvailableFieldsForProduct,
  buildVariableKey,
} from '../../utils/productVariables';
import { VariableNodeView } from './VariableNodeView';

// Variable node attributes
export interface VariableAttributes {
  variableKey: string;
  variableLabel: string;
}

// Create the Variable extension
export const VariableExtension = Node.create({
  name: 'variable',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      variableKey: {
        default: '',
      },
      variableLabel: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-variable]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // Fallback HTML rendering for when React NodeView isn't available (e.g., getHTML())
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-variable': HTMLAttributes.variableKey,
        'class': 'variable-node',
        'contenteditable': 'false',
      }),
      HTMLAttributes.variableLabel,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VariableNodeView);
  },
});

// Available variables for insertion
export interface VariableDefinition {
  key: string;
  label: string;
  category: string;
  description?: string;
}

export const AVAILABLE_VARIABLES: VariableDefinition[] = [
  // ============================================================================
  // Project Info (from form_data.info - InfoTabData)
  // ============================================================================
  { key: 'proposal.number', label: 'Proposal Number', category: 'Project', description: 'Auto-generated proposal number (e.g., P-1001)' },
  { key: 'project.name', label: 'Project Name', category: 'Project', description: 'Name of the project' },
  { key: 'project.date', label: 'Proposal Date', category: 'Project', description: 'Date on the proposal' },
  { key: 'project.locationName', label: 'Job Location Name', category: 'Project', description: 'POI or landmark name' },
  { key: 'project.location', label: 'Job Address', category: 'Project', description: 'Physical job site address' },
  { key: 'project.floor', label: 'Floor', category: 'Project', description: 'Floor number at job location' },
  { key: 'project.locationType', label: 'Location Type', category: 'Project', description: 'Type of facility (Office, Warehouse, etc.)' },
  { key: 'project.dueDate', label: 'Est. Due Date', category: 'Project', description: 'Estimated completion date' },
  { key: 'project.notes', label: 'Job Notes', category: 'Project', description: 'Additional notes about the job' },

  // Work Details (from form_data.info)
  { key: 'project.source', label: 'Proposal Source', category: 'Project', description: 'Where the lead came from' },
  { key: 'project.workType', label: 'Type of Work', category: 'Project', description: 'Category of work being done' },
  { key: 'project.type', label: 'Project Type', category: 'Project', description: 'Type of project/facility' },
  { key: 'project.laborType', label: 'Labor Type', category: 'Project', description: '"Union" or "Non-Union"' },
  { key: 'project.wageType', label: 'Wage Type', category: 'Project', description: '"Prevailing Wage" or "Standard Wage"' },

  // Contact Person (from form_data.info - internal contact)
  { key: 'contact.name', label: 'Contact Name', category: 'Contact', description: 'Internal contact person' },
  { key: 'contact.email', label: 'Contact Email', category: 'Contact', description: 'Internal contact email' },

  // ============================================================================
  // Client Info (from form_data.info - InfoTabData)
  // ============================================================================
  { key: 'client.name', label: 'Client Name', category: 'Client', description: 'Name of the client' },
  { key: 'client.company', label: 'Client Company', category: 'Client', description: 'Client\'s company name' },
  { key: 'client.email', label: 'Client Email', category: 'Client', description: 'Client\'s email address' },
  { key: 'client.phone', label: 'Client Phone', category: 'Client', description: 'Client\'s phone number' },
  { key: 'client.address', label: 'Client Address', category: 'Client', description: 'Client\'s mailing address' },

  // ============================================================================
  // Organization (from organizations table)
  // ============================================================================
  { key: 'org.name', label: 'Organization Name', category: 'Organization', description: 'Your organization name' },
  { key: 'org.phone', label: 'Organization Phone', category: 'Organization', description: 'Your organization phone number' },
  { key: 'org.fax', label: 'Organization Fax', category: 'Organization', description: 'Your organization fax number' },
  { key: 'org.address', label: 'Organization Address', category: 'Organization', description: 'Your organization address' },
  { key: 'org.website', label: 'Organization Website', category: 'Organization', description: 'Your organization website URL' },

  // ============================================================================
  // Products (static - dynamic ones generated from form data)
  // ============================================================================
  { key: 'products.list', label: 'Product List', category: 'Products', description: 'Comma-separated list of products' },
];

// Group variables by category
export function getVariablesByCategory(): Record<string, VariableDefinition[]> {
  return AVAILABLE_VARIABLES.reduce((acc, variable) => {
    if (!acc[variable.category]) {
      acc[variable.category] = [];
    }
    (acc[variable.category] ??= []).push(variable);
    return acc;
  }, {} as Record<string, VariableDefinition[]>);
}

/**
 * Generate dynamic variable definitions from AI-extracted products
 * Creates variables like {wallA.stc}, {wallA.manufacturer} based on product aliases and available fields
 */
export function getProductVariables(products: Product[]): Record<string, VariableDefinition[]> {
  const productVars: Record<string, VariableDefinition[]> = {};

  // Filter to only AI-extracted products with aliases
  const aiProducts = products.filter(
    p => p.alias && p.rawData && Object.keys(p.rawData).length > 0
  );

  if (aiProducts.length === 0) return productVars;

  // For each product with an alias, generate available field variables
  aiProducts.forEach(product => {
    const alias = product.alias!;
    const categoryName = `Product: ${alias}`;
    const availableFields = getAvailableFieldsForProduct(product);

    productVars[categoryName] = availableFields.map(field => ({
      key: buildVariableKey(alias, field.key),
      label: `${alias}.${field.key}`,
      category: categoryName,
      description: `${field.label} for ${product.name}`,
    }));
  });

  return productVars;
}

/**
 * Get all variables including both static and dynamic product variables
 */
export function getAllVariablesByCategory(products: Product[]): Record<string, VariableDefinition[]> {
  const staticVars = getVariablesByCategory();
  const productVars = getProductVariables(products);

  return { ...staticVars, ...productVars };
}

// ============================================================================
// Dynamic Form Variables
// ============================================================================



/**
 * Calculate sell price for a line item (matches PricingTab logic)
 * Handles markup type (percent/dollar) and discounts
 */
function calculateItemSellPrice(item: {
  quantity: number;
  unitCost: number;
  markupValue: number;
  markupType?: 'percent' | 'dollar';
  discountValue?: number;
  discountType?: 'percent' | 'dollar';
}): number {
  const baseCost = item.quantity * item.unitCost;
  let priceAfterMarkup: number;

  if (item.markupType === 'dollar') {
    // Flat dollar markup (total amount, not per unit)
    priceAfterMarkup = baseCost + (item.markupValue || 0);
  } else {
    // Percentage markup (default)
    const markup = baseCost * (item.markupValue / 100);
    priceAfterMarkup = baseCost + markup;
  }

  // Apply discount if present
  if (item.discountValue && item.discountValue > 0) {
    if (item.discountType === 'percent') {
      return priceAfterMarkup * (1 - item.discountValue / 100);
    } else {
      return Math.max(0, priceAfterMarkup - item.discountValue);
    }
  }

  return priceAfterMarkup;
}

/**
 * Round to 2 decimal places
 */
function round2(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Generate variables from Pricing tab data
 */
export function getPricingVariables(data: FormBuilderData): VariableDefinition[] {
  const vars: VariableDefinition[] = [];
  const pricing = data.pricing;

  // Use stored summary if available, otherwise calculate
  const summary = pricing.summary;

  // Calculate totals
  let subtotal = 0;
  let itemCount = 0;

  pricing.sections.forEach((section, sectionIdx) => {
    let sectionSellTotal = 0;
    const sectionKey = section.name.toLowerCase().replace(/\s+/g, '_') || `section${sectionIdx + 1}`;

    section.lineItems.forEach((item) => {
      const sellPrice = round2(calculateItemSellPrice(item));
      sectionSellTotal += sellPrice;
      itemCount++;

      // Skip items without names
      if (!item.name) return;

      // Use actual item name as key (e.g., pricing.materials.track_installation)
      const itemNameKey = item.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const itemPath = `pricing.${sectionKey}.${itemNameKey}`;
      const sectionPrefix = section.name ? `[${section.name}] ` : '';

      vars.push({
        key: `${itemPath}.name`,
        label: `${sectionPrefix}${item.name} - Name`,
        category: 'Pricing Items',
        description: `Line item name in ${section.name}`,
      });
      vars.push({
        key: `${itemPath}.quantity`,
        label: `${sectionPrefix}${item.name} - Qty`,
        category: 'Pricing Items',
        description: `Quantity: ${item.quantity}`,
      });
      vars.push({
        key: `${itemPath}.sellPrice`,
        label: `${sectionPrefix}${item.name} - Sell Price`,
        category: 'Pricing Items',
        description: `$${sellPrice.toFixed(2)}`,
      });
      vars.push({
        key: `${itemPath}.unitCost`,
        label: `${sectionPrefix}${item.name} - Unit Cost`,
        category: 'Pricing Items',
        description: `$${item.unitCost.toFixed(2)}`,
      });
    });
    subtotal += sectionSellTotal;

    // Section-level variables (by section name, e.g., "materials", "labor")
    if (section.lineItems.length > 0) {
      vars.push({
        key: `pricing.${sectionKey}.sellingPrice`,
        label: `${section.name} - Selling Price`,
        category: 'Pricing Sections',
        description: `$${round2(sectionSellTotal).toFixed(2)}`,
      });
    }
  });

  // Use summary values if available (more accurate), fallback to calculated
  const finalSubtotal = summary?.subtotal ?? round2(subtotal);
  const taxPercent = pricing.salesTaxPercent ?? 0;
  const finalTaxAmount = summary?.totalTax ?? 0;
  const finalGrandTotal = summary?.grandTotal ?? round2(subtotal + finalTaxAmount);

  // Calculate cost (Tariff Selling Price)
  const totalCost = summary?.totalCost ?? round2(pricing.sections.reduce((total, section) =>
    total + section.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0), 0));

  // Summary variables (always show if there are items)
  if (itemCount > 0) {
    // Total Selling Price (sum of all sections, excluding tax)
    vars.push({
      key: 'pricing.totalSellingPrice',
      label: 'Total Selling Price',
      category: 'Pricing Totals',
      description: `$${finalSubtotal.toFixed(2)} - Sum of all sections (excl. tax)`,
    });
  }

  // Tax variables
  if (taxPercent > 0 || finalTaxAmount > 0) {
    vars.push({
      key: 'pricing.tax',
      label: 'Tax Amount',
      category: 'Pricing Totals',
      description: `$${finalTaxAmount.toFixed(2)} - Total tax applied`,
    });
    vars.push({
      key: 'pricing.taxRate',
      label: 'Tax Rate',
      category: 'Pricing Totals',
      description: `${taxPercent}%`,
    });
  }

  // Grand Total (the main total with tax)
  if (itemCount > 0) {
    vars.push({
      key: 'pricing.grandTotal',
      label: 'Grand Total',
      category: 'Pricing Totals',
      description: `$${finalGrandTotal.toFixed(2)} - Final total (with tax)`,
    });
  }

  return vars;
}

/**
 * Convert a phase name to a camelCase key
 * e.g., "Track Installation" -> "trackInstallation", "Panel Delivery" -> "panelDelivery"
 */
function toCamelCaseKey(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .split(/\s+/)
    .map((word, idx) => idx === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Generate variables from Lead Times tab data
 * Uses simple format: {{leadtimes.panelDelivery.duration}}
 */
export function getLeadTimesVariables(data: FormBuilderData): VariableDefinition[] {
  const vars: VariableDefinition[] = [];
  const leadTimes = data.leadTimes;

  leadTimes.sections.forEach((section) => {
    if (section.phases.length > 0) {
      // Individual phases - use phase name directly as key (camelCase)
      section.phases.forEach((phase, phaseIdx) => {
        // Use phase name as key if available, fallback to phase index
        const phaseKey = phase.phaseName
          ? toCamelCaseKey(phase.phaseName)
          : `phase${phaseIdx + 1}`;

        vars.push({
          key: `leadtimes.${phaseKey}.name`,
          label: phase.phaseName || `Phase ${phaseIdx + 1}`,
          category: 'Lead Times',
          description: phase.phaseName,
        });
        if (phase.duration) {
          vars.push({
            key: `leadtimes.${phaseKey}.duration`,
            label: `${phase.phaseName} Duration`,
            category: 'Lead Times',
            description: phase.duration,
          });
        }
        if (phase.estCompletionDate) {
          vars.push({
            key: `leadtimes.${phaseKey}.completion`,
            label: `${phase.phaseName} Completion`,
            category: 'Lead Times',
            description: phase.estCompletionDate,
          });
        }
      });
    }
  });

  return vars;
}

/**
 * Generate variables from Miscellaneous tab data
 */
export function getMiscVariables(data: FormBuilderData): VariableDefinition[] {
  const vars: VariableDefinition[] = [];
  const misc = data.miscellaneous;

  // Custom fields
  misc.fields.forEach((field, idx) => {
    const fieldKey = field.label.toLowerCase().replace(/\s+/g, '_') || `field${idx + 1}`;
    vars.push({
      key: `misc.${fieldKey}`,
      label: field.label,
      category: 'Custom Fields',
      description: field.value ? `Value: ${field.value.substring(0, 50)}...` : undefined,
    });
  });

  // Notes
  if (misc.notes) {
    vars.push({
      key: 'misc.notes',
      label: 'Additional Notes',
      category: 'Custom Fields',
      description: 'Notes from miscellaneous tab',
    });
  }

  return vars;
}

/**
 * Get all variables from form data including dynamic ones from all tabs
 */
export function getAllFormVariables(data: FormBuilderData): Record<string, VariableDefinition[]> {
  // Start with static variables
  const result = getVariablesByCategory();

  // Add product variables
  const productVars = getProductVariables(data.products.items);
  Object.assign(result, productVars);

  // Add pricing variables - now organized into categories
  const pricingVars = getPricingVariables(data);
  if (pricingVars.length > 0) {
    // Group pricing vars by their category
    const pricingTotals = pricingVars.filter(v => v.category === 'Pricing Totals');
    const pricingSections = pricingVars.filter(v => v.category === 'Pricing Sections');
    const pricingItems = pricingVars.filter(v => v.category === 'Pricing Items');

    if (pricingTotals.length > 0) {
      result['Pricing Totals'] = pricingTotals;
    }
    if (pricingSections.length > 0) {
      result['Pricing by Section'] = pricingSections;
    }
    if (pricingItems.length > 0) {
      result['Pricing Line Items'] = pricingItems;
    }
  }

  // Add lead times variables
  const leadTimesVars = getLeadTimesVariables(data);
  if (leadTimesVars.length > 0) {
    result['Lead Times'] = [...(result['Lead Times'] || []), ...leadTimesVars];
  }

  // Add misc variables
  const miscVars = getMiscVariables(data);
  if (miscVars.length > 0) {
    result['Custom Fields'] = miscVars;
  }

  return result;
}
