import { BaseWallSpecification } from './base';

export type GlassWallModel = 'Stella' | 'Luna' | 'Illona' | 'Ava' | 'Mata';

export interface ModelConfiguration {
  configurations: string[];
  operations: string[];
  glassType: string[];
  stcRating: string[];
  partitionSupport: string[];
  passDoorType: string[];
  passDoorOption: string[];
  panelFaces: string[];
  hinging: string[];
  frameFinishes: string[];
  trackSystem: string[];
  trackType: string[];
  trackFinish: string[];
  floorGuide?: string[];
  finalClosure: string[];
  bottomSeals: string[];
  topSeals: string[];
}

export interface GlassWallSpecification extends BaseWallSpecification {
  wallSystemType: 'Glass Wall';
  model: string;
  operation: string;
  panelConfiguration: string;
  panelFace: string;
  frameFinish: string;
  glassType: string;
  stcRating: string;
  partitionSupport: string;
  passDoorType: string;
  passDoorOption: string;
  hingeType: string;
  frameThickness: string;
  trackFinish: string;
  floorGuide: string;
  finalClosure: string;
}

export interface GlassWallConfiguration {
  model: string;
  configurationType: string;
  operationType: string;
  glassType: string;
  stc_rating: string;
  partitionSupport: string;
  passDoorType: string;
  passDoorOption: string;
  panelFace: string;
  hingeType: string;
  frameFinish: string;
  frameThickness: string;
  trackType: string;
  trackFinish: string;
  finalClosure: string;
  bottomSeals: string;
  topSeals: string;
}

export const modelConfigurations: Record<GlassWallModel, ModelConfiguration> = {
  Stella: {
    configurations: ['Individual Panels'],
    operations: ['Manual', 'Automated', 'Programmable Self-Driving', 'Semi-Automated Seals'],
    glassType: ['Tempered Glass', 'Laminated Glass', 'Switchable Glass', 'Child-Safe Glass', 'Fully Back-Painted Glass'],
    stcRating: ['44', '50'],
    partitionSupport: ['Top-Supported'],
    passDoorType: ['Full-Height', 'Inset'],
    passDoorOption: ['Single', 'Double'],
    panelFaces: ['Solid Face', 'MDF-Backed Melamine', 'High Pressure Laminate', 'Electrical Internal Mini-Blinds', 'Internal Mullions & Muntins'],
    hinging: ['Invisible Hinges'],
    frameFinishes: ['Clear Anodized', 'Black', 'White', 'Custom RAL Powder Coat', 'Sublimation Wood Look'],
    trackSystem: ['Architectural Grade Extruded Aluminum Alloy 6063-T6'],
    trackType: ['Top-Supported Multi-directional & Single-Point'],
    trackFinish: ['Clear Anodized', 'Black Powder Coat', 'White Powder Coat', 'Custom RAL Option'],
    finalClosure: ['Panel-Mounted Telescoping Jamb', 'Wall-Mounted Telescoping Jamb', 'Full-Height Door'],
    bottomSeals: ['Electric', 'Automatic', 'Semi-Automatic', 'Manual', 'Operable'],
    topSeals: ['Electric', 'Automatic', 'Semi-Automatic', 'Manual', 'Operable']
  },
  Luna: {
    configurations: ['Individual Panels', 'Continuously-Hinged Panels'],
    operations: ['Manual'],
    glassType: ['Tempered Glass', 'Laminated Glass', 'Switchable Glass', 'Child-Safe Glass', 'Fully Back-Painted Glass'],
    stcRating: ['43'],
    partitionSupport: ['Top-Supported', 'Floor-Supported'],
    passDoorType: ['Full-Height'],
    passDoorOption: ['Single', 'Double'],
    panelFaces: ['Solid Face', 'MDF-Backed Melamine', 'High Pressure Laminate', 'Electrical Internal Mini-Blinds', 'Internal Muntins'],
    hinging: ['Invisible Hinges'],
    frameFinishes: ['Black Powder Coat', 'Custom RAL Powder Coat', 'Sublimation Wood Look'],
    trackSystem: ['Architectural Grade Extruded Aluminum Alloy 6063-T6'],
    trackType: ['Top-Supported Multi-directional & Single-Point', 'Floor-Supported Top Guide'],
    trackFinish: ['Black Powder Coat','Clear Anodized', 'White', 'Custom RAL Option'],
    floorGuide: ['Optional'],
    finalClosure: ['Hinged Closure Panel', 'Full-Height Door'],
    bottomSeals: ['Floor Supported Fixed Bulb', 'Top Supported Fixed Brush'],
    topSeals: ['Floor Supported Fixed Bulb', 'Top Supported Fixed Brush'],
  },
  Illona: {
    configurations: ['Individual Panels', 'Continuously-Hinged Panels', 'Pivoting Individual Panels', 'Single & Telescoping Slider Panels'],
    operations: ['Manual'],
    glassType: ['Tempered Glass', 'Laminated Glass', 'Back-Painted Glass'],
    stcRating: ['33'],
    partitionSupport: ['Top-Supported'],
    passDoorType: ['Full-Height'],
    passDoorOption: ['Single', 'Double'],
    panelFaces: ['Surface-Mounted Muntins'],
    hinging: ['Invisible Hinges'],
    frameFinishes: ['Black Powder Coat', 'White Powder Coat', 'Custom RAL Powder Coat', 'Sublimation Wood Look'],
    trackSystem: ['Architectural Grade Extruded Aluminum Alloy 6063-T6'],
    trackType: ['Top-Supported Multi-directional & Single-Point'],
    trackFinish: ['Black Powder Coat','Clear Anodized', 'White Powder Coat', 'Custom RAL Option'],
    floorGuide: ['Optional'],
    finalClosure: ['Hinged Closure Panel', 'Full-Height Door'],
    bottomSeals: ['Fixed Brush'],
    topSeals: ['Fixed Brush'],
  },
  Ava: {
    configurations: ['Individual Panels', 'Hinged-Paired Panels'],
    operations: ['Manual'],
    glassType: ['1/2" Tempered Glass'],
    stcRating: ['None-Acoustic'],
    partitionSupport: ['Top-Supported'],
    passDoorType: ['Full-Height'],
    passDoorOption: ['Single', 'Double'],
    panelFaces: ['None'],
    hinging: ['Full-Leaf Butt Hinges'],
    frameFinishes: ['Clear Anodized', 'Black Powder Coat', 'Custom RAL Color Options'],
    trackSystem: ['Architectural Grade Extruded Aluminum Alloy 6063-T6'],
    trackType: ['Top-Supported Multi-directional & Single-Point'],
    trackFinish: ['Black Powder Coat', 'Clear Anodized', 'Custom RAL Color Option'],
    floorGuide: ['None'],
    finalClosure: ['Fixed Pivot Panel', 'Fixed Swing Panel'],
    bottomSeals: ['Fixed Brush'],
    topSeals: ['Fixed Brush'],
  },
  Mata: {
    configurations: ['Individual Panels', 'Continuously-Hinged Panels', 'Single & Telescoping Slider Panels'],
    operations: ['Manual'],
    glassType: ['1/4" Tempered Glass', '5/16" Frosted Laminated Glass', 'Custom Glass Options'],
    stcRating: ['None-Acoustic'],
    partitionSupport: ['Top-Supported'],
    passDoorType: ['Full-Height'],
    passDoorOption: ['Single', 'Double'],
    panelFaces: ['Wood Insert', 'Mullions & Surface-Mounted Muntins'],
    hinging: ['Full-Leaf Butt Hinges'],
    frameFinishes: ['Stained Fruitwood Dark Oak', 'Stained Wheat', 'Stained Cordovan', 'Painted Black', 'Painted White', 'Unfinished'],
    trackSystem: ['Architectural Grade Extruded Aluminum Alloy 6063-T6'],
    trackType: ['Top-Supported Multi-directional & Single-Point'],
    trackFinish: ['Black Powder Coat', 'Clear Anodized', 'Custom RAL Option'],
    floorGuide: ['None'],
    finalClosure: ['Hinged Closure Panel', 'None Required'],
    bottomSeals: ['Fixed Flexible Vinyl'],
    topSeals: ['Fixed Flexible Vinyl'],
  }
};

// Helper function to get available options for a specific field and model
export function getAvailableOptions(
  model: GlassWallModel, 
  field: keyof ModelConfiguration
): string[] {
  if (!model || !(model in modelConfigurations)) return [];
  return modelConfigurations[model][field] || [];
}

// Helper function to get frame thickness based on model and STC rating
export function getFrameThickness(model: GlassWallModel, stcRating?: string): string {
  switch (model) {
    case 'Stella':
      return stcRating === '44' ? '4-1/2"' : '4-11/16"';
    case 'Luna':
      return '2-3/4"';
    case 'Illona':
      return '1-3/8"';
    case 'Ava':
      return '1-7/16"';
    case 'Mata':
      return '1-3/4"';
    default:
      return 'Auto-Calculated';
  }
}

// Validation function to check if a model supports a specific configuration
export function isValidConfiguration(
  model: GlassWallModel, 
  field: keyof ModelConfiguration, 
  value: string
): boolean {
  const availableOptions = getAvailableOptions(model, field);
  return availableOptions.includes(value);
}