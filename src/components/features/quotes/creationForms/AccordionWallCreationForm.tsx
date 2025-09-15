import React from 'react';
import { WallSpecification } from '@/lib/types';
import { AccordionWallFormAdapter } from '@/components/features/quotes/shared/components/AccordionWallFormAdapter';

interface AccordionWallCreationFormProps {
  wall: WallSpecification;
  wallName: string;
  onWallChange: (wallName: string, updates: Record<string, string>) => void;
}

export const AccordionWallCreationForm: React.FC<AccordionWallCreationFormProps> = ({
  wall,
  wallName,
  onWallChange
}) => {
  return (
    <AccordionWallFormAdapter
      wallName={wallName}
      wall={wall}
      onWallChange={onWallChange}
      showFullFields={true}
      layout="creation"
    />
  );
};