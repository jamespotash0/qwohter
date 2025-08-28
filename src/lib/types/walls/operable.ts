import { BaseWallSpecification } from './base';

export interface OperableWallSpecification extends BaseWallSpecification {
  wallSystemType: 'Operable Wall';
  panelConfiguration: string;
  series: string;
  model: string;
  panelThickness: string;
  panelDesign: string;
  panelSkin: string;
  stcRating: string;
  passDoorPanels: string;
  passDoorQuantity: string;
  panelFinishCategory: string;
  panelFinishSpecificItem: string;
  initialClosureSystem: string;
  endPanelType: string;
  verticalSeals: string;
}

// also has PocketDoorConfig and TrackConfig from base.ts, bottomSeals, topSeals, trackType, trackSystem