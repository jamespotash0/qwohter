/**
 * Variable Extension for Tiptap
 *
 * Custom node for inserting variable placeholders in the editor.
 * Variables display as styled inline elements and resolve to actual values.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

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
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-variable': HTMLAttributes.variableKey,
        'class': 'variable-node inline-flex items-center px-2 py-0.5 mx-0.5 rounded-md bg-coral/10 text-coral text-sm font-medium border border-coral/20 select-none',
        'contenteditable': 'false',
      }),
      `{${HTMLAttributes.variableLabel}}`,
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
