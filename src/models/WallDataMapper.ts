// Wall Data Mapper
// Extracted from WallSpecificationForm.tsx for better maintainability and testability

import { WallSpecification, GlassWallConfiguration } from '@/types/quote';
// import { WallSpecification, GlassWallConfiguration, BaseWallSpecification } from '@/lib/types/walls';
/**
 * Maps GlassWallConfiguration (form format) to WallSpecification (database format)
 * 
 * This handles the field name differences between the form and database:
 * - Form uses: model, configurationType, operationType, etc.
 * - DB uses: glasswallModel, glasswallPanelConfiguration, glasswallOperation, etc.
 */
export function mapGlassWallConfigToWallSpec(config: GlassWallConfiguration): Partial<WallSpecification> {
  return {
    glasswallModel: config.model,
    glasswallPanelConfiguration: config.configurationType,
    glasswallOperation: config.operationType,
    glasswallPanelFace: config.panelFace,
    glasswallFrameFinish: config.frameFinish,
    glasswallGlassType: config.glassType,
    glasswallSTCRating: config.stc_rating,
    glasswallPartitionSupport: config.partitionSupport,
    glasswallPassDoorType: config.passDoorType,
    glasswallPassDoorOption: config.passDoorOption,
    glasswallHingeType: config.hingeType,
    glasswallFrameThickness: config.frameThickness,
    glasswallTrackType: config.trackType,
    glasswallTrackFinish: config.trackFinish,
    glasswallFinalClosure: config.finalClosure,
    glasswallBottomSeals: config.bottomSeals,
    glasswallTopSeals: config.topSeals,
  };
}

/**
 * Maps WallSpecification (database format) to GlassWallConfiguration (form format)
 * 
 * This reverses the mapping above, converting database fields back to form fields
 */
export function mapWallSpecToGlassWallConfig(wall: WallSpecification): Partial<GlassWallConfiguration> {
  return {
    model: wall.glasswallModel || "",
    configurationType: wall.glasswallPanelConfiguration || "",
    operationType: wall.glasswallOperation || "",
    glassType: wall.glasswallGlassType || "",
    stc_rating: wall.glasswallSTCRating || "",
    partitionSupport: wall.glasswallPartitionSupport || "",
    passDoorType: wall.glasswallPassDoorType || "",
    passDoorOption: wall.glasswallPassDoorOption || "",
    panelFace: wall.glasswallPanelFace || "",
    hingeType: wall.glasswallHingeType || "",
    frameFinish: wall.glasswallFrameFinish || "",
    frameThickness: wall.glasswallFrameThickness || "",
    trackType: wall.glasswallTrackType || "",
    trackFinish: wall.glasswallTrackFinish || "",
    finalClosure: wall.glasswallFinalClosure || "",
    bottomSeals: wall.glasswallBottomSeals || "",
    topSeals: wall.glasswallTopSeals || "",
  };
}

/**
 * Creates an empty glass wall configuration with all fields cleared
 * Used when switching wall system types or resetting forms
 */
export function getEmptyGlassWallFields(): Partial<WallSpecification> {
  return mapGlassWallConfigToWallSpec({
    model: "",
    configurationType: "",
    operationType: "",
    glassType: "",
    stc_rating: "",
    partitionSupport: "",
    passDoorType: "",
    passDoorOption: "",
    panelFace: "",
    hingeType: "",
    frameFinish: "",
    frameThickness: "",
    trackType: "",
    trackFinish: "",
    finalClosure: "",
    bottomSeals: "",
    topSeals: "",
  });
}

/**
 * Creates a default wall specification with basic required fields
 */
export function createDefaultWallSpec(wallSystemType: string = ""): WallSpecification {
  const glassWallFields = getEmptyGlassWallFields();
  
  return {
    wallSystemType,
    lengthFeet: "",
    lengthInches: "",
    heightFeet: "",
    heightInches: "",
    quantity: "1",
    panelConfiguration: "",
    panelCount: "",
    series: "",
    model: "",
    panelThickness: "",
    panelDesign: "",
    panelSkin: "",
    stcRating: "",
    passDoorPanels: "",
    passDoorQuantity: "",
    panelFinishCategory: "",
    panelFinishSpecificItem: "",
    verticalSeals: "",
    bottomSeals: "",
    topSeals: "",
    initialClosureSystem: "",
    endPanelType: "",
    trackType: "",
    trackSystem: "",
    // Initialize all glass wall fields as empty
    ...(glassWallFields as Partial<WallSpecification>),
  } as WallSpecification;
}

/**
 * Validates that all required glass wall fields are populated
 */
export function validateGlassWallConfiguration(config: Partial<GlassWallConfiguration>): {
  isValid: boolean;
  missingFields: string[];
} {
  const requiredFields: (keyof GlassWallConfiguration)[] = [
    'model', 
    'configurationType', 
    'operationType', 
    'glassType', 
    'stc_rating', 
    'partitionSupport', 
    'trackType'
  ];

  const missingFields = requiredFields.filter(field => !config[field]);
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Deep clones a wall specification to avoid mutation issues
 */
export function cloneWallSpecification(wall: WallSpecification): WallSpecification {
  return JSON.parse(JSON.stringify(wall));
}

/**
 * Compares two wall specifications for equality
 */
export function isWallSpecificationEqual(wall1: WallSpecification, wall2: WallSpecification): boolean {
  return JSON.stringify(wall1) === JSON.stringify(wall2);
}