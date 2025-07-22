
export interface WallSpecification {
  wallSystemType: string;
  widthFeet: string;
  widthInches: string;
  heightFeet: string;
  heightInches: string;
  quantity: string;
  panelType: string;
  panelCount: string;
  series: string;
  model: string;
  panelThickness: string;
  panelSkin: string;
  stcRating: string;
  verticalSealants: string;
  bottomSeals: string;
  topSeals: string;
  endPanelType: string;
  trackType: string;
  trackSystem: string;
}

export interface WallDetails {
  [wallName: string]: WallSpecification;
}

export interface PricingData {
  basePrice: number;
  freight: number;
  total: string;
  paymentUponDrawings: string;
  paymentUponTrackInstallation: string;
}
