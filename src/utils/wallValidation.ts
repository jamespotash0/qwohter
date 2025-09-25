export const isOperableWall = (wall: any): boolean => {
  return wall?.wallSystemType === 'Operable Wall';
};

export const isGlassWall = (wall: any): boolean => {
  return wall?.wallSystemType === 'Glass Wall';
};

// Helper function to parse fractional inches like "3 3/4", "3-3/4" (no decimals allowed)
const parseFractionalInches = (value: string): number => {
  if (!value || value.trim() === '') {
    return NaN;
  }
  
  const trimmed = value.trim();
  
  // Handle fractions with space or dash separator: "3 3/4" or "3-3/4"
  const fractionMatch = trimmed.match(/^(\d+)\s*[-\s]\s*(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const whole = parseInt(fractionMatch[1]!);
    const numerator = parseInt(fractionMatch[2]!);
    const denominator = parseInt(fractionMatch[3]!);
    return whole + (numerator / denominator);
  }
  
  // Handle just fractions: "3/4"
  const pureFractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (pureFractionMatch) {
    const numerator = parseInt(pureFractionMatch[1]!);
    const denominator = parseInt(pureFractionMatch[2]!);
    return numerator / denominator;
  }
  
  // Handle whole numbers: "3"
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed);
  }
  
  return NaN;
};

export const validateWallDimensions = (wall: any) => {
  const errors: string[] = [];
  
  // Length validation
  const lengthFeet = parseInt(wall.lengthFeet || '0');
  if (isNaN(lengthFeet) || lengthFeet < 1 || lengthFeet > 40) {
    errors.push('Length feet must be between 1 and 40');
  }
  
  const lengthInches = wall.lengthInches || '';
  if (lengthInches === '') {
    errors.push('Length inches is required');
  } else {
    const inchesNum = parseFractionalInches(lengthInches);
    if (isNaN(inchesNum) || inchesNum < 0 || inchesNum >= 12) {
      errors.push('Length inches must be between 0 and 11 (e.g., "0", "3/4", "3 3/4", or "3-3/4")');
    }
  }
  
  // Height validation
  const heightFeet = parseInt(wall.heightFeet || '0');
  if (isNaN(heightFeet) || heightFeet < 1 || heightFeet > 40) {
    errors.push('Height feet must be between 1 and 40');
  }
  
  const heightInches = wall.heightInches || '';
  if (heightInches === '') {
    errors.push('Height inches is required');
  } else {
    const inchesNum = parseFractionalInches(heightInches);
    if (isNaN(inchesNum) || inchesNum < 0 || inchesNum >= 12) {
      errors.push('Height inches must be between 0 and 11 (e.g., "0", "3/4", "3 3/4", or "3-3/4")');
    }
  }
  
  // Panel count validation
  const panelCount = parseInt(wall.panelCount || '0');
  if (isNaN(panelCount) || panelCount < 1 || panelCount > 50) {
    errors.push('Panel count must be between 1 and 50');
  }
  
  // Wall System Type
  if (!wall.wallSystemType) {
    errors.push('Wall system type is required');
  }
  
  return { isValid: errors.length === 0, errors };
};

export const validateOperableWallRequiredFields = (wall: any) => {
  const requiredFields = {
    panelConfiguration: wall.panelConfiguration,
    series: wall.series,
    model: wall.model,
    panelSkin: wall.panelSkin,
    stcRating: wall.stcRating,
    trackType: wall.trackType,
    trackSystem: wall.trackSystem
  };
  
  const errors: string[] = [];
  
  // Check each required field
  for (const [field, value] of Object.entries(requiredFields)) {
    if (!value || value === '') {
      errors.push(`${field} is required`);
    }
  }
  
  // Check for panel finish dependency
  if (wall.panelFinishCategory && (!wall.panelFinishSpecificItem || wall.panelFinishSpecificItem === '')) {
    errors.push('Panel finish specific item is required when finish category is selected');
  }
  
  // Check for pass door quantity dependency
  if (wall.passDoorPanels && wall.passDoorPanels !== '' && (!wall.passDoorQuantity || wall.passDoorQuantity === '')) {
    errors.push('Pass door quantity is required when pass door panels is specified');
  }
  
  return { isValid: errors.length === 0, errors };
};

export const validateGlassWallRequiredFields = (wall: any) => {
  const requiredFields = {
    model: wall.model,
    panelConfiguration: wall.panelConfiguration,
    panelOperation: wall.panelOperation,
    glassType: wall.glassType,
    stcRating: wall.stcRating,
    partitionSupport: wall.partitionSupport,
    trackType: wall.trackType
  };
  
  const errors: string[] = [];
  
  // Check each required field
  for (const [field, value] of Object.entries(requiredFields)) {
    if (!value || value === '') {
      errors.push(`${field} is required`);
    }
  }
  
  return { isValid: errors.length === 0, errors };
};

export const validateWallSpecification = (wall: any) => {
  // First validate basic dimensions
  const dimensionValidation = validateWallDimensions(wall);
  if (!dimensionValidation.isValid) {
    return dimensionValidation;
  }
  
  // Then validate wall-type specific required fields
  if (isOperableWall(wall)) {
    return validateOperableWallRequiredFields(wall);
  }
  
  if (isGlassWall(wall)) {
    return validateGlassWallRequiredFields(wall);
  }
  
  return { isValid: true, errors: [] };
};