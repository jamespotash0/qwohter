// Wall Validation Logic
// Centralized validation rules extracted from form components

import { WallSpecification, WallDetails, GlassWallConfiguration } from '@/types/quote';
import { isValidConfiguration } from '@/models/constants/modelConfigurations';
import { GlassWallModel } from '@/types/quote';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Validates basic wall specification fields that apply to all wall types
 */
export function validateBasicWallSpec(wall: WallSpecification): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!wall.lengthFeet) {
    errors.push('Length (feet) is required');
  }
  if (!wall.heightFeet) {
    errors.push('Height (feet) is required');
  }
  if (!wall.panelCount) {
    errors.push('Panel count is required');
  }
  if (!wall.wallSystemType) {
    errors.push('Wall system type is required');
  }

  // Numeric validation
  const lengthFeet = parseInt(wall.lengthFeet);
  const heightFeet = parseInt(wall.heightFeet);
  const panelCount = parseInt(wall.panelCount);
  const quantity = parseInt(wall.quantity);

  if (wall.lengthFeet && (isNaN(lengthFeet) || lengthFeet <= 0)) {
    errors.push('Length (feet) must be a positive number');
  }
  if (wall.heightFeet && (isNaN(heightFeet) || heightFeet <= 0)) {
    errors.push('Height (feet) must be a positive number');
  }
  if (wall.panelCount && (isNaN(panelCount) || panelCount <= 0)) {
    errors.push('Panel count must be a positive number');
  }
  if (wall.quantity && (isNaN(quantity) || quantity <= 0)) {
    errors.push('Quantity must be a positive number');
  }

  // Range validation
  if (lengthFeet > 100) {
    warnings.push('Length over 100 feet is unusually large');
  }
  if (heightFeet > 20) {
    warnings.push('Height over 20 feet is unusually large');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validates operable wall specific fields
 */
export function validateOperableWallSpec(wall: WallSpecification): ValidationResult {
  const errors: string[] = [];

  if (wall.wallSystemType === "Operable Wall") {
    // Required fields for operable walls
    const requiredFields = [
      'panelConfiguration',
      'series',
      'model',
      'panelSkin',
      'stcRating',
      'panelDesign',
      'trackType',
      'trackSystem'
    ];

    requiredFields.forEach(field => {
      if (!wall[field as keyof WallSpecification]) {
        errors.push(`${field} is required for Operable Walls`);
      }
    });

    // Panel finish validation
    if (wall.panelFinishCategory && !wall.panelFinishSpecificItem) {
      errors.push('Panel finish specific item is required when panel finish category is selected');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates glass wall specific fields
 */
export function validateGlassWallSpec(wall: WallSpecification): ValidationResult {
  const errors: string[] = [];

  if (wall.wallSystemType === "Glass Wall") {
    // Required fields for glass walls
    const requiredFields: (keyof WallSpecification)[] = [
      'glasswallModel',
      'glasswallPanelConfiguration',
      'glasswallOperation',
      'glasswallGlassType',
      'glasswallSTCRating',
      'glasswallPartitionSupport',
      'glasswallTrackType'
    ];

    requiredFields.forEach(field => {
      if (!wall[field]) {
        errors.push(`${field.replace('glasswall', '').toLowerCase()} is required for Glass Walls`);
      }
    });

    // Validate against model configurations
    if (wall.glasswallModel) {
      const model = wall.glasswallModel as GlassWallModel;
      
      // Validate each field against available options for the selected model
      const fieldsToValidate = [
        { field: 'glasswallPanelConfiguration', configKey: 'configurations' as const },
        { field: 'glasswallOperation', configKey: 'operations' as const },
        { field: 'glasswallGlassType', configKey: 'glassType' as const },
        { field: 'glasswallSTCRating', configKey: 'stcRating' as const },
        { field: 'glasswallPartitionSupport', configKey: 'partitionSupport' as const },
        { field: 'glasswallPassDoorType', configKey: 'passDoorType' as const },
        { field: 'glasswallPanelFace', configKey: 'panelFaces' as const },
        { field: 'glasswallHingeType', configKey: 'hinging' as const },
        { field: 'glasswallFrameFinish', configKey: 'frameFinishes' as const },
        { field: 'glasswallTrackType', configKey: 'trackType' as const },
        { field: 'glasswallTrackFinish', configKey: 'trackFinish' as const },
        { field: 'glasswallFinalClosure', configKey: 'finalClosure' as const },
        { field: 'glasswallBottomSeals', configKey: 'bottomSeals' as const },
        { field: 'glasswallTopSeals', configKey: 'topSeals' as const }
      ];

      fieldsToValidate.forEach(({ field, configKey }) => {
        const value = wall[field];
        if (value && !isValidConfiguration(model, configKey, value)) {
          errors.push(`${field.replace('glasswall', '').toLowerCase()} "${value}" is not valid for model ${model}`);
        }
      });

      // Pass door option validation
      if (wall.glasswallPassDoorType && !wall.glasswallPassDoorOption) {
        errors.push('Pass door option is required when pass door type is selected');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a complete wall specification
 */
export function validateWallSpecification(wall: WallSpecification): ValidationResult {
  const basicValidation = validateBasicWallSpec(wall);
  const operableValidation = validateOperableWallSpec(wall);
  const glassWallValidation = validateGlassWallSpec(wall);

  const allErrors = [
    ...basicValidation.errors,
    ...operableValidation.errors,
    ...glassWallValidation.errors
  ];

  const allWarnings = [
    ...(basicValidation.warnings || [])
  ];

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings.length > 0 ? allWarnings : undefined
  };
}

/**
 * Validates all walls in a WallDetails object
 */
export function validateAllWalls(wallDetails: WallDetails): {
  isValid: boolean;
  wallValidations: { [wallName: string]: ValidationResult };
  hasAtLeastOneWall: boolean;
} {
  const wallEntries = Object.entries(wallDetails.walls);
  const wallValidations: { [wallName: string]: ValidationResult } = {};
  
  let overallValid = true;
  const hasAtLeastOneWall = wallEntries.length > 0;

  if (!hasAtLeastOneWall) {
    overallValid = false;
  }

  wallEntries.forEach(([wallName, wall]) => {
    const validation = validateWallSpecification(wall);
    wallValidations[wallName] = validation;
    
    if (!validation.isValid) {
      overallValid = false;
    }
  });

  return {
    isValid: overallValid && hasAtLeastOneWall,
    wallValidations,
    hasAtLeastOneWall
  };
}

/**
 * Gets validation errors as user-friendly messages
 */
export function getValidationSummary(wallDetails: WallDetails): {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  messages: string[];
} {
  const validation = validateAllWalls(wallDetails);
  const messages: string[] = [];
  let errorCount = 0;
  let warningCount = 0;

  if (!validation.hasAtLeastOneWall) {
    messages.push('At least one wall is required');
    errorCount++;
  }

  Object.entries(validation.wallValidations).forEach(([wallName, result]) => {
    if (result.errors.length > 0) {
      messages.push(`${wallName}: ${result.errors.join(', ')}`);
      errorCount += result.errors.length;
    }
    if (result.warnings && result.warnings.length > 0) {
      messages.push(`${wallName}: ${result.warnings.join(', ')}`);
      warningCount += result.warnings.length;
    }
  });

  return {
    isValid: validation.isValid,
    errorCount,
    warningCount,
    messages
  };
}