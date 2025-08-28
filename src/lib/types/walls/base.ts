export type WallSystemType = 'Glass Wall' | 'Operable Wall' | 'Accordion Wall';

export interface PocketDoorConfig {
  foldType: string;
  foldStyle: string;
}

export interface TrackConfig {
  trackType: string;
  trackSystem: string;
}

export interface BaseWallSpecification {
  wallSystemType: WallSystemType;
  // model: string;
  // panelConfiguration: string;
  lengthFeet: string;
  lengthInches: string;
  heightFeet: string;
  heightInches: string;
  quantity: string;
  panelCount: string;
  bottomSeals: string;
  topSeals: string;
  trackType: string;
  trackSystem: string;
  
  pocketDoors?: PocketDoorConfig;
  trackConfiguration?: TrackConfig;
  structureSupport?: string;
}