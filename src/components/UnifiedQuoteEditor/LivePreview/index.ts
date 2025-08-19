// Main component export - rename to avoid circular imports
export { default as LivePreviewPanel, LivePreviewPanelCore } from './LivePreviewPanel';
export { LivePreviewPanelCore as default } from './LivePreviewPanel';

// Type exports
export type { LivePreviewPanelProps, DocumentPage } from './types';

// Utility exports (for testing or advanced usage)
export { PageCalculator } from './page-calculator';
export { SectionInteractions } from './section-interactions';
export { getPreviewStyles } from './preview-styles';
export { PreviewControls } from './PreviewControls';
export { DocumentCanvas } from './DocumentCanvas';