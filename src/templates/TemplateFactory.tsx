import { QuoteData } from './BaseQuoteTemplate';
import { GenericWallTemplate } from './GenericWallTemplate';

export class TemplateFactory {
  static getTemplate() {
    return new GenericWallTemplate();
  }


  static generateQuote(data: QuoteData): string {    
    const template = this.getTemplate(); 
    const result = template.generate(data);
    return result;
  }
}