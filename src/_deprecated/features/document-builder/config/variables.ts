/**
 * Document Variable Definitions
 * Available variables that can be inserted into document templates
 */

import type { VariableDefinition, VariableCategory } from '../types';

/**
 * All available variables grouped by category
 */
export const DOCUMENT_VARIABLES: VariableDefinition[] = [
  // Client Variables
  {
    key: 'client_name',
    label: 'Client Name',
    category: 'client',
    description: 'Full name of the client',
    format: 'text',
  },
  {
    key: 'client_email',
    label: 'Client Email',
    category: 'client',
    description: 'Client email address',
    format: 'text',
  },
  {
    key: 'client_phone',
    label: 'Client Phone',
    category: 'client',
    description: 'Client phone number',
    format: 'text',
  },
  {
    key: 'client_address',
    label: 'Client Address',
    category: 'client',
    description: 'Client street address',
    format: 'text',
  },
  {
    key: 'client_city',
    label: 'Client City',
    category: 'client',
    description: 'Client city',
    format: 'text',
  },
  {
    key: 'client_state',
    label: 'Client State',
    category: 'client',
    description: 'Client state/province',
    format: 'text',
  },
  {
    key: 'client_zip',
    label: 'Client ZIP',
    category: 'client',
    description: 'Client postal code',
    format: 'text',
  },

  // Project Variables
  {
    key: 'project_name',
    label: 'Project Name',
    category: 'project',
    description: 'Name of the project',
    format: 'text',
  },
  {
    key: 'project_description',
    label: 'Project Description',
    category: 'project',
    description: 'Detailed project description',
    format: 'text',
  },
  {
    key: 'project_scope',
    label: 'Scope of Work',
    category: 'project',
    description: 'Project scope details',
    format: 'text',
  },

  // Pricing Variables
  {
    key: 'subtotal',
    label: 'Subtotal',
    category: 'pricing',
    description: 'Subtotal before tax',
    format: 'currency',
  },
  {
    key: 'tax_amount',
    label: 'Tax Amount',
    category: 'pricing',
    description: 'Tax amount',
    format: 'currency',
  },
  {
    key: 'total_price',
    label: 'Total Price',
    category: 'pricing',
    description: 'Final total including tax',
    format: 'currency',
  },
  {
    key: 'deposit_amount',
    label: 'Deposit Amount',
    category: 'pricing',
    description: 'Required deposit',
    format: 'currency',
  },
  {
    key: 'balance_due',
    label: 'Balance Due',
    category: 'pricing',
    description: 'Remaining balance',
    format: 'currency',
  },

  // Company Variables
  {
    key: 'company_name',
    label: 'Company Name',
    category: 'company',
    description: 'Your company name',
    format: 'text',
  },
  {
    key: 'company_address',
    label: 'Company Address',
    category: 'company',
    description: 'Your company address',
    format: 'text',
  },
  {
    key: 'company_phone',
    label: 'Company Phone',
    category: 'company',
    description: 'Your company phone',
    format: 'text',
  },
  {
    key: 'company_email',
    label: 'Company Email',
    category: 'company',
    description: 'Your company email',
    format: 'text',
  },
  {
    key: 'company_website',
    label: 'Company Website',
    category: 'company',
    description: 'Your company website URL',
    format: 'text',
  },

  // Date Variables
  {
    key: 'quote_date',
    label: 'Quote Date',
    category: 'dates',
    description: 'Date the quote was created',
    format: 'date',
  },
  {
    key: 'valid_until',
    label: 'Valid Until',
    category: 'dates',
    description: 'Quote expiration date',
    format: 'date',
  },
  {
    key: 'start_date',
    label: 'Start Date',
    category: 'dates',
    description: 'Project start date',
    format: 'date',
  },
  {
    key: 'end_date',
    label: 'End Date',
    category: 'dates',
    description: 'Project end date',
    format: 'date',
  },
  {
    key: 'current_date',
    label: 'Current Date',
    category: 'dates',
    description: 'Today\'s date',
    format: 'date',
  },
];

/**
 * Get variables by category
 */
export function getVariablesByCategory(
  category: VariableCategory
): VariableDefinition[] {
  return DOCUMENT_VARIABLES.filter((v) => v.category === category);
}

/**
 * Get all category names with their labels
 */
export const VARIABLE_CATEGORIES: { key: VariableCategory; label: string }[] = [
  { key: 'client', label: 'Client Info' },
  { key: 'project', label: 'Project Details' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'company', label: 'Company Info' },
  { key: 'dates', label: 'Dates' },
];

/**
 * Find a variable definition by key
 */
export function findVariable(key: string): VariableDefinition | undefined {
  return DOCUMENT_VARIABLES.find((v) => v.key === key);
}

/**
 * Format a variable value based on its format type
 */
export function formatVariableValue(
  value: string | number | undefined,
  format: VariableDefinition['format']
): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(Number(value));
    case 'date':
      return new Date(value as string).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    case 'number':
      return new Intl.NumberFormat('en-US').format(Number(value));
    default:
      return String(value);
  }
}
