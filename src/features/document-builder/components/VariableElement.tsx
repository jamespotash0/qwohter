/**
 * Variable Element Utilities
 * Functions for handling variable placeholders in documents
 */

import { findVariable, formatVariableValue } from '../config/variables';

/**
 * Replace variable placeholders with actual values
 * e.g., {{client_name}} -> "John Doe"
 */
export function replaceVariables(
  text: string,
  values: Record<string, string | number | undefined>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = values[key];
    if (value === undefined || value === '') {
      return match; // Keep placeholder if no value
    }

    const variableDef = findVariable(key);
    return formatVariableValue(value, variableDef?.format);
  });
}

/**
 * Extract all variable keys from text
 * e.g., "Hello {{client_name}}, your total is {{total_price}}"
 * returns ["client_name", "total_price"]
 */
export function extractVariableKeys(text: string): string[] {
  const matches = text.matchAll(/\{\{(\w+)\}\}/g);
  const keys = new Set<string>();
  for (const match of matches) {
    keys.add(match[1]);
  }
  return Array.from(keys);
}

/**
 * Extract all variable keys from Plate.js content
 */
export function extractVariablesFromContent(
  content: Array<{ children?: Array<{ text?: string; children?: unknown[] }>; text?: string }>
): string[] {
  const keys = new Set<string>();

  const traverse = (node: { text?: string; children?: unknown[] }) => {
    if (typeof node.text === 'string') {
      const nodeKeys = extractVariableKeys(node.text);
      nodeKeys.forEach((key) => keys.add(key));
    }
    if (Array.isArray(node.children)) {
      node.children.forEach((child) => traverse(child as { text?: string; children?: unknown[] }));
    }
  };

  content.forEach(traverse);
  return Array.from(keys);
}

/**
 * Replace variables in Plate.js content
 * Returns a new content array with replaced values
 */
export function replaceVariablesInContent(
  content: Array<{ children?: Array<{ text?: string }>; [key: string]: unknown }>,
  values: Record<string, string | number | undefined>
): Array<{ children?: Array<{ text?: string }>; [key: string]: unknown }> {
  const replaceInNode = (
    node: { text?: string; children?: Array<{ text?: string }>; [key: string]: unknown }
  ): { text?: string; children?: Array<{ text?: string }>; [key: string]: unknown } => {
    if (typeof node.text === 'string') {
      return { ...node, text: replaceVariables(node.text, values) };
    }
    if (Array.isArray(node.children)) {
      return {
        ...node,
        children: node.children.map((child) => replaceInNode(child as { text?: string; children?: Array<{ text?: string }>; [key: string]: unknown })),
      };
    }
    return node;
  };

  return content.map(replaceInNode);
}
