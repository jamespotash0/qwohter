import { QuoteData } from './BaseQuoteTemplate';
import { OperableWallTemplate } from './OperableWallTemplate';
import { GlassWallTemplate } from './GlassWallTemplate';
import { AccordionWallTemplate } from './AccordionWallTemplate';
import { MixedWallTemplate } from './MixedWallTemplate';

export type WallSystemType = 'Operable Wall' | 'Glass Wall' | 'Accordion Partitions' | 'Mixed Wall';

export class TemplateFactory {
  static getTemplate(data: QuoteData) {
    const wallSystemType = this.determineWallSystemType(data);
    
    switch (wallSystemType) {
      case 'Accordion Partitions':
        return new AccordionWallTemplate();
      case 'Glass Wall':
        return new GlassWallTemplate();
      case 'Mixed Wall':
        return new MixedWallTemplate();
      case 'Operable Wall':
      default:
        return new OperableWallTemplate();
    }
  }

  private static determineWallSystemType(data: QuoteData): WallSystemType {
    const walls = data.wall_details?.walls || {};
    const wallTypes = Object.values(walls).map(wall => wall.wallSystemType?.toLowerCase() || '');
    
    if (wallTypes.length === 0) return 'Operable Wall';
    
    // Check for different wall types
    const hasGlass = wallTypes.some(type => type.includes('glass'));
    const hasOperable = wallTypes.some(type => !type.includes('glass') && !type.includes('accordion'));
    const hasAccordion = wallTypes.some(type => type.includes('accordion'));
    
    // Count how many different types we have
    const typeCount = [hasGlass, hasOperable, hasAccordion].filter(Boolean).length;
    
    // If mixed types, use mixed template
    if (typeCount > 1) {
      return 'Mixed Wall';
    }
    
    // If all same type, use specific template
    if (hasGlass) return 'Glass Wall';
    if (hasAccordion) return 'Accordion Partitions';
    
    // Default to operable wall template
    return 'Operable Wall';
  }

  static generateQuote(data: QuoteData): string {
    const template = this.getTemplate(data);
    return template.generate(data);
  }
}