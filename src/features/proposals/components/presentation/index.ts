/**
 * Presentation Components Export
 */

export {
  PresentationEditor,
  DEFAULT_CONTENT,
  type EditorContent,
  type PresentationEditorRef,
  type PageSettings,
} from './PresentationEditor';

export {
  DEFAULT_PAGE_SETTINGS,
} from './toolbar';
export { EditorToolbar } from './EditorToolbar';
export { VariableInserter } from './VariableInserter';
export { VariablePanel } from './VariablePanel';
export { PresentationToolbar } from './PresentationToolbar';
export {
  VariableExtension,
  AVAILABLE_VARIABLES,
  getVariablesByCategory,
  getAllVariablesByCategory,
  getAllFormVariables,
  type VariableDefinition,
  type VariableAttributes,
} from './VariableExtension';
export { EditorHelpButton } from './EditorHelpButton';
export { PreviewDialog } from './PreviewDialog';
export { VariableSuggestion, setVariablesGetter } from './VariableSuggestion';
