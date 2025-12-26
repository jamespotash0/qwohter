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

// Page-based editor
export {
  PageBasedPresentationEditor,
  type PageBasedEditorRef,
} from './PageBasedPresentationEditor';
export { PageNodeView } from './PageNodeView';

// Canvas-like positioning
export { PositionedBlockNodeView } from './PositionedBlockNodeView';

// Table controls
export { TableControls } from './TableControls';
export { TableFloatingMenu } from './TableFloatingMenu';

// Hooks
export * from './hooks';

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

// Google Docs Integration
export { GoogleDocsEmbed } from './GoogleDocsEmbed';
export { GoogleDocsMode } from './GoogleDocsMode';

// Builder Configuration
export { PresentationBuilderConfig } from './PresentationBuilderConfig';
