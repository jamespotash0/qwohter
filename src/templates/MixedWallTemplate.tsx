import { BaseQuoteTemplate, QuoteData } from './BaseQuoteTemplate';
import { WallSpecification } from '@/types/quote';

export class MixedWallTemplate extends BaseQuoteTemplate {
  generateWallTable(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);

    return `<div class="wall-specifications-list" style="line-height: 1.15; margin-top: 10px;">
      <table style="border-collapse: collapse; width: 100%;">
        <tbody>
          ${wallEntries.map(([wallName, wall]: [string, WallSpecification]) => {
            const dimensions = this.helpers.formatDimensions(wall.lengthFeet, wall.lengthInches, wall.heightFeet, wall.heightInches, true);
            const panelCount = wall.panelCount || '';
            const quantity = wall.quantity || '1';
            
            // Check if this specific wall is a glass wall
            const isGlassWall = wall.wallSystemType?.toLowerCase().includes('glass');
            const frameType = isGlassWall 
              ? (wall.glasswallPanelConfiguration || '')
              : (wall.panelConfiguration || '');
            const panelDescription = isGlassWall 
              ? `${this.helpers.toWords(panelCount)} (${panelCount}) Glass Panels`
              : `${this.helpers.toWords(panelCount)} (${panelCount}) Panels`;

            return `
              <tr>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black; border-right: 0.5px solid black; font-weight: bold;">${wallName}</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${dimensions}</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${panelDescription}</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black; border-right: 0.5px solid black;">${frameType}</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${quantity} Each</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  }

  generateProposalIntro(data: QuoteData): string {
    const wallCount = this.helpers.getWallCount(data);
    const walls = data.wall_details?.walls || {};
    const wallTypes = Object.values(walls).map(wall => wall.wallSystemType?.toLowerCase() || '');
    
    const hasGlass = wallTypes.some(type => type.includes('glass'));
    const hasOperable = wallTypes.some(type => !type.includes('glass') && !type.includes('accordion'));
    const hasAccordion = wallTypes.some(type => type.includes('accordion'));
    
    // Build dynamic system description
    let systemTypes = [];
    if (hasGlass) systemTypes.push('Glass Wall');
    if (hasOperable) systemTypes.push('Operable Wall');
    if (hasAccordion) systemTypes.push('Accordion Partition');
    
    const systemDescription = systemTypes.length > 1 
      ? systemTypes.slice(0, -1).join(', ') + ' and ' + systemTypes[systemTypes.length - 1] + ' Systems'
      : systemTypes[0] + ' Systems';

    // Get organization name from quote data, fallback to default if not available
    const organizationName = data.quote_details?.organizationName || 
                             data.quote_details?.organization_name || 
                             data.quote_details?.company_name ||
                             'Contemporary Wall Systems';

    return `<div class="proposal-intro" style="line-height: 1.2; margin-top: 12px;">
      Thank you for considering <strong>${organizationName}</strong> for this project. As discussed, we are offering a proposal to furnish, deliver, and install, as noted, <strong>${wallCount === 1 ? 'ONE (1)' : wallCount === 2 ? 'TWO (2)' : wallCount === 3 ? 'THREE (3)' : wallCount === 4 ? 'FOUR (4)' : `${wallCount}`} Mixed Wall System${wallCount > 1 ? 's' : ''}</strong> consisting of ${systemDescription} as specified below, at the above named project.
      <br><br><strong>Mixed Wall System Specifications as follows:</strong>
    </div>`;
  }

  generatePanelsSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    
    // Group sections by wall type for better organization
    const glassSections = [];
    const operableSections = [];
    
    for (const [wallName, wall] of wallEntries) {
      const isGlassWall = wall.wallSystemType?.toLowerCase().includes('glass');
      
      if (isGlassWall) {
        glassSections.push(this.generateGlassWallSection(wallName, wall));
      } else {
        operableSections.push(this.generateOperableWallSection(wallName, wall));
      }
    }
    
    return `<div class="panels-section" style="line-height: 1.15;">
      ${glassSections.length > 0 ? `
        <div class="glass-wall-sections">
          <h4 style="margin-top: 20px; margin-bottom: 10px; font-weight: bold;">Glass Wall Specifications:</h4>
          ${glassSections.join('')}
        </div>
      ` : ''}
      
      ${operableSections.length > 0 ? `
        <div class="operable-wall-sections">
          <h4 style="margin-top: 20px; margin-bottom: 10px; font-weight: bold;">Operable Wall Specifications:</h4>
          ${operableSections.join('')}
        </div>
      ` : ''}
    </div>`;
  }

  private generateGlassWallSection(wallName: string, wall: WallSpecification): string {
    const model = wall.glasswallModel || 'Not specified';
    const operation = wall.glasswallOperation || 'Not specified';
    const glassType = wall.glasswallGlassType || 'Not specified';
    const stcRating = wall.glasswallSTCRating || 'Not specified';
    
    return `<div class="glass-wall-details" style="margin-bottom: 15px;">
      <strong>${wallName} (Glass Wall):</strong><br>
      Model: ${model}<br>
      Operation: ${operation}<br>
      Glass Type: ${glassType}<br>
      STC Rating: ${stcRating}
    </div>`;
  }

  private generateOperableWallSection(wallName: string, wall: WallSpecification): string {
    const series = wall.series || 'Not specified';
    const model = wall.model || 'Not specified';
    const panelDesign = wall.panelDesign || 'Not specified';
    const stcRating = wall.stcRating || 'Not specified';
    
    return `<div class="operable-wall-details" style="margin-bottom: 15px;">
      <strong>${wallName} (Operable Wall):</strong><br>
      Series: ${series}<br>
      Model: ${model}<br>
      Panel Design: ${panelDesign}<br>
      STC Rating: ${stcRating}
    </div>`;
  }
}