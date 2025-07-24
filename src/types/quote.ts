
export interface WallSpecification {
  wallSystemType: string;
  widthFeet: string;
  widthInches: string;
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
  verticalSealants: string;
  bottomSeals: string;
  topSeals: string;
  finalSeal: string;
  endPanelType: string;
  trackType: string;
  trackSystem: string;
}

export interface WallDetails {
  id: string;
  walls: {
    [wallName: string]: WallSpecification;
  };
}

export interface PricingData {
  basePrice: number;
  freight: number;
  total: string;
  paymentUponDrawings: string;
  paymentUponTrackInstallation: string;
}
