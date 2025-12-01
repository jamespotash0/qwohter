// Re-export the refactored BaseQuoteTemplate component
// This maintains backward compatibility while using the new modular structure
export { BaseQuoteTemplate, BaseQuoteTemplate as default, defaultSectionVisibility } from './BaseTemplate/';
export type { QuoteData, TemplateHelpers, PageBreakStrategy, SectionVisibilityConfig } from './BaseTemplate/types';