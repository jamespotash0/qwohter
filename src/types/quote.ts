
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
  glasswallPanelWidth?: string;
  glasswallTrackType?: string;
  glasswallTrackFinish?: string;
  glasswallFloorGuide?: string;
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

export interface QuoteCustomization {
  customSections?: Array<{
    id: string;
    title: string;
    content: string;
    isVisible: boolean;
    isRequired: boolean;
    dependencies?: string[];
  }>;
  customHTML?: string;
  isCustomized?: boolean;
  lastModified?: Date;
  version?: number;
}
