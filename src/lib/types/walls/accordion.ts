import { BaseWallSpecification } from './base';

export interface AccordionWallSpecification extends BaseWallSpecification {
  wallSystemType: 'Accordion Wall';
  panelMaterial: string;
  foldConfiguration: string;
  acousticRating: string;
  finishType: string;
}