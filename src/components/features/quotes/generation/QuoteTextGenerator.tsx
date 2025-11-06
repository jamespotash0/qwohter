import { TemplateFactory } from '@/templates/TemplateFactory';
import { QuoteData, SectionVisibilityConfig } from '@/templates/BaseQuoteTemplate';

export type { QuoteData };

export const generateQuoteText = (data: QuoteData, visibilityConfig?: SectionVisibilityConfig): string => {
  return TemplateFactory.generateQuote(data, visibilityConfig);
};

export default generateQuoteText;