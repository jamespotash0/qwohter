export * from './base';
export * from './operable';
export * from './glass';
export * from './accordion';
export * from './guards';

import { OperableWallSpecification } from './operable';
import { GlassWallSpecification } from './glass';
// import { AccordionWallSpecification } from './accordion';

export type WallSpecification = 
  | OperableWallSpecification 
  | GlassWallSpecification 
  // | AccordionWallSpecification;

export interface WallDetails {
  id: string;
  walls: Record<string, WallSpecification>;
}