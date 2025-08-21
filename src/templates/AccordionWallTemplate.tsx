// import { BaseQuoteTemplate, QuoteData } from './BaseQuoteTemplate';
// import { WallSpecification } from '@/types/quote';

// export class AccordionWallTemplate extends BaseQuoteTemplate {
//   generateWallTable(data: QuoteData): string {
//     const walls = data.wall_details?.walls || {};
//     const wallEntries = Object.entries(walls);

//     return `<div class="wall-specifications-list" style="line-height: 1.15; margin-top: 10px;">
//       <table style="border-collapse: collapse; width: 100%;">
//         <tbody>
//           ${wallEntries.map(([wallName, wall]: [string, WallSpecification]) => {
//             const dimensions = this.helpers.formatDimensions(wall.lengthFeet, wall.lengthInches, wall.heightFeet, wall.heightInches, true);
//             const panelCount = wall.panelCount || '';
//             const panelConfiguration = wall.panelConfiguration || '';
//             const quantity = wall.quantity || '1';

//             return `
//               <tr>
//                 <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black; border-right: 0.5px solid black; font-weight: bold;">${wallName}</td>
//                 <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${dimensions}</td>
//                 <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${this.helpers.toWords(panelCount)} (${panelCount})</td>
//                 <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black; border-right: 0.5px solid black;">${panelConfiguration}</td>
//                 <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${quantity} Each</td>
//               </tr>
//             `;
//           }).join('')}
//         </tbody>
//       </table>
//     </div>`;
//   }

//   generateProposalIntro(data: QuoteData): string {
//     const wallCount = this.helpers.getWallCount(data);
//     const wallSystemType = this.helpers.getWallSystemType(data);
//     // Get organization name from quote data, fallback to default if not available
//     const organizationName = data.quote_details?.organizationName || 
//                              data.quote_details?.organization_name || 
//                              data.quote_details?.company_name ||
//                              'Contemporary Wall Systems';

//     return `<div class="proposal-intro" style="line-height: 1.2; margin-top: 12px;">
//       Thank you for considering <strong>${organizationName}</strong> for this project. As discussed, we are offering a proposal to furnish, deliver, and install, as noted, <strong>${wallCount === 1 ? 'ONE (1)' : wallCount === 2 ? 'TWO (2)' : wallCount === 3 ? 'THREE (3)' : wallCount === 4 ? 'FOUR (4)' : `${wallCount}`} ${wallSystemType}</strong> as specified below, at the above named project.
//       <br><br><strong>Specifications as follows:</strong>
//     </div>`;
//   }

//   generatePanelsSection(data: QuoteData): string {
//     const walls = data.wall_details?.walls || {};
//     const wallEntries = Object.entries(walls);
//     const firstWall = wallEntries[0]?.[1];

//     if (!firstWall) return '';

//     return `<div class="panels-section" style="line-height: 1.15;">
//       <h2 class="section-header">PANELS:</h2>
//       <p>
//         This wall system utilizes the Kwik-Wall <strong>${firstWall.series || ''} Series Model ${firstWall.model || ''}</strong> configured with <strong>${firstWall.panelConfiguration || ''}</strong> designed for use with a <strong>${firstWall.trackType || ''} Layout</strong>, and includes ${this.helpers.isGLModel(firstWall.model) ? 'GL insulated' : 'non-GL insulated'} for enhanced acoustic performance.
//         <br><br>The wall(s) consists of <strong>${this.helpers.getPanelConfigurationText(firstWall.panelCount)} ${firstWall.panelConfiguration || ''}</strong>, finished in an <strong>${firstWall.panelFinishCategory || ''}</strong> (as selected from the manufacturer's standard offerings). The wall stands <strong>${this.helpers.formatDimensions('0', '0', firstWall.heightFeet, firstWall.heightInches, false).split(' x ')[1]}</strong> in height, with panel lengths varying as needed. Each panel features a <strong>${firstWall.panelDesign || ''} </strong> design and is nominally <strong>${firstWall.panelThickness || ''}"</strong> thick, constructed with a 1/2" gypsum board laminated to a <strong>${firstWall.panelSkin}</strong>. The panels will be suspended from a <strong>${firstWall.trackSystem || ''}</strong> overhead track system, allowing for smooth and efficient movement. Acoustic performance is enhanced through <strong>${firstWall.verticalSeals || ''}</strong> vertical seals that create a continuous interlock, <strong>${firstWall.bottomSeals || ''}</strong> operable bottom seals, and <strong>${firstWall.topSeals}</strong> top seals. Adjustable seals are set at the time of installation and operable/retractable seals are user-adjustable for virtually effortless movement. The lead panel provides the initial closure using a <strong>${firstWall.initialClosureSystem || ''}</strong>, and the end panel uses a <strong>${firstWall.endPanelType || ''}</strong>, securing the system when fully deployed.
//       </p>
//     </div>`;
//   }

//   generateTrackSection(data: QuoteData): string {
//     const walls = data.wall_details?.walls || {};
//     const wallEntries = Object.entries(walls);
    
//     // Create inline sentence describing each wall's track system
//     const wallDescriptions = wallEntries.map(([wallName, wall]) => {
//       return `<strong>${wallName}</strong> utilizes <strong>${wall.trackSystem || ""} Track System</strong> (${this.helpers.getMovementOnTrackText(wall?.panelConfiguration)} Panels)`;
//     }).join(', and ');

//     const summary = 
//       wallEntries.length > 1 
//         ? `These track systems allow for the specified movement of the panels along the overhead track, enabling flexible operation and easy stacking when the walls are not in use.`
//         : `The track system allows for the specified movement of the panels along the overhead track, enabling flexible operation and easy stacking when the wall is not in use.`
    
//     return `<div class="track-section" style="line-height: 1.15; margin-top: 0px;">
//       <h2 class="section-header">TRACK:</h2>
//       <p>
//         ${wallDescriptions}. ${summary}
//       </p>
//     </div>`;
//   }

//   generateSupportSection(data: QuoteData): string {
//     const walls = data.wall_details?.walls || {};
//     const wallEntries = Object.entries(walls);
    
//     // Create inline sentence describing each wall's structure support
//     const wallDescriptions = wallEntries.map(([wallName, wall]) => {
//       // Check for structure support - handle different possible values
//       let structureSupport = wall.structureSupport;
      
//       // If not set or is 'None', try fallback to global structure support
//       if (!structureSupport || structureSupport === 'None' || structureSupport.trim() === '') {
//         structureSupport = data.support_structure?.mountingTrack || 'None Required';
//       }
      
//       return `<strong>${wallName}</strong> will be hung from <strong>${structureSupport}</strong>`;
//     }).join(', and ');
    
//     return `<div class="support-section" style="line-height: 1.15;">
//       <h2 class="section-header">SUPPORT STRUCTURE (HEADER):</h2>
//       <p>
//         ${wallDescriptions} above, to manufacturer's specs, as supplied by others. Soffits, if required, as supplied by others.
//       </p>
//     </div>`;
//   }

//   generateGeneralSection(data: QuoteData): string {
//     const walls = data.wall_details?.walls || {};
//     const wallEntries = Object.entries(walls);
//     const firstWall = wallEntries[0]?.[1];
    
//     const shopDrawingDelivery = data.delivery_details?.shopDrawingWeeks || '';
//     const trackDelivery = data.delivery_details?.trackDeliveryWeeks || '';
//     const panelDelivery = data.delivery_details?.panelDeliveryWeeks || '';
//     const trackInstallation = data.delivery_details?.trackInstallationDays || '';
//     const panelInstallation = data.delivery_details?.panelInstallationDays || '';

//     return `<div class="general-section" style="line-height: 1.15; margin-bottom: 20px;">
//       <h2 class="section-header">GENERAL:</h2>
//       Each door will carry a minimum <strong>STC of ${firstWall?.stcRating || ''}</strong>${firstWall?.stcRating === '56' ? ' <strong>(Highest Available)</strong>' : ''}. Estimated delivery for shop drawings would be <strong>${shopDrawingDelivery} weeks</strong>, after which approval of them, delivery of tracks would be <strong>${trackDelivery} weeks</strong>, & panels <strong>${panelDelivery} weeks</strong>. Installation of tracks would take approximately <strong>${trackInstallation} working days</strong>, panels installation would take <strong>${panelInstallation} additional days</strong>.
//     </div>`;
//   }

//   getPageBreakStrategy(data: QuoteData): { breakAfterSection: string; minimumHeight: number }[] {
//     const wallCount = this.helpers.getWallCount(data);
//     const strategy = [];

//     // Base strategy for operable walls
//     if (wallCount >= 3) {
//       strategy.push({ breakAfterSection: 'panels-section', minimumHeight: 200 });
//     }

//     // Check for pass doors section  
//     const walls = data.wall_details?.walls || {};
//     const wallEntries = Object.entries(walls);
//     const firstWall = wallEntries[0]?.[1];
    
//     if (firstWall?.passDoorPanels) {
//       strategy.push({ breakAfterSection: 'panel-doors-section', minimumHeight: 100 });
//     }

//     if (data.pocket_doors?.foldType) {
//       strategy.push({ breakAfterSection: 'pocket-doors-section', minimumHeight: 150 });
//     }

//     strategy.push({ breakAfterSection: 'support-section', minimumHeight: 300 });

//     return strategy;
//   }
// }