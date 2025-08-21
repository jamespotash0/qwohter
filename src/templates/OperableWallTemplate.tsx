import { BaseQuoteTemplate, QuoteData } from './BaseQuoteTemplate';
import { WallSpecification } from '@/types/quote';
import { SmartQuoteHelper } from './SmartQuoteTemplate';

export class OperableWallTemplate extends BaseQuoteTemplate {
  generateWallTable(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);

    return `<div class="wall-specifications-list" style="line-height: 1.15; margin-top: 10px;">
      <table style="border-collapse: collapse; width: 100%;">
       
        <tbody>
          ${wallEntries.map(([wallName, wall]: [string, WallSpecification]) => {
            const dimensions = this.helpers.formatDimensions(wall.lengthFeet, wall.lengthInches, wall.heightFeet, wall.heightInches, true);
            const wallSystemType = wall.wallSystemType || '';
            const panelCount = wall.panelCount || '';
            const panelConfiguration = wall.panelConfiguration || '';
            const quantity = wall.quantity || '1';

            return `
              <tr>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black; border-right: 0.5px solid black; font-weight: bold;">${wallName}</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${wallSystemType}</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${dimensions}</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${this.helpers.toWords(panelCount)} (${panelCount})</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black; border-right: 0.5px solid black;">${panelConfiguration} </td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${quantity} Each</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  }

  generateProposalIntro(data: QuoteData): string {
    // Get organization name from quote data, fallback to default if not available
    const organizationName = data.quote_details?.organizationName?.trim() || 
                             data.quote_details?.organization_name?.trim() || 
                             data.quote_details?.company_name?.trim() ||
                             '';
    const walls = data.wall_details?.walls || {};
    const wallCount = Object.keys(walls).length;
    const systemText = wallCount > 1 ? "wall systems" : "wall system";
    
    return `
      <div class="proposal-intro" style="line-height: 1.2; margin-top: 12px;">
        Thank you for considering <strong>${organizationName}</strong> for this project. As discussed, we are offering a proposal to furnish, deliver, & install, the following ${systemText} as specified below, at the above named project.
        <br><br><strong>Specifications as follows:</strong>
      </div>
    `;
  }

  generatePanelsSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);

    if (wallEntries.length === 0) return '';

    // Generate per-wall descriptions as bullet points
    const wallBullets = wallEntries.map(([wallName, wall]) => {
      const panelCountText = wall.panelCount && parseInt(wall.panelCount) > 1 ? 'Multiple' : 'Single';
      const heightText = this.helpers.formatDimensions('0', '0', wall.heightFeet, wall.heightInches, false).split(' x ')[1];
      
      const wallDescription = SmartQuoteHelper.buildSentence([
        { text: `<strong>${wallName}</strong> utilizes the Kwik-Wall` },
        { text: `<strong>${wall.series} series</strong>`, condition: SmartQuoteHelper.hasValue(wall.series) },
        { text: `<strong>Model ${wall.model}</strong>`, condition: SmartQuoteHelper.hasValue(wall.model) },
        { text: `configured with <strong>${panelCountText} ${wall.panelConfiguration}</strong>`, condition: SmartQuoteHelper.hasValue(wall.panelConfiguration) },
        { text: `for use on a <strong>${wall.trackType} Layout</strong>.`, condition: SmartQuoteHelper.hasValue(wall.trackType) },
        { text: `The wall is <strong>${heightText}</strong> in height, with panel lengths varying as required`, condition: SmartQuoteHelper.hasAllValues(wall.heightFeet, wall.heightInches) },
        { text: `Each panel features a <strong>${wall.panelDesign}</strong> design`, condition: SmartQuoteHelper.hasValue(wall.panelDesign) },
        { text: `is <strong>${wall.panelThickness}"</strong> thick`, condition: SmartQuoteHelper.hasValue(wall.panelThickness) },
        { text: `and constructed with a <strong>${wall.panelSkin}</strong> panel skin.`, condition: SmartQuoteHelper.hasValue(wall.panelSkin) },
        { text: `Panels are finished in <strong>${wall.panelFinishCategory}${wall.panelFinishSpecificItem && wall.panelFinishSpecificItem !== 'Unknown' ? ` - ${wall.panelFinishSpecificItem}` : ''}</strong> (from the manufacturer's standard offerings)`, condition: SmartQuoteHelper.hasValue(wall.panelFinishCategory) },
        { text: `and achieve a minimum STC rating of <strong>${wall.stcRating}</strong>.`, condition: SmartQuoteHelper.hasValue(wall.stcRating) },
        { text: `For acoustic performance, panels use <strong>${wall.verticalSeals}</strong> vertical seals,`, condition: SmartQuoteHelper.hasValue(wall.verticalSeals) },
        { text: `${wall.bottomSeals === "Retractable" ? "<strong>Operable</strong> retractable" : `<strong>${wall.bottomSeals}</strong>`} bottom seals,`, condition: SmartQuoteHelper.hasValue(wall.bottomSeals) },
        { text: `and <strong>${wall.topSeals}</strong> top seals.`, condition: SmartQuoteHelper.hasValue(wall.topSeals) },
        { text: `The lead panel provides closure with a <strong>${wall.initialClosureSystem} Seal</strong>`, condition: SmartQuoteHelper.hasValue(wall.initialClosureSystem) },
        { text: `while the end panel secures the system with a <strong>${wall.endPanelType}</strong>`, condition: SmartQuoteHelper.hasValue(wall.endPanelType) }
      ]);
      
      return `<li style="margin-bottom: 8px;">${wallDescription}</li>`;
    }).join('');

    return `<div class="panels-section" style="line-height: 1.15;">
      <h2 class="section-header">PANELS:</h2>
      <ul style="margin-left: 0px; padding-left: 0;">
        ${wallBullets}
      </ul>
    </div>`;
  }

  generateTrackSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    
    // Create inline sentence describing each wall's track system
    const wallDescriptions = wallEntries.map(([wallName, wall]) => {
      return `<strong>${wallName}</strong> utilizes a <strong>${wall.trackSystem || ""}</strong> Track System (${this.helpers.getMovementOnTrackText(wall?.panelConfiguration)} Panels)`;
    }).join(', and ');

    const summary = 
      wallEntries.length > 1 
        ? `These track systems allow for the specified movement of the panels, as noted in parentheses, along the overhead track, enabling flexible operation and easy stacking when the walls are not in use.`
        : `The track system allows for the specified movement of the panels, as noted in parentheses, along the overhead track, enabling flexible operation and easy stacking when the wall is not in use.`
    return `
      <div class="track-section" style="line-height: 1.15; margin-top: 0px;">
        <h2 class="section-header">TRACK:</h2>
        <p>
          ${wallDescriptions}. ${summary}
        </p>
      </div>
    `;
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
      
      return `<strong>${wallName}</strong> will be hung from <strong>${structureSupport}</strong>`;
    }).join(', and ');
    
    const summary = wallEntries.length > 1
      ? `to manufacturer's specs, as supplied by others. Soffits, if required, as supplied by others.`
      : `to manufacturer's specs, as supplied by others. Soffits, if required, as supplied by others.`;
    
    return `
      <div class="support-section" style="line-height: 1.15;">
        <h2 class="section-header">SUPPORT STRUCTURE (HEADER):</h2>
        <p>
          ${wallDescriptions} ${summary}
        </p>
      </div>
    `;
  }
 
  generateGeneralSection(data: QuoteData): string { //moving STC to panel details, add shop drawings as well
    const shopDrawingDelivery = data.delivery_details?.shopDrawingWeeks || '';
    const trackDelivery = data.delivery_details?.trackDeliveryWeeks || '';
    const panelDelivery = data.delivery_details?.panelDeliveryWeeks || '';
    const trackInstallation = data.delivery_details?.trackInstallationDays || '';
    const panelInstallation = data.delivery_details?.panelInstallationDays || '';

    return `
      <div class="general-section" style="line-height: 1.15; margin-bottom: 20px;">
        <h2 class="section-header">GENERAL:</h2>
        Estimated delivery for shop drawings would be <strong>${shopDrawingDelivery} weeks</strong>, after which approval of them, tracks would be delivered in <strong>${trackDelivery} weeks</strong>, & panels delivered in <strong>${panelDelivery} weeks</strong>. Installation of tracks would take approximately <strong>${trackInstallation} working days</strong> and installation of panels would take <strong>${panelInstallation} additional days</strong>.
      </div>
    `;
  }

  getPageBreakStrategy(data: QuoteData): { breakAfterSection: string; minimumHeight: number }[] {
    const wallCount = this.helpers.getWallCount(data);
    const strategy = [];

    // Base strategy for operable walls
    if (wallCount >= 3) {
      strategy.push({ breakAfterSection: 'panels-section', minimumHeight: 200 });
    }

    // Check for pass doors section  
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    const firstWall = wallEntries[0]?.[1];
    
    if (firstWall?.passDoorPanels) {
      strategy.push({ breakAfterSection: 'pass-doors-section', minimumHeight: 100 });
    }

    if (data.pocket_doors?.foldType) {
      strategy.push({ breakAfterSection: 'pocket-doors-section', minimumHeight: 150 });
    }

    strategy.push({ breakAfterSection: 'support-section', minimumHeight: 300 });

    return strategy;
  }
}