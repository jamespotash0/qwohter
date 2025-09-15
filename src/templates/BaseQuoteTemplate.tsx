// Re-export the refactored BaseQuoteTemplate component
// This maintains backward compatibility while using the new modular structure
export { BaseQuoteTemplate, BaseQuoteTemplate as default } from './BaseTemplate/';
export type { QuoteData, TemplateHelpers, PageBreakStrategy } from './BaseTemplate/types';