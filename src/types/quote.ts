
// Enhanced domain-specific types for better type safety
export type WallSystemType = 'Glass Wall' | 'Operable Wall' | 'Accordion Wall';
export type GlassWallModel = 'Stella' | 'Luna' | 'Illona' | 'Ava' | 'Mata';

// Glass Wall Configuration interface for form handling
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

export interface WallSpecification {
  wallSystemType: string;
  lengthFeet: string;
  lengthInches: string;
  heightFeet: string;
  heightInches: string;
  quantity: string;
  panelConfiguration: string;
  panelCount: string;
  series: string;
  model: string;
  panelThickness: string;
  panelDesign: string;
  panelSkin: string;
  stcRating: string;
  passDoorPanels: string;
  panelFinishCategory: string;
  panelFinishSpecificItem: string;
  verticalSeals: string;
  bottomSeals: string;
  topSeals: string;
  initialClosureSystem: string;
  endPanelType: string;
  trackType: string;
  trackSystem: string;
  // Glass Wall specific fields
  glasswallModel?: string;
  glasswallOperation?: string;
  glasswallPanelConfiguration?: string;
  glasswallPanelFace?: string;
  glasswallFrameFinish?: string;
  glasswallGlassType?: string;
  glasswallSTCRating?: string;
  glasswallPartitionSupport?: string;
  glasswallPassDoorType?: string;
  glasswallPassDoorOption?: string;
  glasswallHingeType?: string;
  glasswallFrameThickness?: string;
  glasswallTrackType?: string;
  glasswallTrackFinish?: string;
  glasswallFinalClosure?: string;
  glasswallBottomSeals?: string;
  glasswallTopSeals?: string;
}

export interface WallDetails {
  id: string;
  walls: {
    [wallName: string]: WallSpecification;
  };
}

export interface PocketDoorsData {
  foldType: string;
  foldStyle: string;
}

export interface PricingData {
  basePrice: number;
  freight: number;
  total: string;
  paymentUponDrawings: string;
  paymentUponTrackInstallation: string;
}

export type QuoteStatus = 'Draft' | 'Pending' | 'Submitted' | 'Won' | 'Rejected';
