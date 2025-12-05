import React from 'react';
import { WallSpecification } from '@/lib/types';
import { GlassWallFormFields } from './GlassWallFormFields';

interface GlassWallFormAdapterProps {
  wallName: string;
  wall: WallSpecification;
  showFullFields?: boolean;
  layout?: 'creation' | 'edit';
  // For creation form (batch updates)
  onWallChange?: (wallName: string, updates: Record<string, string>) => void;
  // For edit form (single field updates)  
  onFieldChange?: (wallName: string, field: string, value: any) => void;
}

export const GlassWallFormAdapter: React.FC<GlassWallFormAdapterProps> = ({
  wallName,
  wall,
  showFullFields = false,
  layout = 'creation',
  onWallChange,
  onFieldChange
}) => {
  // Create a unified onChange handler
  const handleChange = (wallName: string, updates: Record<string, string>) => {
    if (onWallChange) {
      // Creation form style - batch updates
      onWallChange(wallName, updates);
    } else if (onFieldChange) {
      // Edit form style - individual field updates
      Object.entries(updates).forEach(([field, value]) => {
        onFieldChange(wallName, field, value);
      });
    }
  };

  return (
    <GlassWallFormFields
      wall={wall}
      wallName={wallName}
      onChange={handleChange}
      showFullFields={showFullFields}
      layout={layout}
    />
  );
};