import { QuoteData } from './BaseQuoteTemplate';
import { OperableWallTemplate } from './OperableWallTemplate';

export class TemplateFactory {
  static getTemplate(data: QuoteData) {
    return new OperableWallTemplate(); // Default to OperableWallTemplate for now
  }


  static generateQuote(data: QuoteData): string {    
    const template = this.getTemplate(data); 
    const result = template.generate(data);
    return result;
  }
}