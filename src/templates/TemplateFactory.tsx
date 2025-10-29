import { QuoteData, SectionVisibilityConfig } from './BaseQuoteTemplate';
import { GenericWallTemplate } from './GenericWallTemplate';

export class TemplateFactory {
  static getTemplate() {
    return new GenericWallTemplate();
  }


  static generateQuote(data: QuoteData, visibilityConfig?: SectionVisibilityConfig): string {
    const template = this.getTemplate();
    const result = template.generateWithCSSPagination(data, visibilityConfig);
    return result;
  }
}