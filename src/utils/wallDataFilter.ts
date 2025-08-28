import { WallSpecification } from '@/types/quote';

// Operable Wall fields
const operableWallFields: (keyof WallSpecification)[] = [
  'wallSystemType',
  'lengthFeet',
  'lengthInches', 
  'heightFeet',
  'heightInches',
  'quantity',
  'panelConfiguration',
  'panelCount',
  'series',
  'model',
  'panelThickness',
  'panelDesign',
  'panelSkin',
  'stcRating',
  'passDoorPanels',
  'passDoorQuantity',
  'panelFinishCategory',
  'panelFinishSpecificItem',
  'verticalSeals',
  'bottomSeals',
  'topSeals',
  'initialClosureSystem',
  'endPanelType',
  'trackType',
  'trackSystem',
  'structureSupport',
  'pocketDoors'
];

// Glass Wall fields  
const glassWallFields: (keyof WallSpecification)[] = [
  'wallSystemType',
  'lengthFeet',
  'lengthInches',
  'heightFeet', 
  'heightInches',
  'quantity',
  'panelCount',
  'glasswallModel',
  'glasswallOperation',
  'glasswallPanelConfiguration',
  'glasswallPanelFace',
  'glasswallFrameFinish',
  'glasswallGlassType',
  'glasswallSTCRating',
  'glasswallPartitionSupport',
  'glasswallPassDoorType',
  'glasswallPassDoorOption',
  'glasswallHingeType',
  'glasswallFrameThickness',
  'glasswallTrackType',
  'glasswallTrackFinish',
  'glasswallFinalClosure',
  'glasswallBottomSeals',
  'glasswallTopSeals',
  'structureSupport',
  'pocketDoors'
];

// Accordion Wall fields
const accordionWallFields: (keyof WallSpecification)[] = [
  'wallSystemType',
  'lengthFeet',
  'lengthInches',
  'heightFeet',
  'heightInches', 
  'quantity',
  'panelConfiguration',
  'panelCount',
  'series',
  'model',
  'panelThickness',
  'panelDesign',
  'panelSkin',
  'stcRating',
  'passDoorPanels',
  'passDoorQuantity',
  'panelFinishCategory',
  'panelFinishSpecificItem',
  'verticalSeals',
  'bottomSeals',
  'topSeals',
  'initialClosureSystem',
  'endPanelType',
  'trackType',
  'trackSystem',
  'structureSupport',
  'pocketDoors'
];

export function filterWallDataByType(wallSpec: WallSpecification): WallSpecification {
  const wallSystemType = wallSpec.wallSystemType?.toLowerCase() || '';
  
  let relevantFields: (keyof WallSpecification)[];
  
  if (wallSystemType.includes('glass')) {
    relevantFields = glassWallFields;
  } else if (wallSystemType.includes('accordion')) {
    relevantFields = accordionWallFields;
  } else {
    relevantFields = operableWallFields;
  }
  
  // Create filtered object with only relevant fields
  const filteredSpec: Partial<WallSpecification> = {};
  
  relevantFields.forEach(field => {
    if (wallSpec[field] !== undefined) {
      (filteredSpec as any)[field] = wallSpec[field];
    }
  });
  
  return filteredSpec as WallSpecification;
}

export function filterWallDetailsForSave(wallDetails: any): any {
  if (!wallDetails?.walls) return wallDetails;
  
  const filteredWalls: { [wallName: string]: WallSpecification } = {};
  
  Object.entries(wallDetails.walls).forEach(([wallName, wallSpec]) => {
    filteredWalls[wallName] = filterWallDataByType(wallSpec as WallSpecification);
  });
  
  return {
    ...wallDetails,
    walls: filteredWalls
  };
}