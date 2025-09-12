// import React from 'react';
import { WallSpecification, isGlassWall } from '@/lib/types';
import { GlassWallFormAdapter } from '@/components/features/quotes/shared/components/GlassWallFormAdapter';

interface GlassWallCreationFormProps {
  wall: WallSpecification;
  wallName: string;
  onWallChange: (wallName: string, updates: Record<string, string>) => void;
}

const GlassWallCreationForm = ({ wall, wallName, onWallChange }: GlassWallCreationFormProps) => {
  if (!isGlassWall(wall)) {
    return <div>This form is only for Glass Walls</div>;
  }

  return (
    <GlassWallFormAdapter
      wallName={wallName}
      wall={wall}
      onWallChange={onWallChange}
      showFullFields={true}
      layout="creation"
    />
  );
};

export default GlassWallCreationForm;