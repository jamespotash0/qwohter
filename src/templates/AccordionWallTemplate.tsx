import { BaseQuoteTemplate, QuoteData } from './BaseQuoteTemplate';
import { WallSpecification } from '@/types/quote';

export class AccordionPartitionTemplate extends BaseQuoteTemplate {
  generateWallTable(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);

    return `<div class="wall-specifications-list" style="line-height: 1.15; margin-top: 10px;">
      <table style="border-collapse: collapse; width: 100%;">
        <tbody>
          ${wallEntries.map(([wallName, wall]: [string, WallSpecification]) => {
            const dimensions = this.helpers.formatDimensions(wall.lengthFeet, wall.lengthInches, wall.heightFeet, wall.heightInches, true);
            const panelCount = wall.panelCount || '';
            const panelConfiguration = wall.panelConfiguration || '';
            const quantity = wall.quantity || '1';

            return `
              <tr>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black; border-right: 0.5px solid black; font-weight: bold;">${wallName}</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${dimensions}</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${this.helpers.toWords(panelCount)} (${panelCount})</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black; border-right: 0.5px solid black;">${panelConfiguration}</td>
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
    const wallSystemType = this.helpers.getWallSystemType(data);
    // Get organization name from quote data, fallback to default if not available
    const organizationName = data.quote_details?.organizationName || 
                             data.quote_details?.organization_name || 
                             data.quote_details?.company_name ||
                             'Contemporary Wall Systems';

    return `<div class="proposal-intro" style="line-height: 1.2; margin-top: 12px;">
      Thank you for considering <strong>${organizationName}</strong> for this project. As discussed, we are offering a proposal to furnish, deliver, and install, as noted, <strong>${wallCount === 1 ? 'ONE (1)' : wallCount === 2 ? 'TWO (2)' : wallCount === 3 ? 'THREE (3)' : wallCount === 4 ? 'FOUR (4)' : `${wallCount}`} ${wallSystemType}</strong> as specified below, at the above named project.
      <br><br><strong>Specifications as follows:</strong>
    </div>`;
  }

  generatePanelsSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    const firstWall = wallEntries[0]?.[1];

    if (!firstWall) return '';

    return `<div class="panels-section" style="line-height: 1.15;">
      <h2 class="section-header">PANELS:</h2>
      <p>
        This accordion partition system utilizes the <strong>${firstWall.series || ''} Series Model ${firstWall.model || ''}</strong> configured with <strong>${firstWall.panelConfiguration || ''}</strong>. The partition consists of interconnected panels that fold and unfold in an accordion-style manner, providing flexible space division.
        <br><br>The partition stands <strong>${this.helpers.formatDimensions('0', '0', firstWall.heightFeet, firstWall.heightInches, false).split(' x ')[1]}</strong> in height with a total length of <strong>${this.helpers.formatDimensions(firstWall.lengthFeet, firstWall.lengthInches, '0', '0', false).split(' x ')[0]}</strong>. Each panel features a <strong>${firstWall.panelDesign || ''}</strong> design and is nominally <strong>${firstWall.panelThickness || ''}\"</strong> thick. The panels are finished with <strong>${firstWall.panelFinishCategory || ''}</strong> material providing both aesthetic appeal and functional durability. The system operates on a <strong>${firstWall.trackSystem || ''}</strong> for smooth operation and secure positioning when deployed.
      </p>
    </div>`;
  }

  generateTrackSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    
    // Create inline sentence describing each wall's track system
    const wallDescriptions = wallEntries.map(([wallName, wall]) => {
      return `<strong>${wallName}</strong> operates on a <strong>${wall.trackSystem || ""}</strong> system`;
    }).join(', and ');

    const summary = 
      wallEntries.length > 1 
        ? `These track systems allow for smooth folding and unfolding of the accordion partitions, enabling quick space reconfiguration.`
        : `The track system allows for smooth folding and unfolding of the accordion partition, enabling quick space reconfiguration.`
    
    return `<div class="track-section" style="line-height: 1.15; margin-top: 0px;">
      <h2 class="section-header">TRACK:</h2>
      <p>
        ${wallDescriptions}. ${summary}
      </p>
    </div>`;
  }

  generateSupportSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    
    // Create inline sentence describing each wall's structure support
    const wallDescriptions = wallEntries.map(([wallName, wall]) => {
      // Check for structure support - handle different possible values
      let structureSupport = wall.structureSupport;
      
      // If not set or is 'None', try fallback to global structure support
      if (!structureSupport || structureSupport === 'None' || structureSupport.trim() === '') {
        structureSupport = data.support_structure?.mountingTrack || 'None Required';
      }
      
      return `<strong>${wallName}</strong> will be mounted to <strong>${structureSupport}</strong>`;
    }).join(', and ');
    
    return `<div class="support-section" style="line-height: 1.15;">
      <h2 class="section-header">SUPPORT STRUCTURE (HEADER):</h2>
      <p>
        ${wallDescriptions} above, to manufacturer's specifications, as supplied by others. Structural modifications, if required, as supplied by others.
      </p>
    </div>`;
  }

  generateGeneralSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    const firstWall = wallEntries[0]?.[1];
    
    const shopDrawingDelivery = data.delivery_details?.shopDrawingWeeks || '';
    const trackDelivery = data.delivery_details?.trackDeliveryWeeks || '';
    const panelDelivery = data.delivery_details?.panelDeliveryWeeks || '';
    const trackInstallation = data.delivery_details?.trackInstallationDays || '';
    const panelInstallation = data.delivery_details?.panelInstallationDays || '';

    return `<div class="general-section" style="line-height: 1.15; margin-bottom: 20px;">
      <h2 class="section-header">GENERAL:</h2>
      Each partition will provide a minimum <strong>STC of ${firstWall?.stcRating || ''}</strong> for acoustic separation. Estimated delivery for shop drawings would be <strong>${shopDrawingDelivery} weeks</strong>, after which approval of them, delivery of tracks would be <strong>${trackDelivery} weeks</strong>, & panels <strong>${panelDelivery} weeks</strong>. Installation of tracks would take approximately <strong>${trackInstallation} working days</strong>, partition installation would take <strong>${panelInstallation} additional days</strong>.
    </div>`;
  }

  getPageBreakStrategy(data: QuoteData): { breakAfterSection: string; minimumHeight: number }[] {
    const wallCount = this.helpers.getWallCount(data);
    const strategy = [];

    // Base strategy for accordion partitions
    if (wallCount >= 2) {
      strategy.push({ breakAfterSection: 'panels-section', minimumHeight: 200 });
    }

    strategy.push({ breakAfterSection: 'support-section', minimumHeight: 300 });

    return strategy;
  }
}