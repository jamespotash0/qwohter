import React from 'react';
import { WallSpecification } from '@/lib/types';
import { OperableWallFormAdapter } from '@/components/features/quotes/shared/components/OperableWallFormAdapter';
import { WallTypeFormProps } from './types';

export const OperableWallEditForm: React.FC<WallTypeFormProps> = ({
  wallName,
  wall,
  onFieldChange
}) => {
  return (
    <OperableWallFormAdapter
      wallName={wallName}
      wall={wall as WallSpecification}
      onFieldChange={onFieldChange}
      showFullFields={true}
      layout="edit"
      // hideHierarchicalFields={hideHierarchicalFields}
    />
  );
};