/**
 * Document Builder Feature
 * Export all components and utilities for building document templates
 */

// Components
export { DocumentEditor } from './components/DocumentEditor';
export type { PlateElement } from './components/DocumentEditor';
export { EditorToolbar } from './components/EditorToolbar';
export { VariableInsertMenu } from './components/VariableInsertMenu';

// Variable utilities
export {
  replaceVariables,
  extractVariableKeys,
  extractVariablesFromContent,
  replaceVariablesInContent,
} from './components/VariableElement';

// Configuration
export {
  DOCUMENT_VARIABLES,
  VARIABLE_CATEGORIES,
  getVariablesByCategory,
  findVariable,
  formatVariableValue,
} from './config/variables';

// Types
export type {
  VariableCategory,
  VariableDefinition,
  PageSettings,
  PageMargins,
  DocumentTemplateContent,
  EditorState,
  ExportFormat,
  ExportOptions,
} from './types';
