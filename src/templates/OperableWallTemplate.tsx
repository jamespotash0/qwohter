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
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black; border-right: 0.5px solid black; font-weight: bold;">${wallName}</td><td>
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
    // const wallCount = this.helpers.getWallCount(data);
    // const wallSystemType = this.helpers.getWallSystemType(data);

    // return `<div class="proposal-intro" style="line-height: 1.2; margin-top: 12px;">
    //   Thank you for considering Contemporary Wall Systems for this project. As discussed, we are offering a proposal to furnish, deliver, and install, as noted, <strong>${wallCount === 1 ? 'ONE (1)' : wallCount === 2 ? 'TWO (2)' : wallCount === 3 ? 'THREE (3)' : wallCount === 4 ? 'FOUR (4)' : `${wallCount}`} ${wallSystemType}</strong> as specified below, at the above named project.
    //   <br><br><strong>Specifications as follows:</strong>
    // </div>`;
  // }

  generatePanelsSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    const firstWall = wallEntries[0]?.[1];

    if (!firstWall) return '';

    // Build smart sentences that skip empty parts
    const systemDescription = SmartQuoteHelper.buildSentence([
      { text: "This wall system utilizes the Kwik-Wall" },
      { text: `<strong>${firstWall.series} Series Model ${firstWall.model}</strong>`, condition: SmartQuoteHelper.hasAllValues(firstWall.series, firstWall.model) },
      { text: `configured with <strong>${firstWall.panelConfiguration}</strong>`, condition: SmartQuoteHelper.hasValue(firstWall.panelConfiguration) },
      { text: `designed for use with a <strong>${firstWall.trackType} Layout</strong>`, condition: SmartQuoteHelper.hasValue(firstWall.trackType) },
      { text: `and includes ${this.helpers.isGLModel(firstWall.model) ? 'GL insulated' : 'non-GL insulated'} for enhanced acoustic performance` }
    ]);

    const wallDescription = SmartQuoteHelper.buildSentence([
      { text: "The wall(s) consists of" },
      { text: `<strong>${this.helpers.getPanelConfigurationText(firstWall.panelCount)} ${firstWall.panelConfiguration}</strong>`, condition: SmartQuoteHelper.hasAllValues(firstWall.panelCount, firstWall.panelConfiguration) },
      { text: `finished in an <strong>${firstWall.panelFinishCategory}</strong>`, condition: SmartQuoteHelper.hasValue(firstWall.panelFinishCategory) },
      { text: "(as selected from the manufacturer's standard offerings)", condition: SmartQuoteHelper.hasValue(firstWall.panelFinishCategory) }
    ]);

    const dimensionsText = SmartQuoteHelper.conditionalText(
      SmartQuoteHelper.hasAllValues(firstWall.heightFeet, firstWall.heightInches),
      `The wall stands <strong>${this.helpers.formatDimensions('0', '0', firstWall.heightFeet, firstWall.heightInches, false).split(' x ')[1]}</strong> in height, with panel lengths varying as needed.`
    );

    const panelConstruction = SmartQuoteHelper.buildSentence([
      { text: "Each panel features" },
      { text: `a <strong>${firstWall.panelDesign}</strong> design`, condition: SmartQuoteHelper.hasValue(firstWall.panelDesign) },
      { text: `and is nominally <strong>${firstWall.panelThickness}"</strong> thick`, condition: SmartQuoteHelper.hasValue(firstWall.panelThickness) },
      { text: `constructed with a 1/2" gypsum board laminated to a <strong>${firstWall.panelSkin}</strong>`, condition: SmartQuoteHelper.hasValue(firstWall.panelSkin) }
    ]);

    const suspensionText = SmartQuoteHelper.conditionalText(
      SmartQuoteHelper.hasValue(firstWall.trackSystem),
      `The panels will be suspended from a <strong>${firstWall.trackSystem}</strong> overhead track system, allowing for smooth and efficient movement.`
    );

    const acousticPerformance = SmartQuoteHelper.buildSentence([
      { text: "Acoustic performance is enhanced through" },
      { text: `<strong>${firstWall.verticalSeals}</strong> vertical seals that create a continuous interlock`, condition: SmartQuoteHelper.hasValue(firstWall.verticalSeals) },
      { text: `<strong>${firstWall.bottomSeals}</strong> operable bottom seals`, condition: SmartQuoteHelper.hasValue(firstWall.bottomSeals) },
      { text: `and <strong>${firstWall.topSeals}</strong> top seals`, condition: SmartQuoteHelper.hasValue(firstWall.topSeals) }
    ]);

    const sealAdjustmentText = SmartQuoteHelper.conditionalText(
      SmartQuoteHelper.hasValue(firstWall.bottomSeals) || SmartQuoteHelper.hasValue(firstWall.topSeals),
      "Adjustable seals are set at the time of installation and operable/retractable seals are user-adjustable for virtually effortless movement."
    );

    const closureText = SmartQuoteHelper.buildSentence([
      { text: "The lead panel provides the initial closure" },
      { text: `using a <strong>${firstWall.initialClosureSystem}</strong>`, condition: SmartQuoteHelper.hasValue(firstWall.initialClosureSystem) },
      { text: `and the end panel uses a <strong>${firstWall.endPanelType}</strong>`, condition: SmartQuoteHelper.hasValue(firstWall.endPanelType) },
      { text: "securing the system when fully deployed" }
    ]);

    const panelsSectionContent = [
      systemDescription,
      wallDescription,
      dimensionsText,
      panelConstruction,
      suspensionText,
      acousticPerformance,
      sealAdjustmentText,
      closureText
    ].filter(text => text.trim() !== '').join(' '); // Join with space for proper sentence spacing

    return `<div class="panels-section" style="line-height: 1.15;">
      <h2 class="section-header">PANELS:</h2>
      <p>${panelsSectionContent}</p>
    </div>`;
  }

  generateTrackSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    const trackParagraphs = wallEntries.map(([wallName, waller]) => {
      return `<strong>${wallName}</strong>: ${waller.trackSystem || ""} Track System (${this.helpers.getMovementOnTrackText(waller?.panelConfiguration)} Panels)`;
    });

    const summary = 
      wallEntries.length > 1 
        ? `These track systems allow for the specified movement of the panels along the overhead track, enabling flexible operation and easy stacking when the walls are not in use.`
        : `The track system allows for the specified movement of the panels along the overhead track, enabling flexible operation and easy stacking when the wall is not in use.`
    return `
      <div class="track-section" style="line-height: 1.15; margin-top: 0px;">
        <h2 class="section-header">TRACK:</h2>
        <p>
          ${trackParagraphs.join("<br>")}<br><br>
          ${summary}
        </p>
      </div>
    `;
  }

  generateSupportSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    
    // Display structure support for each wall individually (per-wall configuration)
    const supportParagraphs = wallEntries.map(([wallName, wall]) => {
      // Check for structure support - handle different possible values
      let structureSupport = wall.structureSupport;
      
      // If not set or is 'None', try fallback to global structure support
      if (!structureSupport || structureSupport === 'None' || structureSupport.trim() === '') {
        structureSupport = data.support_structure?.mountingTrack || 'None Required';
      }
      
      return `<strong>${wallName}</strong>: ${structureSupport}`;
    });
    
    const summary = wallEntries.length > 1
      ? `These doors will be hung from the above mounting structures to manufacturer's specs, as supplied by others. Soffits, if required, as supplied by others.`
      : `The doors will be hung from the above mounting structure to manufacturer's specs, as supplied by others. Soffits, if required, as supplied by others.`;
    
    return `
      <div class="support-section" style="line-height: 1.15;">
        <h2 class="section-header">SUPPORT STRUCTURE (HEADER):</h2>
        <p>
          ${supportParagraphs.join("<br>")}<br><br>
          ${summary}
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
        Estimated delivery for shop drawings would be <strong>${shopDrawingDelivery} weeks</strong>, after which approval of them, delivery of tracks would be <strong>${trackDelivery} weeks</strong>, & panels <strong>${panelDelivery} weeks</strong>. Installation of tracks would take approximately <strong>${trackInstallation} working days</strong>, panels installation would take <strong>${panelInstallation} additional days</strong>.
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

    // Check for panel doors section  
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    const firstWall = wallEntries[0]?.[1];
    
    if (firstWall?.passDoorPanels) {
      strategy.push({ breakAfterSection: 'panel-doors-section', minimumHeight: 100 });
    }

    if (data.pocket_doors?.foldType) {
      strategy.push({ breakAfterSection: 'pocket-doors-section', minimumHeight: 150 });
    }

    strategy.push({ breakAfterSection: 'support-section', minimumHeight: 300 });

    return strategy;
  }
}