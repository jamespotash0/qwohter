import { TemplateFactory } from '@/templates/TemplateFactory';
import { QuoteData } from '@/templates/BaseQuoteTemplate';

export type { QuoteData };

export const generateQuoteText = (data: QuoteData): string => {
  return TemplateFactory.generateQuote(data);
};

export default generateQuoteText;