import { BaseQuoteTemplate, QuoteData } from './BaseQuoteTemplate';
import { WallSpecification, isGlassWall, isOperableWall, isAccordionPartition } from '@/lib/types';
import { AccordionWallSpecification } from '@/lib/types/walls/accordion';
import { SmartQuoteHelper } from './SmartQuoteTemplate';
import { TemplateMarkers } from '@/utils/templateMarkers';

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

            // Wrap all dynamic values with semantic markup
            const wallNameMarked = TemplateMarkers.dynamic({
              path: `wall_details.walls.${wallName}.name`,
              value: wallName,
              format: 'text'
            });

            const wallSystemTypeMarked = wallSystemType ? TemplateMarkers.dynamic({
              path: `wall_details.walls.${wallName}.wallSystemType`,
              value: wallSystemType,
              format: 'text'
            }) : '';

            const dimensionsMarked = dimensions ? TemplateMarkers.dynamic({
              path: `wall_details.walls.${wallName}.dimensions`,
              value: dimensions,
              format: 'text'
            }) : '';

            const panelDescriptionMarked = panelDescription ? TemplateMarkers.dynamic({
              path: `wall_details.walls.${wallName}.panelCount`,
              value: panelDescription,
              format: 'text'
            }) : '';

            const panelConfigurationMarked = panelConfiguration ? TemplateMarkers.dynamic({
              path: `wall_details.walls.${wallName}.panelConfiguration`,
              value: panelConfiguration,
              format: 'text'
            }) : '';

            const quantityMarked = quantity ? TemplateMarkers.dynamic({
              path: `wall_details.walls.${wallName}.quantity`,
              value: quantity,
              format: 'text'
            }) : '';

            return `
              <tr>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black; border-right: 0.5px solid black; font-weight: bold;">${wallNameMarked}</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${wallSystemTypeMarked}</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${dimensionsMarked}</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${panelDescriptionMarked}</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black; border-right: 0.5px solid black;">${panelConfigurationMarked}</td>
                <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${quantityMarked} Each</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  }

  generateProposalIntro(data: QuoteData): string {
    const organizationName = (data as any).organization_name || '';
    const walls = data.wall_details?.walls || {};
    const wallCount = Object.keys(walls).length;

    if (wallCount === 0) {
      return '';
    }

    const systemText = TemplateMarkers.conditional({
      expression: 'wallCount > 1 ? "wall systems" : "wall system"',
      result: wallCount > 1 ? "wall systems" : "wall system",
      dependencies: ['wall_details.walls']
    });

    // Only show intro if we have an organization name
    if (!organizationName) {
      console.warn('[GenericWallTemplate] No organization name available');
      return '<div class="proposal-intro-section" style="line-height: 1.2; margin-top: 12px;"><strong>Specifications as follows:</strong></div>';
    }

    // Wrap organization name with semantic markup
    const organizationNameMarked = TemplateMarkers.dynamic({
      path: 'organization_name',
      value: organizationName,
      format: 'text'
    });

    const proposalHtml = `
      <div class="proposal-intro-section" style="line-height: 1.2; margin-top: 12px;">
        Thank you for considering <strong>${organizationNameMarked}</strong> for this project. As discussed, we are offering a proposal to furnish, deliver, & install, the following ${systemText} as specified below, at the above named project.
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
        // Wrap all dynamic values with semantic markup
        const wallNameMarked = TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.name`,
          value: wallName,
          format: 'text'
        });

        const modelMarked = wall.model ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.model`,
          value: wall.model,
          format: 'text'
        }) : '';

        const panelOperationMarked = wall.panelOperation ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.panelOperation`,
          value: wall.panelOperation,
          format: 'text'
        }) : '';

        const panelConfigurationMarked = wall.panelConfiguration ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.panelConfiguration`,
          value: wall.panelConfiguration,
          format: 'text'
        }) : '';

        const trackTypeMarked = wall.trackType ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.trackType`,
          value: wall.trackType,
          format: 'text'
        }) : '';

        const heightText = this.helpers.formatDimensions('0', '0', String(wall.heightFeet || ''), String(wall.heightInches || ''), false).split(' x ')[1];
        const heightMarked = heightText ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.height`,
          value: heightText,
          format: 'text'
        }) : '';

        const glassTypeMarked = TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.glassType`,
          value: wall.glassType || 'insulated glass units',
          format: 'text'
        });

        const frameThicknessMarked = wall.frameThickness ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.frameThickness`,
          value: wall.frameThickness,
          format: 'text'
        }) : '';

        const frameFinishMarked = wall.frameFinish ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.frameFinish`,
          value: wall.frameFinish,
          format: 'text'
        }) : '';

        const stcRatingMarked = wall.stcRating ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.stcRating`,
          value: wall.stcRating,
          format: 'text'
        }) : '';

        const bottomSealsMarked = wall.bottomSeals ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.bottomSeals`,
          value: wall.bottomSeals,
          format: 'text'
        }) : '';

        const topSealsMarked = wall.topSeals ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.topSeals`,
          value: wall.topSeals,
          format: 'text'
        }) : '';

        const finalClosureMarked = wall.finalClosure ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.finalClosure`,
          value: wall.finalClosure,
          format: 'text'
        }) : '';

        return SmartQuoteHelper.buildSentence([
          { text: `<strong>${wallNameMarked}</strong> utilizes the Kwik-Wall Glass Wall System` },
          { text: `<strong>Model ${modelMarked}</strong>`, condition: SmartQuoteHelper.hasValue(wall.model) },
          { text: `featuring <strong>${panelOperationMarked}</strong> operation`, condition: SmartQuoteHelper.hasValue(wall.panelOperation) },
          { text: `configured with <strong>${TemplateMarkers.conditional({
            expression: 'panelCount > 1 ? "Multiple" : "Single"',
            result: (wall.panelCount && parseInt(wall.panelCount as any || '1') > 1) ? 'Multiple' : 'Single',
            dependencies: [`wall_details.walls.${wallName}.panelCount`]
          })} ${panelConfigurationMarked}</strong>`, condition: SmartQuoteHelper.hasValue(wall.panelConfiguration) },
          { text: `for use on a <strong>${trackTypeMarked} Layout</strong>.`, condition: SmartQuoteHelper.hasValue(wall.trackType) },
          { text: `The wall is <strong>${heightMarked}</strong> in height, with panel lengths varying as required.`, condition: SmartQuoteHelper.hasAllValues(String(wall.heightFeet || ''), String(wall.heightInches || '')) },
          { text: `Each glass panel features <strong>${glassTypeMarked}</strong>`, condition: SmartQuoteHelper.hasValue(wall.glassType) },
          { text: `with <strong>${frameThicknessMarked}</strong> thick framing`, condition: SmartQuoteHelper.hasValue(wall.frameThickness) },
          { text: `and <strong>${frameFinishMarked}</strong> frame finish.`, condition: SmartQuoteHelper.hasValue(wall.frameFinish) },
          { text: `The system achieves a minimum STC rating of <strong>${stcRatingMarked}</strong> will maintaining visual transparency.`, condition: SmartQuoteHelper.hasValue(wall.stcRating) },
          { text: `For acoustic performance, glass panels use ${SmartQuoteHelper.hasValue(wall.bottomSeals) ? `<strong>${bottomSealsMarked}</strong> horizontal bottom seals` : ''}${SmartQuoteHelper.hasValue(wall.bottomSeals) && SmartQuoteHelper.hasValue(wall.topSeals) ? ',' : ''}${!SmartQuoteHelper.hasValue(wall.bottomSeals) && SmartQuoteHelper.hasValue(wall.topSeals) ? '' : ''}`,condition: SmartQuoteHelper.hasValue(wall.bottomSeals) || SmartQuoteHelper.hasValue(wall.topSeals) },
          { text: `${SmartQuoteHelper.hasValue(wall.topSeals) ? `${SmartQuoteHelper.hasValue(wall.bottomSeals) ? 'and ' : ''}<strong>${topSealsMarked}</strong> horizontal top seals.` : ''}`, condition: SmartQuoteHelper.hasValue(wall.topSeals) },
          { text: `The system provides closure with <strong>${finalClosureMarked}</strong>`, condition: SmartQuoteHelper.hasValue(wall.finalClosure) }
        ]);
      } else if (isOperableWall(wall)) {
        // Wrap all dynamic values with semantic markup
        const wallNameMarked = TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.name`,
          value: wallName,
          format: 'text'
        });

        const seriesMarked = wall.series ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.series`,
          value: wall.series,
          format: 'text'
        }) : '';

        const modelMarked = wall.model ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.model`,
          value: wall.model,
          format: 'text'
        }) : '';

        const panelConfigurationMarked = wall.panelConfiguration ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.panelConfiguration`,
          value: wall.panelConfiguration,
          format: 'text'
        }) : '';

        const trackTypeMarked = wall.trackType ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.trackType`,
          value: wall.trackType,
          format: 'text'
        }) : '';

        const heightText = this.helpers.formatDimensions('0', '0', String(wall.heightFeet || ''), String(wall.heightInches || ''), false).split(' x ')[1];
        const heightMarked = heightText ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.height`,
          value: heightText,
          format: 'text'
        }) : '';

        const panelThicknessMarked = wall.panelThickness ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.panelThickness`,
          value: wall.panelThickness,
          format: 'text'
        }) : '';

        const panelSkinMarked = wall.panelSkin ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.panelSkin`,
          value: wall.panelSkin,
          format: 'text'
        }) : '';

        const panelFinishCategoryMarked = wall.panelFinishCategory ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.panelFinishCategory`,
          value: wall.panelFinishCategory,
          format: 'text'
        }) : '';

        const panelFinishSpecificItemMarked = (wall.panelFinishSpecificItem && wall.panelFinishSpecificItem !== 'Unknown') ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.panelFinishSpecificItem`,
          value: wall.panelFinishSpecificItem,
          format: 'text'
        }) : '';

        const stcRatingMarked = wall.stcRating ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.stcRating`,
          value: wall.stcRating,
          format: 'text'
        }) : '';

        const verticalSealsMarked = wall.verticalSeals ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.verticalSeals`,
          value: wall.verticalSeals,
          format: 'text'
        }) : '';

        const bottomSealsMarked = wall.bottomSeals ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.bottomSeals`,
          value: wall.bottomSeals,
          format: 'text'
        }) : '';

        const topSealsMarked = wall.topSeals ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.topSeals`,
          value: wall.topSeals,
          format: 'text'
        }) : '';

        const initialClosureSystemMarked = wall.initialClosureSystem ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.initialClosureSystem`,
          value: wall.initialClosureSystem,
          format: 'text'
        }) : '';

        const finalClosureSystemMarked = wall.finalClosureSystem ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.finalClosureSystem`,
          value: wall.finalClosureSystem,
          format: 'text'
        }) : '';

        return SmartQuoteHelper.buildSentence([
          { text: `<strong>${wallNameMarked}</strong> utilizes the Kwik-Wall` },
          { text: `<strong>${seriesMarked} series</strong>`, condition: SmartQuoteHelper.hasValue(wall.series) },
          { text: `<strong>Model ${modelMarked}</strong>`, condition: SmartQuoteHelper.hasValue(wall.model) },
          { text: `configured with <strong>${TemplateMarkers.conditional({
            expression: 'panelCount > 1 ? "Multiple" : "Single"',
            result: (wall.panelCount && parseInt(wall.panelCount as any || '1') > 1) ? 'Multiple' : 'Single',
            dependencies: [`wall_details.walls.${wallName}.panelCount`]
          })} ${panelConfigurationMarked}</strong>`, condition: SmartQuoteHelper.hasValue(wall.panelConfiguration) },
          { text: `for use on a <strong>${trackTypeMarked} Layout</strong>.`, condition: SmartQuoteHelper.hasValue(wall.trackType) },
          { text: `The wall is <strong>${heightMarked}</strong> in height, with panel lengths varying as required.`, condition: SmartQuoteHelper.hasAllValues(String(wall.heightFeet || ''), String(wall.heightInches || '')) },
          { text: `Each panel is nominally <strong>${panelThicknessMarked}</strong> thick`, condition: SmartQuoteHelper.hasValue(wall.panelThickness) },
          { text: `and constructed with a <strong>${panelSkinMarked}</strong>.`, condition: SmartQuoteHelper.hasValue(wall.panelSkin) },
          { text: `Panels are finished in <strong>${panelFinishCategoryMarked}${wall.panelFinishSpecificItem && wall.panelFinishSpecificItem !== 'Unknown' ? ` - ${panelFinishSpecificItemMarked}` : ''}</strong>${!['Uncovered', 'C.O.M. Material', 'Field Painting by Others', 'Full-Height Marker (Tack) Board'].includes(wall.panelFinishCategory) ? ' (from the manufacturer\'s standard offerings)' : ''}`, condition: SmartQuoteHelper.hasValue(wall.panelFinishCategory) },
          { text: `and achieve a minimum STC rating of <strong>${stcRatingMarked}</strong>.`, condition: SmartQuoteHelper.hasValue(wall.stcRating) },
          { text: `For acoustic performance, panels use <strong>${verticalSealsMarked}</strong> vertical seals${SmartQuoteHelper.hasValue(wall.bottomSeals) || SmartQuoteHelper.hasValue(wall.topSeals) ? ',' : '.'}`, condition: SmartQuoteHelper.hasValue(wall.verticalSeals)},
          { text: `<strong>${bottomSealsMarked}</strong> horizontal bottom seals${SmartQuoteHelper.hasValue(wall.topSeals) ? ',' : '.'}`, condition: SmartQuoteHelper.hasValue(wall.bottomSeals)},
          { text: `and <strong>${topSealsMarked}</strong> horizontal top seals.`, condition: SmartQuoteHelper.hasValue(wall.topSeals)},
          { text: `The initial closure (lead panel) provides closure with a <strong>${initialClosureSystemMarked}</strong>`, condition: SmartQuoteHelper.hasValue(wall.initialClosureSystem) },
          { text: `while the final closure (end panel) secures the system with a <strong>${finalClosureSystemMarked}</strong>`, condition: SmartQuoteHelper.hasValue(wall.finalClosureSystem) }
        ]);
      } else if (isAccordionPartition(wall)) {
        const accordionWall = wall as AccordionWallSpecification;

        // Wrap all dynamic values with semantic markup
        const wallNameMarked = TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.name`,
          value: wallName,
          format: 'text'
        });

        const seriesMarked = accordionWall.series ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.series`,
          value: accordionWall.series,
          format: 'text'
        }) : '';

        const modelMarked = accordionWall.model ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.model`,
          value: accordionWall.model,
          format: 'text'
        }) : '';

        const panelConfigurationMarked = accordionWall.panelConfiguration ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.panelConfiguration`,
          value: accordionWall.panelConfiguration,
          format: 'text'
        }) : '';

        const operationMarked = accordionWall.operation ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.operation`,
          value: accordionWall.operation,
          format: 'text'
        }) : '';

        const heightText = this.helpers.formatDimensions('0', '0', String(accordionWall.heightFeet || ''), String(accordionWall.heightInches || ''), false).split(' x ')[1];
        const heightMarked = heightText ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.height`,
          value: heightText,
          format: 'text'
        }) : '';

        const panelFaceMarked = accordionWall.panelFace ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.panelFace`,
          value: accordionWall.panelFace,
          format: 'text'
        }) : '';

        const stcRatingMarked = accordionWall.stcRating ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.stcRating`,
          value: accordionWall.stcRating,
          format: 'text'
        }) : '';

        const topSealsMarked = accordionWall.topSeals ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.topSeals`,
          value: accordionWall.topSeals,
          format: 'text'
        }) : '';

        const bottomSealsMarked = accordionWall.bottomSeals ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.bottomSeals`,
          value: accordionWall.bottomSeals,
          format: 'text'
        }) : '';

        const trackMountingMarked = accordionWall.trackMounting ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.trackMounting`,
          value: accordionWall.trackMounting,
          format: 'text'
        }) : '';

        const trackSystemMarked = accordionWall.trackSystem ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.trackSystem`,
          value: accordionWall.trackSystem,
          format: 'text'
        }) : '';

        const trackSystemOptionMarked = accordionWall.trackSystemOption ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.trackSystemOption`,
          value: accordionWall.trackSystemOption,
          format: 'text'
        }) : '';

        const finalClosureSystemMarked = accordionWall.finalClosureSystem ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.finalClosureSystem`,
          value: accordionWall.finalClosureSystem,
          format: 'text'
        }) : '';

        const optionsValue = Array.isArray(accordionWall.options) ? accordionWall.options.join(', ') : typeof accordionWall.options === 'string' ? JSON.parse(accordionWall.options || '[]').join(', ') : '';
        const optionsMarked = optionsValue ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.options`,
          value: optionsValue,
          format: 'text'
        }) : '';

        return SmartQuoteHelper.buildSentence([
          { text: `<strong>${wallNameMarked}</strong> utilizes the Kwik-Wall Accordion Partition`},
          { text: `<strong>${seriesMarked}</strong>`, condition: SmartQuoteHelper.hasValue(accordionWall.series) },
          { text: `<strong>Model ${modelMarked}</strong>`, condition: SmartQuoteHelper.hasValue(accordionWall.model) },
          { text: `configured with <strong>${TemplateMarkers.conditional({
            expression: 'panelCount > 1 ? "Multiple" : "Single"',
            result: (accordionWall.panelCount && parseInt(accordionWall.panelCount as any || '1') > 1) ? 'Multiple' : 'Single',
            dependencies: [`wall_details.walls.${wallName}.panelCount`]
          })} ${panelConfigurationMarked}</strong>`, condition: SmartQuoteHelper.hasValue(accordionWall.panelConfiguration) },
          { text: `featuring <strong>${operationMarked}</strong> operation.`, condition: SmartQuoteHelper.hasValue(accordionWall.operation) },
          { text: `The partition is <strong>${heightMarked}</strong> in height, with panels folding as required.`, condition: SmartQuoteHelper.hasAllValues(String(accordionWall.heightFeet || ''), String(accordionWall.heightInches || '')) },
          { text: `Panels faces are covered with <strong>${panelFaceMarked}</strong>`, condition: SmartQuoteHelper.hasValue(accordionWall.panelFace) },
          { text: `and achieve a minimum STC rating of <strong>${stcRatingMarked}</strong>.`, condition: SmartQuoteHelper.hasValue(accordionWall.stcRating) },
          { text: `For acoustic performance, partitions use <strong>${topSealsMarked}</strong> horizontal top seals${SmartQuoteHelper.hasValue(accordionWall.bottomSeals) ? ', and' : '.'}`, condition: SmartQuoteHelper.hasValue(accordionWall.topSeals)},
          { text: `<strong>${bottomSealsMarked}</strong> horizontal bottom seals.`},
          { text: `The system uses <strong>${trackMountingMarked}</strong> track mounting,`, condition: SmartQuoteHelper.hasValue(accordionWall.trackMounting) },
          { text: `<strong>${trackSystemMarked}</strong> track system`, condition: SmartQuoteHelper.hasValue(accordionWall.trackSystem) },
          { text: `with a <strong>${trackSystemOptionMarked}</strong>.`, condition: SmartQuoteHelper.hasValue(accordionWall.trackSystemOption) },
          { text: `The partition is secured with a final closure system by a <strong>${finalClosureSystemMarked}</strong> .`, condition: SmartQuoteHelper.hasValue(accordionWall.finalClosureSystem) },
          { text: `Additional options include: <strong>${optionsMarked}</strong>`, condition: SmartQuoteHelper.hasValue(accordionWall.options) }
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
      // Wrap wall name with semantic markup
      const wallNameMarked = TemplateMarkers.dynamic({
        path: `wall_details.walls.${wallName}.name`,
        value: wallName,
        format: 'text'
      });

      if (isGlassWall(wall)) {
        const trackSystem = 'Architectural Grade Extruded Aluminum Alloy 6063-T6';
        const trackSystemMarked = TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.trackSystem`,
          value: trackSystem,
          format: 'text'
        });
        const panelConfiguration = wall.panelConfiguration;
        return `<strong>${wallNameMarked}</strong> utilizes a <strong>${trackSystemMarked}</strong> Track System (${this.helpers.getMovementOnTrackText(panelConfiguration)} Panels)`;
      } else if (isOperableWall(wall)) {
        const trackSystemMarked = wall.trackSystem ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.trackSystem`,
          value: wall.trackSystem,
          format: 'text'
        }) : '';
        return `<strong>${wallNameMarked}</strong> utilizes a <strong>${trackSystemMarked}</strong> Track System (${this.helpers.getMovementOnTrackText(wall.panelConfiguration)} Panels)`;
      } else if (isAccordionPartition(wall)) {
        const accordionWall = wall as AccordionWallSpecification;
        const trackSystemMarked = accordionWall.trackSystem ? TemplateMarkers.dynamic({
          path: `wall_details.walls.${wallName}.trackSystem`,
          value: accordionWall.trackSystem,
          format: 'text'
        }) : '';
        return `<strong>${wallNameMarked}</strong> utilizes a <strong>${trackSystemMarked}</strong> Track System (${this.helpers.getMovementOnTrackText(accordionWall.panelConfiguration)} Panels)`;
      }
      return '';
    }).join(', and ');

    const summary = TemplateMarkers.conditional({
      expression: 'wallsWithTrackSystems.length > 1 ? "These track systems allow..." : "The track system allows..."',
      result: wallsWithTrackSystems.length > 1
        ? `These track systems allow for the specified movement of the panels, as noted in parentheses, along the overhead track, enabling flexible operation and easy stacking when the walls are not in use.`
        : `The track system allows for the specified movement of the panels, as noted in parentheses, along the overhead track, enabling flexible operation and easy stacking when the wall is not in use.`,
      dependencies: ['wall_details.walls']
    });
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
      // Defensive checks for undefined values
      if (!wallName || !wall) {
        return '';
      }

      const support = wall.structureSupport || '';

      // Wrap dynamic values with semantic markup so they can be updated when form data changes
      const wallNameMarked = TemplateMarkers.dynamic({
        path: `wall_details.walls.${wallName}.name`,
        value: wallName,  // Use natural name, don't convert spaces to &nbsp;
        format: 'text'
      });

      // Only mark support if it exists
      const supportMarked = support ? TemplateMarkers.dynamic({
        path: `wall_details.walls.${wallName}.structureSupport`,
        value: support,
        format: 'text'
      }) : support;

      const text = `<strong>${wallNameMarked}</strong> ${
        hangableSupports.includes(support) ? `will be hung from <strong>${supportMarked}</strong>` : `will be <strong>${supportMarked}</strong>`
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

    // Wrap all delivery times with semantic markup
    const shopDrawingDeliveryMarked = shopDrawingDelivery ? TemplateMarkers.dynamic({
      path: 'delivery_details.shopDrawingWeeks',
      value: shopDrawingDelivery,
      format: 'text'
    }) : '';

    const trackDeliveryMarked = trackDelivery ? TemplateMarkers.dynamic({
      path: 'delivery_details.trackDeliveryWeeks',
      value: trackDelivery,
      format: 'text'
    }) : '';

    const panelDeliveryMarked = panelDelivery ? TemplateMarkers.dynamic({
      path: 'delivery_details.panelDeliveryWeeks',
      value: panelDelivery,
      format: 'text'
    }) : '';

    const trackInstallationMarked = trackInstallation ? TemplateMarkers.dynamic({
      path: 'delivery_details.trackInstallationDays',
      value: trackInstallation,
      format: 'text'
    }) : '';

    const panelInstallationMarked = panelInstallation ? TemplateMarkers.dynamic({
      path: 'delivery_details.panelInstallationDays',
      value: panelInstallation,
      format: 'text'
    }) : '';

    return `
      <div class="general-section" style="line-height: 1.15; margin-bottom: 20px;">
        <p class="section-header-item" style="margin: 1.5em 0 0.5em 0; font-weight: bold; font-size: 12pt;">GENERAL:</p>
        <p>Estimated delivery for shop drawings would be <strong>${shopDrawingDeliveryMarked} weeks</strong>, after which approval of them, tracks would be delivered in <strong>${trackDeliveryMarked} weeks</strong>, & panels delivered in <strong>${panelDeliveryMarked} weeks</strong> after track installation.
        Installation of tracks would take approximately <strong>${trackInstallationMarked} working days</strong> and installation of panels would take <strong>${panelInstallationMarked} additional days</strong>.</p>
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