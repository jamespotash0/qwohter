/**
 * Variable Extension for Tiptap
 *
 * Custom node for inserting variable placeholders in the editor.
 * Variables display as styled inline elements and resolve to actual values.
 * Supports both static variables and dynamic product-based variables.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import type {
  Product,
  FormBuilderData,
  PaymentMilestone,
  WarrantyItem,
  Exclusion,
  PricingSection,
  LeadTimeSection,
  MiscField,
} from '../../context/FormBuilderContext';
import {
  getAvailableFieldsForProduct,
  buildVariableKey,
} from '../../utils/productVariables';

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
    // Clean, subtle styling for variables - looks like regular text with subtle highlight
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-variable': HTMLAttributes.variableKey,
        'class': 'variable-node inline px-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium select-none border-b border-dashed border-gray-400 dark:border-gray-500',
        'contenteditable': 'false',
      }),
      HTMLAttributes.variableLabel,
    ];
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
  // Project Info
  { key: 'project.name', label: 'Project Name', category: 'Project' },
  { key: 'project.location', label: 'Job Location', category: 'Project' },
  { key: 'project.date', label: 'Date Created', category: 'Project' },

  // Client Info
  { key: 'client.name', label: 'Client Name', category: 'Client' },
  { key: 'client.company', label: 'Client Company', category: 'Client' },
  { key: 'client.email', label: 'Client Email', category: 'Client' },
  { key: 'client.phone', label: 'Client Phone', category: 'Client' },

  // Pricing
  { key: 'pricing.total', label: 'Total Price', category: 'Pricing' },
  { key: 'pricing.subtotal', label: 'Subtotal', category: 'Pricing' },
  { key: 'pricing.tax', label: 'Tax Amount', category: 'Pricing' },
  { key: 'pricing.discount', label: 'Discount', category: 'Pricing' },

  // Products
  { key: 'products.list', label: 'Product List', category: 'Products' },
  { key: 'products.count', label: 'Product Count', category: 'Products' },

  // Terms
  { key: 'terms.payment', label: 'Payment Terms', category: 'Terms' },
  { key: 'terms.warranty', label: 'Warranty Info', category: 'Terms' },

  // Lead Times
  { key: 'leadtimes.total', label: 'Total Duration', category: 'Lead Times' },
  { key: 'leadtimes.start', label: 'Start Date', category: 'Lead Times' },
  { key: 'leadtimes.end', label: 'End Date', category: 'Lead Times' },

  // Organization
  { key: 'org.name', label: 'Company Name', category: 'Organization' },
  { key: 'org.address', label: 'Company Address', category: 'Organization' },
  { key: 'org.phone', label: 'Company Phone', category: 'Organization' },
  { key: 'org.email', label: 'Company Email', category: 'Organization' },
];

// Group variables by category
export function getVariablesByCategory(): Record<string, VariableDefinition[]> {
  return AVAILABLE_VARIABLES.reduce((acc, variable) => {
    if (!acc[variable.category]) {
      acc[variable.category] = [];
    }
    acc[variable.category].push(variable);
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
 * Generate variables from Terms tab data (payment milestones, warranties, exclusions)
 */
export function getTermsVariables(data: FormBuilderData): VariableDefinition[] {
  const vars: VariableDefinition[] = [];
  const terms = data.terms;

  // Payment milestones summary
  if (terms.paymentMilestones.length > 0) {
    vars.push({
      key: 'terms.paymentSchedule',
      label: 'Payment Schedule',
      category: 'Terms',
      description: 'Full payment milestone schedule',
    });

    // Individual milestones
    terms.paymentMilestones.forEach((milestone, idx) => {
      const num = idx + 1;
      vars.push({
        key: `terms.milestone${num}.percentage`,
        label: `Milestone ${num} %`,
        category: 'Terms',
        description: `Payment ${num}: ${milestone.percentage}%`,
      });
      vars.push({
        key: `terms.milestone${num}.trigger`,
        label: `Milestone ${num} Trigger`,
        category: 'Terms',
        description: `When payment ${num} is due`,
      });
    });
  }

  // Warranties summary
  if (terms.warranties.length > 0) {
    vars.push({
      key: 'terms.warranties',
      label: 'Warranties List',
      category: 'Terms',
      description: 'All warranty items',
    });

    // Individual warranties
    terms.warranties.forEach((warranty, idx) => {
      vars.push({
        key: `terms.warranty${idx + 1}`,
        label: warranty.name,
        category: 'Terms',
        description: `${warranty.quantity} ${warranty.unit}`,
      });
    });
  }

  // Exclusions
  if (terms.exclusions.some(e => e.checked)) {
    vars.push({
      key: 'terms.exclusions',
      label: 'Exclusions List',
      category: 'Terms',
      description: 'All checked exclusions',
    });
  }

  return vars;
}

/**
 * Generate variables from Pricing tab data
 */
export function getPricingVariables(data: FormBuilderData): VariableDefinition[] {
  const vars: VariableDefinition[] = [];
  const pricing = data.pricing;

  // Calculate totals
  let grandTotal = 0;
  let itemCount = 0;

  pricing.sections.forEach((section, sectionIdx) => {
    let sectionTotal = 0;
    section.lineItems.forEach(item => {
      const total = item.quantity * item.unitCost * (1 + item.markupPercent / 100);
      sectionTotal += total;
      itemCount++;
    });
    grandTotal += sectionTotal;

    // Section-level variables
    if (section.lineItems.length > 0) {
      const sectionKey = section.name.toLowerCase().replace(/\s+/g, '_') || `section${sectionIdx + 1}`;
      vars.push({
        key: `pricing.${sectionKey}.total`,
        label: `${section.name} Total`,
        category: 'Pricing',
        description: `Total for ${section.name} section`,
      });
      vars.push({
        key: `pricing.${sectionKey}.items`,
        label: `${section.name} Items`,
        category: 'Pricing',
        description: `Line items in ${section.name}`,
      });
    }
  });

  // Grand totals
  if (itemCount > 0) {
    vars.push({
      key: 'pricing.grandTotal',
      label: 'Grand Total',
      category: 'Pricing',
      description: 'Total of all pricing sections',
    });
    vars.push({
      key: 'pricing.itemCount',
      label: 'Total Items',
      category: 'Pricing',
      description: 'Number of line items',
    });
  }

  return vars;
}

/**
 * Generate variables from Lead Times tab data
 */
export function getLeadTimesVariables(data: FormBuilderData): VariableDefinition[] {
  const vars: VariableDefinition[] = [];
  const leadTimes = data.leadTimes;

  leadTimes.sections.forEach((section, sectionIdx) => {
    const sectionKey = section.name.toLowerCase().replace(/\s+/g, '_') || `section${sectionIdx + 1}`;

    if (section.phases.length > 0) {
      // Section summary
      vars.push({
        key: `leadtimes.${sectionKey}.phases`,
        label: `${section.name} Phases`,
        category: 'Lead Times',
        description: `All phases in ${section.name}`,
      });

      // Individual phases
      section.phases.forEach((phase, phaseIdx) => {
        const phaseKey = `${sectionKey}_phase${phaseIdx + 1}`;
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

  // Add terms variables
  const termsVars = getTermsVariables(data);
  if (termsVars.length > 0) {
    result['Terms'] = [...(result['Terms'] || []), ...termsVars];
  }

  // Add pricing variables
  const pricingVars = getPricingVariables(data);
  if (pricingVars.length > 0) {
    result['Pricing'] = [...(result['Pricing'] || []), ...pricingVars];
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
