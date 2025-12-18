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
  // Proposal Fields (direct columns from proposals table)
  // ============================================================================
  { key: 'proposal.number', label: 'Proposal Number', category: 'Proposal', description: 'Auto-generated proposal number (e.g., P-1001)' },
  { key: 'proposal.createdAt', label: 'Created Date', category: 'Proposal', description: 'When the proposal was created' },

  // ============================================================================
  // Project Info (from form_data.info - InfoTabData)
  // ============================================================================
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
  { key: 'project.laborType', label: 'Labor Type', category: 'Project', description: 'Union or non-union' },
  { key: 'project.projectType', label: 'Project Type', category: 'Project', description: 'Type of project/facility' },

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
  { key: 'client.type', label: 'Client Type', category: 'Client', description: 'Type of client relationship' },

  // ============================================================================
  // Organization (from organizations table)
  // ============================================================================
  { key: 'org.name', label: 'Company Name', category: 'Organization', description: 'Your company name' },
  { key: 'org.phone', label: 'Company Phone', category: 'Organization', description: 'Your company phone number' },
  { key: 'org.fax', label: 'Company Fax', category: 'Organization', description: 'Your company fax number' },
  { key: 'org.address', label: 'Company Address', category: 'Organization', description: 'Your company address' },
  { key: 'org.website', label: 'Company Website', category: 'Organization', description: 'Your company website URL' },
  { key: 'org.industry', label: 'Industry', category: 'Organization', description: 'Your company industry' },

  // ============================================================================
  // Products (static - dynamic ones generated from form data)
  // ============================================================================
  { key: 'products.list', label: 'Product List', category: 'Products', description: 'Comma-separated list of products' },
  { key: 'products.count', label: 'Product Count', category: 'Products', description: 'Number of products' },
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
    const sectionKey = section.name.toLowerCase().replace(/\s+/g, '_') || `section${sectionIdx + 1}`;

    section.lineItems.forEach((item, itemIdx) => {
      const total = item.quantity * item.unitCost * (1 + item.markupPercent / 100);
      sectionTotal += total;
      itemCount++;

      // Individual line item variables
      const itemKey = `pricing.${sectionKey}.item${itemIdx + 1}`;
      vars.push({
        key: `${itemKey}.name`,
        label: `${item.name || `Item ${itemIdx + 1}`}`,
        category: 'Pricing',
        description: `Line item name in ${section.name}`,
      });
      vars.push({
        key: `${itemKey}.quantity`,
        label: `${item.name || `Item ${itemIdx + 1}`} Qty`,
        category: 'Pricing',
        description: `Quantity: ${item.quantity}`,
      });
      vars.push({
        key: `${itemKey}.unitCost`,
        label: `${item.name || `Item ${itemIdx + 1}`} Unit Cost`,
        category: 'Pricing',
        description: `Unit cost: $${item.unitCost}`,
      });
      vars.push({
        key: `${itemKey}.total`,
        label: `${item.name || `Item ${itemIdx + 1}`} Total`,
        category: 'Pricing',
        description: `Total: $${total.toFixed(2)}`,
      });
    });
    grandTotal += sectionTotal;

    // Section-level variables
    if (section.lineItems.length > 0) {
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
      vars.push({
        key: `pricing.${sectionKey}.itemCount`,
        label: `${section.name} Count`,
        category: 'Pricing',
        description: `Number of items in ${section.name}`,
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
