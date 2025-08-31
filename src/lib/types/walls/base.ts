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
  lengthFeet: number | string;
  lengthInches: number | string;
  heightFeet: number | string;
  heightInches: number | string;
  quantity: number | string;
  panelCount: number | string;
  bottomSeals: string;
  topSeals: string;
  trackType: string;
  trackSystem: string;
  
  pocketDoors?: PocketDoorConfig;
  trackConfiguration?: TrackConfig;
  structureSupport?: string;
}