// Glass Wall Section - Wrapper for Glass Wall Configuration
// Handles the integration between wall specification and glass wall configuration

import React from 'react';
import { WallSpecification, GlassWallConfiguration } from '@/types/quote';
import { GlassWallConfigurationView } from '@/views/WallConfiguration/GlassWallConfigurationView';
import { useGlassWallConfiguration } from '@/hooks/useGlassWallConfiguration';
import { mapWallSpecToGlassWallConfig } from '@/models/WallDataMapper';

interface GlassWallSectionProps {
  wall: WallSpecification;
  onConfigurationChange: (config: GlassWallConfiguration) => void;
  disabled?: boolean;
}

export const GlassWallSection: React.FC<GlassWallSectionProps> = ({
  wall,
  onConfigurationChange,
  disabled = false
}) => {
  
  // Convert wall specification to glass wall configuration format
  const initialConfig = mapWallSpecToGlassWallConfig(wall);
  
  // Use the glass wall configuration view model
  const viewModel = useGlassWallConfiguration({
    initialConfig,
    onConfigurationChange: disabled ? undefined : onConfigurationChange
  });
  
  if (wall.wallSystemType !== "Glass Wall") {
    return null;
  }
  
  return (
    <div className="mt-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Glass Wall Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Configure the specific properties for this glass wall system.
        </p>
      </div>
      
      <GlassWallConfigurationView 
        viewModel={viewModel} 
        className={disabled ? "opacity-50 pointer-events-none" : ""}
      />
    </div>
  );
};