// Main abstract class export
export { BaseQuoteTemplate } from './BaseQuoteTemplate';

// Type exports
export type { 
  QuoteData, 
  TemplateHelpers, 
  PageBreakStrategy 
} from './types';

// Utility exports (for testing or advanced usage)
export { createTemplateHelpers } from './template-helpers';
export { SectionGenerators } from './section-generators';
export { PageBreakLogic } from './page-break-logic';