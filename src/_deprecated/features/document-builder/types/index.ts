/**
 * Document Builder Type Definitions
 * Types for the document editor and templates
 */

// ============================================================================
// Variable Types
// ============================================================================

/**
 * Available variable categories for the insert menu
 */
export type VariableCategory =
  | 'client'
  | 'project'
  | 'pricing'
  | 'company'
  | 'dates'
  | 'form';

/**
 * Variable definition with metadata
 */
export interface VariableDefinition {
  key: string;
  label: string;
  category: VariableCategory;
  description?: string;
  format?: 'text' | 'currency' | 'date' | 'number';
}

/**
 * Form field variable derived from a linked form
 */
export interface FormFieldVariable {
  key: string;       // The field.name or field.id
  label: string;     // The field.label
  fieldType: string; // The field.field_type
  tabName?: string;  // The tab name the field belongs to
}

// ============================================================================
// Page Settings Types
// ============================================================================

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PageSettings {
  size: 'letter' | 'a4' | 'legal';
  orientation: 'portrait' | 'landscape';
  margins: PageMargins;
}

// ============================================================================
// Document Template Types
// ============================================================================

export interface DocumentTemplateContent {
  version: string;
  content: unknown[];
  variables: string[];
}

// ============================================================================
// Editor State Types
// ============================================================================

export interface EditorState {
  content: unknown[];
  isDirty: boolean;
  lastSaved?: Date;
}

// ============================================================================
// Export Types
// ============================================================================

export type ExportFormat = 'pdf' | 'docx' | 'html';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  pageSettings?: PageSettings;
  variables?: Record<string, string>;
}
