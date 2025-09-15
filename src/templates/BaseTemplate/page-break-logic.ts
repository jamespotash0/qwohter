import { QuoteData, TemplateHelpers } from './types';

export class PageBreakLogic {
  private helpers: TemplateHelpers;

  constructor(helpers: TemplateHelpers) {
    this.helpers = helpers;
  }

  shouldAddPageBreak(data: QuoteData): { height: number; forceBreak: boolean } | null {
    const wallCount = this.helpers.getWallCount(data);
    // Check if any walls have pocket doors (new per-wall approach)
    const hasPocketDoors = !!(data.wall_details?.walls && 
      Object.values(data.wall_details.walls).some(wall => 
        wall.pocketDoors?.foldType && wall.pocketDoors?.foldType !== 'None'
      ));
    
    // Calculate estimated content height
    let estimatedHeight = 400; // Base content height
    estimatedHeight += wallCount * 40; // Each wall adds ~40px
    estimatedHeight += hasPocketDoors ? 80 : 0; // Pocket doors section
    
    // If content is likely to overflow to next page awkwardly, add strategic break
    if (estimatedHeight > 600 && estimatedHeight < 800) {
      return { height: 120, forceBreak: false };
    } else if (estimatedHeight > 800) {
      return { height: 150, forceBreak: true };
    }
    
    return null;
  }
}