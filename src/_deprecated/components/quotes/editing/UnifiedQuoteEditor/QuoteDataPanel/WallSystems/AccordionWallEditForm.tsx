import React from 'react';
import { WallSpecification } from '@/lib/types';
import { AccordionWallFormAdapter } from '@/_deprecated/components/quotes/shared/components/AccordionWallFormAdapter';
import { WallTypeFormProps } from './types';

export const AccordionWallEditForm: React.FC<WallTypeFormProps> = ({
  wallName,
  wall,
  onFieldChange
}) => {
  return (
    <AccordionWallFormAdapter
      wallName={wallName}
      wall={wall as WallSpecification}
      onFieldChange={onFieldChange}
      showFullFields={true}
      layout="edit"
    />
  );
};