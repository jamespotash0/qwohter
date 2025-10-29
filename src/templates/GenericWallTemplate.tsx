import { BaseQuoteTemplate, QuoteData } from './BaseQuoteTemplate';
import { WallSpecification, isGlassWall, isOperableWall, isAccordionPartition } from '@/lib/types';
import { AccordionWallSpecification } from '@/lib/types/walls/accordion';
import { SmartQuoteHelper } from './SmartQuoteTemplate';

export class GenericWallTemplate extends BaseQuoteTemplate {
  
  /**
   * Simplifies glass wall panel configuration display
   * Example: "Individual, Multi-Directional Panels" -> "Individual Panels"
   */
  private simplifyGlassWallConfiguration(configuration: string): string {
    if (!configuration) return '';
    
    // Convert complex glass wall configurations to simplified display names
    const simplifications: Record<string, string> = {
      'Individual, Multi-Directional Panels': 'Individual Panels',
      'Individual, Single Carrier Panels': 'Individual Panels',
      'Individual, Fully Automatic Panels': 'Individual Panels',
      'Continuously-Hinged Panels': 'Continuously-Hinged Panels',
      'Hinged-Paired Panels': 'Hinged-Paired Panels',
      'Pivoting Individual Panels': 'Individual Panels',
      'Single & Telescoping Slider Panels': 'Slider Panels'
    };
    
    return simplifications[configuration] || configuration;
  }

  generateWallTable(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);

    if (wallEntries.length === 0) {
      return '';
    }

    return `<div class="wall-specifications-list" style="line-height: 1.15; margin-top: 10px;">
      <table style="border-collapse: collapse; width: 100%;">
        <tbody>
          ${wallEntries.map(([wallName, wall]: [string, WallSpecification]) => {
            const dimensions = this.helpers.formatDimensions(
              String(wall.lengthFeet || ''), 
              String(wall.lengthInches || ''), 
              String(wall.heightFeet || ''), 
              String(wall.heightInches || ''), 
              true
            );
            const wallSystemType = wall.wallSystemType || '';
            const panelCount = wall.panelCount || '';
            const quantity = wall.quantity || '1';
            
            const panelConfiguration = isGlassWall(wall)
              ? this.simplifyGlassWallConfiguration(wall.panelConfiguration || '')
              : isOperableWall(wall) 
                ? (wall.panelConfiguration || '')
                : isAccordionPartition(wall)
                  ? ((wall as AccordionWallSpecification).panelConfiguration || '')
                  : '';
            
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
    let organizationName = data.quote_details?.organizationName?.trim() ||
                           data.quote_details?.organization_name?.trim() ||
                           data.quote_details?.company_name?.trim() ||
                           '';

    // Fallback: Try to get from organization store if not in quote data
    if (!organizationName) {
      try {
        const { useOrganizationStore } = require('@/stores/organization/organizationStore');
        const currentOrg = useOrganizationStore.getState().currentOrganization;
        organizationName = currentOrg?.name || '';
        console.log('[GenericWallTemplate] Fallback to organization store:', organizationName);
      } catch (err) {
        console.warn('[GenericWallTemplate] Could not access organization store:', err);
      }
    }

    const walls = data.wall_details?.walls || {};
    const wallCount = Object.keys(walls).length;

    if (wallCount === 0) {
      return '';
    }

    const systemText = wallCount > 1 ? "wall systems" : "wall system";

    // Only show intro if we have an organization name
    if (!organizationName) {
      console.warn('[GenericWallTemplate] No organization name available');
      return '<div class="proposal-intro-section" style="line-height: 1.2; margin-top: 12px;"><strong>Specifications as follows:</strong></div>';
    }

    const proposalHtml = `
      <div class="proposal-intro-section" style="line-height: 1.2; margin-top: 12px;">
        Thank you for considering <strong>${organizationName}</strong> for this project. As discussed, we are offering a proposal to furnish, deliver, & install, the following ${systemText} as specified below, at the above named project.
        <br><br><strong>Specifications as follows:</strong>
      </div>
    `;
    
    return proposalHtml;
  }

  generatePanelsSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);

    if (wallEntries.length === 0) return '';


    // Create single paragraph without bullets for better editing
    const wallDescriptions = wallEntries.map(([wallName, wall]) => {
      // const panelCountText = wall.panelCount && parseInt(wall.panelCount as any || '1') > 1 ? 'Multiple' : 'Single';
      // const heightText = this.helpers.formatDimensions('0', '0', String(wall.heightFeet || ''), String(wall.heightInches || ''), false).split(' x ')[1];
      
      if (isGlassWall(wall)) {
        return SmartQuoteHelper.buildSentence([
          { text: `<strong>${wallName.replace(/\s+/g, '&nbsp;')}</strong> utilizes the Kwik-Wall Glass Wall System` },
          { text: `<strong>Model ${wall.model}</strong>`, condition: SmartQuoteHelper.hasValue(wall.model) },
          { text: `featuring <strong>${wall.panelOperation}</strong> operation`, condition: SmartQuoteHelper.hasValue(wall.panelOperation) },
          // { text: `configured with <strong>${panelCountText} ${wall.panelConfiguration}</strong>`, condition: SmartQuoteHelper.hasValue(wall.panelConfiguration) },
          { text: `configured with <strong>${wall.panelCount && parseInt(wall.panelCount as any || '1') > 1 ? 'Multiple' : 'Single'} ${wall.panelConfiguration}</strong>`, condition: SmartQuoteHelper.hasValue(wall.panelConfiguration) },
          { text: `for use on a <strong>${wall.trackType} Layout</strong>.`, condition: SmartQuoteHelper.hasValue(wall.trackType) },
          // { text: `The wall is <strong>${heightText}</strong> in height`, condition: SmartQuoteHelper.hasAllValues(String(wall.heightFeet || ''), String(wall.heightInches || '')) },
          { text: `The wall is <strong>${this.helpers.formatDimensions('0', '0', String(wall.heightFeet || ''), String(wall.heightInches || ''), false).split(' x ')[1]}</strong> in height, with panel lengths varying as required.`, condition: SmartQuoteHelper.hasAllValues(String(wall.heightFeet || ''), String(wall.heightInches || '')) },
          { text: `Each glass panel features <strong>${wall.glassType || 'insulated glass units'}</strong>`, condition: SmartQuoteHelper.hasValue(wall.glassType) },
          { text: `with <strong>${wall.frameThickness}</strong> thick framing`, condition: SmartQuoteHelper.hasValue(wall.frameThickness) },
          { text: `and <strong>${wall.frameFinish}</strong> frame finish.`, condition: SmartQuoteHelper.hasValue(wall.frameFinish) },
          { text: `The system achieves a minimum STC rating of <strong>${wall.stcRating}</strong> will maintaining visual transparency.`, condition: SmartQuoteHelper.hasValue(wall.stcRating) },
          // { text: `For acoustic performance, glass panels use <strong>${wall.bottomSeals}</strong> horizontal bottom seals`, condition: SmartQuoteHelper.hasValue(wall.bottomSeals) },
          // { text: `and <strong>${wall.topSeals}</strong> horizontal top seals.`, condition: SmartQuoteHelper.hasValue(wall.topSeals) },
          { text: `For acoustic performance, glass panels use ${SmartQuoteHelper.hasValue(wall.bottomSeals) ? `<strong>${wall.bottomSeals}</strong> horizontal bottom seals` : ''}${SmartQuoteHelper.hasValue(wall.bottomSeals) && SmartQuoteHelper.hasValue(wall.topSeals) ? ',' : ''}${!SmartQuoteHelper.hasValue(wall.bottomSeals) && SmartQuoteHelper.hasValue(wall.topSeals) ? '' : ''}`,condition: SmartQuoteHelper.hasValue(wall.bottomSeals) || SmartQuoteHelper.hasValue(wall.topSeals) },
          { text: `${SmartQuoteHelper.hasValue(wall.topSeals) ? `${SmartQuoteHelper.hasValue(wall.bottomSeals) ? 'and ' : ''}<strong>${wall.topSeals}</strong> horizontal top seals.` : ''}`, condition: SmartQuoteHelper.hasValue(wall.topSeals) },
          { text: `The system provides closure with <strong>${wall.finalClosure}</strong>`, condition: SmartQuoteHelper.hasValue(wall.finalClosure) }
        ]);
      } else if (isOperableWall(wall)) {
        return SmartQuoteHelper.buildSentence([
          { text: `<strong>${wallName.replace(/\s+/g, '&nbsp;')}</strong> utilizes the Kwik-Wall` },
          { text: `<strong>${wall.series} series</strong>`, condition: SmartQuoteHelper.hasValue(wall.series) },
          { text: `<strong>Model ${wall.model}</strong>`, condition: SmartQuoteHelper.hasValue(wall.model) },
          { text: `configured with <strong>${wall.panelCount && parseInt(wall.panelCount as any || '1') > 1 ? 'Multiple' : 'Single'} ${wall.panelConfiguration}</strong>`, condition: SmartQuoteHelper.hasValue(wall.panelConfiguration) },
          { text: `for use on a <strong>${wall.trackType} Layout</strong>.`, condition: SmartQuoteHelper.hasValue(wall.trackType) },
          { text: `The wall is <strong>${this.helpers.formatDimensions('0', '0', String(wall.heightFeet || ''), String(wall.heightInches || ''), false).split(' x ')[1]}</strong> in height, with panel lengths varying as required.`, condition: SmartQuoteHelper.hasAllValues(String(wall.heightFeet || ''), String(wall.heightInches || '')) },
          { text: `Each panel is nominally <strong>${wall.panelThickness}</strong> thick`, condition: SmartQuoteHelper.hasValue(wall.panelThickness) },
          { text: `and constructed with a <strong>${wall.panelSkin}</strong>.`, condition: SmartQuoteHelper.hasValue(wall.panelSkin) },
          { text: `Panels are finished in <strong>${wall.panelFinishCategory}${wall.panelFinishSpecificItem && wall.panelFinishSpecificItem !== 'Unknown' ? ` - ${wall.panelFinishSpecificItem}` : ''}</strong> (from the manufacturer's standard offerings)`, condition: SmartQuoteHelper.hasValue(wall.panelFinishCategory) },
          { text: `and achieve a minimum STC rating of <strong>${wall.stcRating}</strong>.`, condition: SmartQuoteHelper.hasValue(wall.stcRating) },
          { text: `For acoustic performance, panels use <strong>${wall.verticalSeals}</strong> vertical seals${SmartQuoteHelper.hasValue(wall.bottomSeals) || SmartQuoteHelper.hasValue(wall.topSeals) ? ',' : '.'}`, condition: SmartQuoteHelper.hasValue(wall.verticalSeals)},
          { text: `<strong>${wall.bottomSeals}</strong> horizontal bottom seals${SmartQuoteHelper.hasValue(wall.topSeals) ? ',' : '.'}`, condition: SmartQuoteHelper.hasValue(wall.bottomSeals)},
          { text: `and <strong>${wall.topSeals}</strong> horizontal top seals.`, condition: SmartQuoteHelper.hasValue(wall.topSeals)},     
          { text: `The initial closure (lead panel) provides closure with a <strong>${wall.initialClosureSystem}</strong>`, condition: SmartQuoteHelper.hasValue(wall.initialClosureSystem) },
          { text: `while the final closure (end panel) secures the system with a <strong>${wall.finalClosureSystem}</strong>`, condition: SmartQuoteHelper.hasValue(wall.finalClosureSystem) }
        ]);
      } else if (isAccordionPartition(wall)) {
        const accordionWall = wall as AccordionWallSpecification;
        return SmartQuoteHelper.buildSentence([
          { text: `<strong>${wallName.replace(/\s+/g, '&nbsp;')}</strong> utilizes the Kwik-Wall Accordion Partition`},
          { text: `<strong>${accordionWall.series}</strong>`, condition: SmartQuoteHelper.hasValue(accordionWall.series) },
          { text: `<strong>Model ${accordionWall.model}</strong>`, condition: SmartQuoteHelper.hasValue(accordionWall.model) },
          { text: `configured with <strong>${accordionWall.panelCount && parseInt(accordionWall.panelCount as any || '1') > 1 ? 'Multiple' : 'Single'} ${accordionWall.panelConfiguration}</strong>`, condition: SmartQuoteHelper.hasValue(accordionWall.panelConfiguration) },
          { text: `featuring <strong>${accordionWall.operation}</strong> operation.`, condition: SmartQuoteHelper.hasValue(accordionWall.operation) },
          { text: `The partition is <strong>${this.helpers.formatDimensions('0', '0', String(accordionWall.heightFeet || ''), String(accordionWall.heightInches || ''), false).split(' x ')[1]}</strong> in height, with panels folding as required.`, condition: SmartQuoteHelper.hasAllValues(String(accordionWall.heightFeet || ''), String(accordionWall.heightInches || '')) },
          { text: `Panels faces are covered with <strong>${accordionWall.panelFace}</strong>`, condition: SmartQuoteHelper.hasValue(accordionWall.panelFace) },
          { text: `and achieve a minimum STC rating of <strong>${accordionWall.stcRating}</strong>.`, condition: SmartQuoteHelper.hasValue(accordionWall.stcRating) },
          { text: `For acoustic performance, partitions use <strong>${accordionWall.topSeals}</strong> horizontal top seals${SmartQuoteHelper.hasValue(accordionWall.bottomSeals) ? ', and' : '.'}`, condition: SmartQuoteHelper.hasValue(accordionWall.topSeals)},
          { text: `<strong>${accordionWall.bottomSeals}</strong> horizontal bottom seals.`},
          { text: `The system uses <strong>${accordionWall.trackMounting}</strong> track mounting,`, condition: SmartQuoteHelper.hasValue(accordionWall.trackMounting) },
          { text: `<strong>${accordionWall.trackSystem}</strong> track system`, condition: SmartQuoteHelper.hasValue(accordionWall.trackSystem) },
          { text: `with a <strong>${accordionWall.trackSystemOption}</strong>.`, condition: SmartQuoteHelper.hasValue(accordionWall.trackSystemOption) },
          { text: `The partition is secured with a final closure system by a <strong>${accordionWall.finalClosureSystem}</strong> .`, condition: SmartQuoteHelper.hasValue(accordionWall.finalClosureSystem) },
          { text: `Additional options include: <strong>${Array.isArray(accordionWall.options) ? accordionWall.options.join(', ') : typeof accordionWall.options === 'string' ? JSON.parse(accordionWall.options || '[]').join(', ') : ''}</strong>`, condition: SmartQuoteHelper.hasValue(accordionWall.options) }
        ]);
      } else {
        return `<strong>${wallName.replace(/\s+/g, '&nbsp;')}</strong> - Unsupported wall type`;
      }
    }).map((description) => `<p class="wall-paragraph" style="margin: 0 0 8px 0; page-break-inside: avoid; orphans: 2; widows: 2;">${description}</p>`).join('');

    return `<div class="panels-section" style="line-height: 1.15;">
      <p class="wall-paragraph section-header-item" style="margin: 1.5em 0 0.5em 0; page-break-inside: avoid; orphans: 2; widows: 2; font-weight: bold; font-size: 12pt;">PANELS:</p>
      ${wallDescriptions}
    </div>`;
  }

  generateTrackSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    
    if (wallEntries.length === 0) {
      return '';
    }

    const wallsWithTrackSystems = wallEntries.filter(([_, wall]) => {
      if (isGlassWall(wall)) {
        return wall.panelConfiguration && wall.panelConfiguration.trim() !== '';
      } else if (isOperableWall(wall)) {
        return wall.trackSystem && wall.trackSystem.trim() !== '';
      } else if (isAccordionPartition(wall)) {
        const accordionWall = wall as AccordionWallSpecification;
        return accordionWall.trackSystem && accordionWall.trackSystem.trim() !== '';
      }
      return false;
    });

    if (wallsWithTrackSystems.length === 0) {
      return '';
    }
    
    const wallDescriptions = wallsWithTrackSystems.map(([wallName, wall]) => {
      if (isGlassWall(wall)) {
        const trackSystem = 'Architectural Grade Extruded Aluminum Alloy 6063-T6';
        const panelConfiguration = wall.panelConfiguration;
        return `<strong>${wallName.replace(/\s+/g, '&nbsp;')}</strong> utilizes a <strong>${trackSystem}</strong> Track System (${this.helpers.getMovementOnTrackText(panelConfiguration)} Panels)`;
      } else if (isOperableWall(wall)) {
        return `<strong>${wallName.replace(/\s+/g, '&nbsp;')}</strong> utilizes a <strong>${wall.trackSystem}</strong> Track System (${this.helpers.getMovementOnTrackText(wall.panelConfiguration)} Panels)`;
      } else if (isAccordionPartition(wall)) {
        const accordionWall = wall as AccordionWallSpecification;
        return `<strong>${wallName.replace(/\s+/g, '&nbsp;')}</strong> utilizes a <strong>${accordionWall.trackSystem}</strong> Track System (${this.helpers.getMovementOnTrackText(accordionWall.panelConfiguration)} Panels)`;
      }
      return '';
    }).join(', and ');

    const summary = 
      wallsWithTrackSystems.length > 1 
        ? `These track systems allow for the specified movement of the panels, as noted in parentheses, along the overhead track, enabling flexible operation and easy stacking when the walls are not in use.`
        : `The track system allows for the specified movement of the panels, as noted in parentheses, along the overhead track, enabling flexible operation and easy stacking when the wall is not in use.`
    return `
      <div class="track-section" style="line-height: 1.15; margin-top: 0px;">
        <p class="section-header-item" style="margin: 1.5em 0 0.5em 0; font-weight: bold; font-size: 12pt;">TRACK:</p>
        <p>
          ${wallDescriptions}. ${summary}
        </p>
      </div>
    `;
  }

  generateSupportSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    
    if (wallEntries.length === 0) {
      return '';
    }
    
    const wallsWithSupport = wallEntries.filter(([_, wall]) => {
      return wall.structureSupport && 
             wall.structureSupport.trim() !== '' && 
             wall.structureSupport.toLowerCase() !== 'none';
    });

    if (wallsWithSupport.length === 0) {
      return '';
    }

    const hangableSupports = ["Pre-Drilled Steel Beam", "Existing Steel Beam", "Unispan Truss System"];

    const wallDescriptions = wallsWithSupport.map(([wallName, wall], index, arr) => {
      const support = wall.structureSupport || '';
      const text = `<strong>${wallName.replace(/\s+/g, '&nbsp;')}</strong> ${
        hangableSupports.includes(support) ? `will be hung from <strong>${support}</strong>` : `will be <strong>${support}</strong>`
      }`;
     // Decide punctuation
      if (index === arr.length - 1 && arr.length > 1) return `and ${text}`;
      if (index < arr.length - 1) return `${text},`;
      return text;
    }).join(' ');
    
    const summary = wallsWithSupport.length > 1
      ? `to manufacturer's specs, as supplied by others. Soffits, if required, as supplied by others.`
      : `to manufacturer's specs, as supplied by others. Soffits, if required, as supplied by others.`;
    
    return `
      <div class="support-section" style="line-height: 1.15;">
        <p class="section-header-item" style="margin: 1.5em 0 0.5em 0; font-weight: bold; font-size: 12pt;">SUPPORT STRUCTURE (HEADER):</p>
        <p>
          ${wallDescriptions} ${summary}
        </p>
      </div>
    `;
  }
 
  generateGeneralSection(data: QuoteData): string {
    const shopDrawingDelivery = data.delivery_details?.shopDrawingWeeks || '';
    const trackDelivery = data.delivery_details?.trackDeliveryWeeks || '';
    const panelDelivery = data.delivery_details?.panelDeliveryWeeks || '';
    const trackInstallation = data.delivery_details?.trackInstallationDays || '';
    const panelInstallation = data.delivery_details?.panelInstallationDays || '';

    return `
      <div class="general-section" style="line-height: 1.15; margin-bottom: 20px;">
        <p class="section-header-item" style="margin: 1.5em 0 0.5em 0; font-weight: bold; font-size: 12pt;">GENERAL:</p>
        <p>Estimated delivery for shop drawings would be <strong>${shopDrawingDelivery} weeks</strong>, after which approval of them, tracks would be delivered in <strong>${trackDelivery} weeks</strong>, & panels delivered in <strong>${panelDelivery} weeks</strong> after track installation.
        Installation of tracks would take approximately <strong>${trackInstallation} working days</strong> and installation of panels would take <strong>${panelInstallation} additional days</strong>.</p>
      </div>
    `;
  }

  getPageBreakStrategy(data: QuoteData): { breakAfterSection: string; minimumHeight: number }[] {
    const strategy = [];

    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    const firstWall = wallEntries[0]?.[1];
    
    if (firstWall && isOperableWall(firstWall) && firstWall.passDoorPanels) {
      strategy.push({ breakAfterSection: 'pass-doors-section', minimumHeight: 100 });
    }

    const hasPocketDoors = wallEntries.some(([, wall]) => 
      wall.pocketDoors?.foldType && wall.pocketDoors?.foldType !== 'None' ||
      (isAccordionPartition(wall) && (wall as AccordionWallSpecification).pocketDoors?.foldType && (wall as AccordionWallSpecification).pocketDoors?.foldType !== 'None')
    );
    if (hasPocketDoors) {
      strategy.push({ breakAfterSection: 'pocket-doors-section', minimumHeight: 150 });
    }

    strategy.push({ breakAfterSection: 'support-section', minimumHeight: 300 });

    return strategy;
  }
}