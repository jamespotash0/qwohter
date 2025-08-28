import { BaseQuoteTemplate, QuoteData } from './BaseQuoteTemplate';
import { WallSpecification } from '@/types/quote';
import { SmartQuoteHelper } from './SmartQuoteTemplate';

export class OperableWallTemplate extends BaseQuoteTemplate {
  generateWallTable(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);

    // If no walls exist, don't show the wall table
    if (wallEntries.length === 0) {
      return '';
    }

    return `<div class="wall-specifications-list" style="line-height: 1.15; margin-top: 10px;">
      <table style="border-collapse: collapse; width: 100%;">
        <tbody>
          ${wallEntries.map(([wallName, wall]: [string, WallSpecification]) => {
            const dimensions = this.helpers.formatDimensions(wall.lengthFeet, wall.lengthInches, wall.heightFeet, wall.heightInches, true);
            const wallSystemType = wall.wallSystemType || '';
            const panelCount = wall.panelCount || '';
            const quantity = wall.quantity || '1';
            
            // Check if this is a glass wall
            const isGlassWall = wall.wallSystemType?.toLowerCase().includes('glass');
            
            // Use appropriate configuration field based on wall type
            const panelConfiguration = isGlassWall 
              ? (wall.glasswallPanelConfiguration || '')
              : (wall.panelConfiguration || '');
            
            // Use appropriate panel description based on wall type
            // const panelDescription = isGlassWall
            //   ? `${this.helpers.toWords(panelCount)} (${panelCount}) Glass Panels`
            //   : `${this.helpers.toWords(panelCount)} (${panelCount})`;
            const panelDescription = `${this.helpers.toWords(panelCount)} (${panelCount})`;

            return `
              <tr>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black; border-right: 0.5px solid black; font-weight: bold;">${wallName.replace(/\s+/g, '&nbsp;')}</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${wallSystemType}</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${dimensions}</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${panelDescription}</td>
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
    // Get organization name from quote data, fallback to default if not available
    const organizationName = data.quote_details?.organizationName?.trim() || 
                             data.quote_details?.organization_name?.trim() || 
                             data.quote_details?.company_name?.trim() ||
                             '';
    const walls = data.wall_details?.walls || {};
    const wallCount = Object.keys(walls).length;

    // If no walls exist, don't show the proposal intro
    if (wallCount === 0) {
      return '';
    }

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


    // Create single paragraph without bullets for better editing
    const wallDescriptions = wallEntries.map(([wallName, wall], index) => {
      // Check if this is a glass wall
      const isGlassWall = wall.wallSystemType?.toLowerCase().includes('glass');
      
      const panelCountText = wall.panelCount && parseInt(wall.panelCount) > 1 ? 'Multiple' : 'Single';
      const heightText = this.helpers.formatDimensions('0', '0', wall.heightFeet, wall.heightInches, false).split(' x ')[1];
      
      if (isGlassWall) {
        return SmartQuoteHelper.buildSentence([
          { text: `<strong>${wallName.replace(/\s+/g, '&nbsp;')}</strong> utilizes the Kwik-Wall Glass Wall System` },
          { text: `<strong>Model ${wall.glasswallModel}</strong>`, condition: SmartQuoteHelper.hasValue(wall.glasswallModel) },
          { text: `featuring <strong>${wall.glasswallOperation}</strong> operation`, condition: SmartQuoteHelper.hasValue(wall.glasswallOperation) },
          { text: `configured with <strong>${panelCountText} ${wall.glasswallPanelConfiguration}</strong>`, condition: SmartQuoteHelper.hasValue(wall.glasswallPanelConfiguration) },
          { text: `for use on a <strong>${wall.glasswallTrackType || wall.trackType} Layout</strong>.`, condition: SmartQuoteHelper.hasValue(wall.glasswallTrackType) },
          { text: `The wall is <strong>${heightText}</strong> in height`, condition: SmartQuoteHelper.hasAllValues(wall.heightFeet, wall.heightInches) },
          { text: `Each glass panel features <strong>${wall.glasswallGlassType || 'insulated glass units'}</strong>`, condition: SmartQuoteHelper.hasValue(wall.glasswallGlassType) },
          { text: `with <strong>${wall.glasswallFrameThickness}</strong> thick framing`, condition: SmartQuoteHelper.hasValue(wall.glasswallFrameThickness) },
          { text: `and <strong>${wall.glasswallFrameFinish}</strong> frame finish.`, condition: SmartQuoteHelper.hasValue(wall.glasswallFrameFinish) },
          { text: `The system achieves a minimum STC rating of <strong>${wall.glasswallSTCRating}</strong>`, condition: SmartQuoteHelper.hasValue(wall.glasswallSTCRating) },
          { text: `while maintaining visual transparency. For acoustic performance, glass panels use <strong>${wall.glasswallBottomSeals}</strong> bottom seals`, condition: SmartQuoteHelper.hasValue(wall.glasswallBottomSeals) },
          { text: `and <strong>${wall.glasswallTopSeals}</strong> top seals.`, condition: SmartQuoteHelper.hasValue(wall.glasswallTopSeals) },
          { text: `The system provides closure with <strong>${wall.glasswallFinalClosure}</strong>`, condition: SmartQuoteHelper.hasValue(wall.glasswallFinalClosure) }
        ]);
      } else {
        return SmartQuoteHelper.buildSentence([
          { text: `<strong>${wallName.replace(/\s+/g, '&nbsp;')}</strong> utilizes the Kwik-Wall` },
          { text: `<strong>${wall.series} series</strong>`, condition: SmartQuoteHelper.hasValue(wall.series) },
          { text: `<strong>Model ${wall.model}</strong>`, condition: SmartQuoteHelper.hasValue(wall.model) },
          { text: `configured with <strong>${panelCountText} ${wall.panelConfiguration}</strong>`, condition: SmartQuoteHelper.hasValue(wall.panelConfiguration) },
          { text: `for use on a <strong>${wall.trackType} Layout</strong>.`, condition: SmartQuoteHelper.hasValue(wall.trackType) },
          { text: `The wall is <strong>${heightText}</strong> in height, with panel lengths varying as required`, condition: SmartQuoteHelper.hasAllValues(wall.heightFeet, wall.heightInches) },
          { text: `Each panel features a <strong>${wall.panelDesign}</strong> design`, condition: SmartQuoteHelper.hasValue(wall.panelDesign) },
          { text: `is <strong>${wall.panelThickness}</strong> thick`, condition: SmartQuoteHelper.hasValue(wall.panelThickness) },
          { text: `and constructed with a <strong>${wall.panelSkin}</strong> panel skin.`, condition: SmartQuoteHelper.hasValue(wall.panelSkin) },
          { text: `Panels are finished in <strong>${wall.panelFinishCategory}${wall.panelFinishSpecificItem && wall.panelFinishSpecificItem !== 'Unknown' ? ` - ${wall.panelFinishSpecificItem}` : ''}</strong> (from the manufacturer's standard offerings)`, condition: SmartQuoteHelper.hasValue(wall.panelFinishCategory) },
          { text: `and achieve a minimum STC rating of <strong>${wall.stcRating}</strong>.`, condition: SmartQuoteHelper.hasValue(wall.stcRating) },
          { text: `For acoustic performance, panels use <strong>${wall.verticalSeals}</strong> vertical seals,`, condition: SmartQuoteHelper.hasValue(wall.verticalSeals) },
          { text: `${wall.bottomSeals === "Retractable" ? "<strong>Retractable</strong> operable" : `<strong>${wall.bottomSeals}</strong>`} bottom seals,`, condition: SmartQuoteHelper.hasValue(wall.bottomSeals) },
          { text: `and <strong>${wall.topSeals}</strong> top seals.`, condition: SmartQuoteHelper.hasValue(wall.topSeals) },
          { text: `The lead panel provides closure with a <strong>${wall.initialClosureSystem} Seal</strong>`, condition: SmartQuoteHelper.hasValue(wall.initialClosureSystem) },
          { text: `while the end panel secures the system with a <strong>${wall.endPanelType}</strong>`, condition: SmartQuoteHelper.hasValue(wall.endPanelType) }
        ]);
      }
    }).map((description, index) => `<p class="wall-paragraph" style="margin: 0 0 8px 0; page-break-inside: avoid; orphans: 2; widows: 2;">${description}</p>`).join('');

    return `<div class="panels-section" style="line-height: 1.15;">
      <h2 class="section-header">PANELS:</h2>
      ${wallDescriptions}
    </div>`;
  }

  generateTrackSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    
    // If no walls exist, don't show the track section
    if (wallEntries.length === 0) {
      return '';
    }

    // Filter walls that have track system configured
    const wallsWithTrackSystems = wallEntries.filter(([_, wall]) => {
      const isGlassWall = wall.wallSystemType?.toLowerCase().includes('glass');
      if (isGlassWall) {
        // Glass walls always have a track system, but need panel configuration
        return wall.glasswallPanelConfiguration && wall.glasswallPanelConfiguration.trim() !== '';
      } else {
        // Operable walls need track system configured
        return wall.trackSystem && wall.trackSystem.trim() !== '';
      }
    });

    // If no walls have track systems configured, don't show the section
    if (wallsWithTrackSystems.length === 0) {
      return '';
    }
    
    // Create inline sentence describing each wall's track system
    const wallDescriptions = wallsWithTrackSystems.map(([wallName, wall]) => {
      // Check if this is a glass wall
      const isGlassWall = wall.wallSystemType?.toLowerCase().includes('glass');
      
      if (isGlassWall) {
        // For glass walls, always use the specified track system
        const trackSystem = 'Architectural Grade Extruded Aluminum Alloy 6063-T6';
        const panelConfiguration = wall.glasswallPanelConfiguration;
        return `<strong>${wallName.replace(/\s+/g, '&nbsp;')}</strong> utilizes a <strong>${trackSystem}</strong> Track System (${this.helpers.getMovementOnTrackText(panelConfiguration)} Panels)`;
      } else {
        // For operable walls, use the configured track system
        return `<strong>${wallName.replace(/\s+/g, '&nbsp;')}</strong> utilizes a <strong>${wall.trackSystem}</strong> Track System (${this.helpers.getMovementOnTrackText(wall?.panelConfiguration)} Panels)`;
      }
    }).join(', and ');

    const summary = 
      wallsWithTrackSystems.length > 1 
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
    
    // If no walls exist, don't show the support section
    if (wallEntries.length === 0) {
      return '';
    }
    
    // Filter walls that have structure support configured
    const wallsWithSupport = wallEntries.filter(([_, wall]) => {
      return wall.structureSupport && 
             wall.structureSupport.trim() !== '' && 
             wall.structureSupport.toLowerCase() !== 'none';
    });

    // If no walls have structure support configured, don't show the section
    if (wallsWithSupport.length === 0) {
      return '';
    }

    // Create inline sentence describing each wall's structure support
    const wallDescriptions = wallsWithSupport.map(([wallName, wall]) => {
      return `<strong>${wallName.replace(/\s+/g, '&nbsp;')}</strong> will be hung from <strong>${wall.structureSupport}</strong>`;
    }).join(', and ');
    
    const summary = wallsWithSupport.length > 1
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
    // const walls = data.wall_details?.walls || {};
    // const wallEntries = Object.entries(walls);

    // // If no walls exist, don't show the general section
    // if (wallEntries.length === 0) {
    //   return '';
    // }

    const shopDrawingDelivery = data.delivery_details?.shopDrawingWeeks || '';
    const trackDelivery = data.delivery_details?.trackDeliveryWeeks || '';
    const panelDelivery = data.delivery_details?.panelDeliveryWeeks || '';
    const trackInstallation = data.delivery_details?.trackInstallationDays || '';
    const panelInstallation = data.delivery_details?.panelInstallationDays || '';

    return `
      <div class="general-section" style="line-height: 1.15; margin-bottom: 20px;">
        <h2 class="section-header">GENERAL:</h2>
        Estimated delivery for shop drawings would be <strong>${shopDrawingDelivery} weeks</strong>, after which approval of them, tracks would be delivered in <strong>${trackDelivery} weeks</strong>, & panels delivered in <strong>${panelDelivery} weeks</strong>.
        <br><br>
        Installation of tracks would take approximately <strong>${trackInstallation} working days</strong> and installation of panels would take <strong>${panelInstallation} additional days</strong>.
      </div>
    `;
  }

  getPageBreakStrategy(data: QuoteData): { breakAfterSection: string; minimumHeight: number }[] {
    const wallCount = this.helpers.getWallCount(data);
    const strategy = [];

    // Base strategy for operable walls - allow more natural flowing for panels
    // Removed forced break after panels-section to allow individual paragraphs to flow across pages

    // Check for pass doors section  
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    const firstWall = wallEntries[0]?.[1];
    
    if (firstWall?.passDoorPanels) {
      strategy.push({ breakAfterSection: 'pass-doors-section', minimumHeight: 100 });
    }

    // Check if any walls have pocket doors (new per-wall approach)
    const hasPocketDoors = wallEntries.some(([, wall]) => 
      wall.pocketDoors?.foldType && wall.pocketDoors?.foldType !== 'None'
    );
    if (hasPocketDoors) {
      strategy.push({ breakAfterSection: 'pocket-doors-section', minimumHeight: 150 });
    }

    strategy.push({ breakAfterSection: 'support-section', minimumHeight: 300 });

    return strategy;
  }
}