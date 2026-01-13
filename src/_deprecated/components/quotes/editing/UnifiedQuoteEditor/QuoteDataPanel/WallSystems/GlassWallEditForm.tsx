import React from 'react';
import { WallSpecification } from '@/lib/types';
import { GlassWallFormAdapter } from '@/_deprecated/components/quotes/shared/components/GlassWallFormAdapter';

interface GlassWallEditFormProps {
  wallName: string;
  wall: WallSpecification;
  onFieldChange: (wallName: string, field: string, value: any) => void;
  showFullFields?: boolean;
}

export const GlassWallEditForm: React.FC<GlassWallEditFormProps> = ({
  wallName,
  wall,
  onFieldChange,
  showFullFields = false
}) => {
  return (
    <GlassWallFormAdapter
      wallName={wallName}
      wall={wall}
      onFieldChange={onFieldChange}
      showFullFields={showFullFields}
      layout="edit"
    />
  );
};