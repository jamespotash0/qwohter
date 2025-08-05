import { QuoteData } from './BaseQuoteTemplate';
import { OperableWallTemplate } from './OperableWallTemplate';
import { GlassWallTemplate } from './GlassWallTemplate';
import { AccordionWallTemplate } from './AccordionWallTemplate';

export type WallSystemType = 'Operable Wall' | 'Glass Wall' | 'Accordion Partitions';

export class TemplateFactory {
  static getTemplate(data: QuoteData) {
    const wallSystemType = this.determineWallSystemType(data);
    
    switch (wallSystemType) {
      case 'Accordion Partitions':
        return new AccordionWallTemplate();
      case 'Glass Wall':
        return new GlassWallTemplate();
      case 'Operable Wall':
      default:
        return new OperableWallTemplate();
    }
  }

  private static determineWallSystemType(data: QuoteData): WallSystemType {
    const walls = data.wall_details?.walls || {};
    const firstWall = Object.values(walls)[0];
    
    if (!firstWall || !firstWall.wallSystemType) return 'Operable Wall';
    
    const type = firstWall.wallSystemType?.toLowerCase() || '';
  
    
    // Check for glass wall indicators
    if (type.includes('glass')) { 
      return 'Glass Wall';
    }
    if (type.includes('accordion')) {
      return 'Accordion Partitions';
    }
    return 'Operable Wall';
  }

  static generateQuote(data: QuoteData): string {
    const template = this.getTemplate(data);
    return template.generate(data);
  }
}