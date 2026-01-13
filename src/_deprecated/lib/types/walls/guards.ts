import { WallSpecification, OperableWallSpecification, GlassWallSpecification, AccordionWallSpecification } from './';

export const isOperableWall = (wall: WallSpecification): wall is OperableWallSpecification => {
  return wall.wallSystemType === 'Operable Wall';
};

export const isGlassWall = (wall: WallSpecification): wall is GlassWallSpecification => {
  return wall.wallSystemType === 'Glass Wall';
};

export const isAccordionPartition = (wall: WallSpecification): wall is AccordionWallSpecification => {
  return wall.wallSystemType === 'Accordion Partition';
};