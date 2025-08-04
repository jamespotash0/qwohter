import { QuoteData } from './BaseQuoteTemplate';
import { OperableWallTemplate } from './OperableWallTemplate';
import { GlassWallTemplate } from './GlassWallTemplate';

export type WallSystemType = 'Operable Wall' | 'Glass Wall' | 'Folding Glass Wall';

export class TemplateFactory {
  static getTemplate(data: QuoteData) {
    const wallSystemType = this.determineWallSystemType(data);
    
    switch (wallSystemType) {
      case 'Glass Wall':
      case 'Folding Glass Wall':
        return new GlassWallTemplate();
      case 'Operable Wall':
      default:
        return new OperableWallTemplate();
    }
  }

  private static determineWallSystemType(data: QuoteData): WallSystemType {
    const walls = data.wall_details?.walls || {};
    const firstWall = Object.values(walls)[0];
    
    if (!firstWall) return 'Operable Wall';
    
    const wallSystemType = firstWall.wallSystemType?.toLowerCase() || '';
    const model = firstWall.model?.toLowerCase() || '';
    const panelSkin = firstWall.panelSkin?.toLowerCase() || '';
    
    // Check for glass wall indicators
    if (wallSystemType.includes('glass') || 
        model.includes('glass') ||
        panelSkin.includes('glass') ||
        wallSystemType.includes('folding glass')) {
      return wallSystemType.includes('folding') ? 'Folding Glass Wall' : 'Glass Wall';
    }
    
    return 'Operable Wall';
  }

  static generateQuote(data: QuoteData): string {
    const template = this.getTemplate(data);
    return template.generate(data);
  }
}