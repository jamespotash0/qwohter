import { BaseQuoteTemplate, QuoteData } from './BaseQuoteTemplate';
import { WallSpecification } from '@/types/quote';

export class GlassWallTemplate extends BaseQuoteTemplate {
  generateWallTable(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);

    return `<div class="wall-specifications-list" style="line-height: 1.15; margin-top: 10px;">
      <table style="border-collapse: collapse; width: 100%;">
        <tbody>
          ${wallEntries.map(([wallName, wall]: [string, WallSpecification]) => {
            const dimensions = this.helpers.formatDimensions(wall.lengthFeet, wall.lengthInches, wall.heightFeet, wall.heightInches, true);
            const panelCount = wall.panelCount || '';
            const frameType = wall.glasswallPanelConfiguration || 'Standard Frame';
            const quantity = wall.quantity || '1';
            

            return `
              <tr>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black; border-right: 0.5px solid black; font-weight: bold;">${wallName}</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${dimensions}</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${this.helpers.toWords(panelCount)} (${panelCount}) Glass Panels</td>
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

    return `<div class="proposal-intro" style="line-height: 1.2; margin-top: 12px;">
      Thank you for considering Contemporary Wall Systems for this project. As discussed, we are offering a proposal to furnish, deliver, and install, as noted, <strong>${wallCount === 1 ? 'ONE (1)' : wallCount === 2 ? 'TWO (2)' : wallCount === 3 ? 'THREE (3)' : wallCount === 4 ? 'FOUR (4)' : `${wallCount}`} Glass Wall System${wallCount > 1 ? 's' : ''}</strong> as specified below, at the above named project.
      <br><br><strong>Glass Wall Specifications as follows:</strong>
    </div>`;
  }

  generatePanelsSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    const firstWall = wallEntries[0]?.[1];

    if (!firstWall) return '';

    return `<div class="panels-section" style="line-height: 1.15;">
      <h2 class="section-header">GLASS PANELS:</h2>
      <p>
        This glass wall system utilizes the Kwik-Wall <strong>${firstWall.series || 'Professional'} Series Model ${firstWall.model || ''}</strong> featuring high-performance glass panels designed for maximum transparency and acoustic control. The system is configured for <strong>${firstWall.trackType || ''} Layout</strong> operation.
        <br><br>The wall consists of <strong>${this.helpers.getPanelConfigurationText(firstWall.panelCount)} glass panels</strong> with <strong>${firstWall.panelFinishCategory || ''}</strong> glass specification. Each panel stands <strong>${this.helpers.formatDimensions('0', '0', firstWall.heightFeet, firstWall.heightInches, false).split(' x ')[1]}</strong> in height with varying widths as required. The glass panels feature a <strong>${firstWall.panelDesign || 'Contemporary'}</strong> design with <strong>${firstWall.panelThickness || ''}"</strong> thick insulated glass units for optimal thermal and acoustic performance. The system incorporates <strong>${firstWall.panelSkin || ''}</strong> framing for durability and aesthetic appeal. Glass panels are suspended from a <strong>${firstWall.trackSystem || ''}</strong> overhead track system, ensuring smooth operation and precise alignment. Sealing is achieved through <strong>${firstWall.verticalSeals || ''}</strong> vertical seals, <strong>${firstWall.bottomSeals || ''}</strong> bottom seals, and <strong>${firstWall.topSeals || ''}</strong> top seals for optimal acoustic separation.
      </p>
    </div>`;
  }

  generateTrackSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    const firstWall = wallEntries[0]?.[1];

    return `<div class="track-section" style="line-height: 1.15; margin-top: 0px;">
      <h2 class="section-header">TRACK SYSTEM:</h2>
      <p>
        We will be using a <strong>${firstWall?.trackSystem || ''} Track System</strong> specifically designed for glass wall applications. This specialized track allows for <strong>${this.helpers.getMovementOnTrackText(firstWall?.panelConfiguration)}</strong> of the glass panels, providing smooth operation while maintaining structural integrity and acoustic performance. The track system includes integrated safety features and precise alignment mechanisms essential for glass panel operation.
      </p>
    </div>`;
  }

  generateSupportSection(data: QuoteData): string {
    const mountingTrack = data.support_structure?.mountingTrack || 'Structural Steel Header';

    return `<div class="support-section" style="line-height: 1.15;">
      <h2 class="section-header">SUPPORT STRUCTURE (HEADER):</h2>
      Glass panels will be suspended from a <strong>${mountingTrack}</strong> engineered to support the additional weight and dynamic loads of glass wall systems, to manufacturer's specifications, as supplied by others. Structural adequacy verification and soffits, if required, are supplied by others. <strong>Note: Glass wall systems require enhanced structural support compared to standard operable walls.</strong>
    </div>`;
  }

  generateGeneralSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    const firstWall = wallEntries[0]?.[1];
    
    const trackDelivery = data.delivery_details?.trackDeliveryWeeks || '';
    const panelDelivery = data.delivery_details?.panelDeliveryWeeks || '';
    const trackInstallation = data.delivery_details?.trackInstallationDays || '';
    const panelInstallation = data.delivery_details?.panelInstallationDays || '';

    return `<div class="general-section" style="line-height: 1.15; margin-bottom: 20px;">
      <h2 class="section-header">GENERAL:</h2>
      Each glass wall will provide acoustic performance with an <strong>STC rating of ${firstWall?.stcRating || '45'}</strong> while maintaining visual transparency. Estimated delivery would be <strong>${trackDelivery || '6-8'} weeks</strong> after approval of shop drawings for tracks, & <strong>${panelDelivery || '8-10'} weeks</strong> for glass panels. Installation of tracks would take approximately <strong>${trackInstallation || '3-5'} working days</strong>, glass panel installation would take <strong>${panelInstallation || '2-3'} additional days</strong>. <strong>Special handling and installation procedures are required for glass panels.</strong>
    </div>`;
  }

  getPageBreakStrategy(data: QuoteData): { breakAfterSection: string; minimumHeight: number }[] {
    const wallCount = this.helpers.getWallCount(data);
    const strategy = [];

    // Glass walls typically need different page break strategy
    if (wallCount >= 2) {
      strategy.push({ breakAfterSection: 'panels-section', minimumHeight: 250 });
    }

    strategy.push({ breakAfterSection: 'track-section', minimumHeight: 200 });
    strategy.push({ breakAfterSection: 'support-section', minimumHeight: 350 });

    return strategy;
  }
}