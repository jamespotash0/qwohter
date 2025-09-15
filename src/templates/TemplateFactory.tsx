import { QuoteData } from './BaseQuoteTemplate';
import { GenericWallTemplate } from './GenericWallTemplate';

export class TemplateFactory {
  static getTemplate(data: QuoteData) {
    return new GenericWallTemplate();
  }


  static generateQuote(data: QuoteData): string {    
    const template = this.getTemplate(data); 
    const result = template.generate(data);
    return result;
  }
}