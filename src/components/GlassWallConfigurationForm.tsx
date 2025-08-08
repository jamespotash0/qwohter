// Glass Wall Configuration Form - MVVM Architecture
// Refactored to use the new ViewModel pattern while maintaining backwards compatibility

import React from 'react';
import { GlassWallConfiguration } from '@/types/quote';
import { GlassWallConfigurationView } from '@/views/WallConfiguration';
import { useGlassWallConfiguration } from '@/hooks/useGlassWallConfiguration';

// Maintain backwards compatibility with existing interface
export type { GlassWallConfiguration } from '@/types/quote';

interface GlassWallConfigurationFormProps {
  onConfigurationChange?: (config: GlassWallConfiguration) => void;
  initialConfig?: Partial<GlassWallConfiguration>;
  className?: string;
}

/**
 * Glass Wall Configuration Form - Container Component
 * 
 * This component now acts as a smart container that:
 * 1. Uses the useGlassWallConfiguration hook for business logic
 * 2. Passes the ViewModel to the pure GlassWallConfigurationView
 * 3. Maintains the same props interface for backwards compatibility
 * 
 * Benefits of the refactor:
 * - Separation of concerns (UI vs Business Logic)
 * - Easier testing (can test ViewModel independently)
 * - Better maintainability
 * - Reusable business logic
 */
export const GlassWallConfigurationForm: React.FC<GlassWallConfigurationFormProps> = ({
  onConfigurationChange,
  initialConfig = {},
  className = ""
}) => {
  
  // Use the custom hook to get the ViewModel with all business logic
  const viewModel = useGlassWallConfiguration({
    initialConfig,
    onConfigurationChange
  });
  
  // Simply pass the ViewModel to the pure View component
  return (
    <GlassWallConfigurationView 
      viewModel={viewModel} 
      className={className}
    />
  );
};