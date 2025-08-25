// Custom hook for Glass Wall Configuration
// Provides React integration for the GlassWallConfigurationViewModel

import { useEffect, useRef, useState } from 'react';
import { GlassWallConfiguration } from '@/types/quote';
import { GlassWallConfigurationViewModel } from '@/viewmodels/GlassWallConfigurationViewModel';

interface UseGlassWallConfigurationProps {
  initialConfig?: Partial<GlassWallConfiguration>;
  onConfigurationChange?: (config: GlassWallConfiguration) => void;
}

/**
 * Custom hook for managing glass wall configuration state and business logic
 * 
 * This hook provides:
 * - State management for all glass wall fields
 * - Field validation and dependency management  
 * - Automatic option filtering based on selected model
 * - Configuration change callbacks
 * - Initialization handling to prevent data loss
 */
export function useGlassWallConfiguration({
  initialConfig = {},
  onConfigurationChange
}: UseGlassWallConfigurationProps = {}) {
  
  // Create a stable reference to the view model
  const viewModelRef = useRef<GlassWallConfigurationViewModel | null>(null);
  
  // Force re-renders when ViewModel state changes
  const [, forceUpdate] = useState({});
  const triggerRerender = () => forceUpdate({});
  
  // Create the view model only once to prevent recreation on re-renders
  if (!viewModelRef.current) {
    viewModelRef.current = new GlassWallConfigurationViewModel(
      initialConfig,
      onConfigurationChange
    );
  }
  
  const viewModel = viewModelRef.current;
  
  // Set up polling to detect changes in the ViewModel and trigger re-renders
  useEffect(() => {
    const interval = setInterval(() => {
      triggerRerender();
    }, 100); // Poll every 100ms to detect state changes
    
    return () => clearInterval(interval);
  }, []);
  
  // Return an object that matches the expected interface for the View components
  return {
    // State properties  
    selectedModel: viewModel.model,
    selectedConfiguration: viewModel.configuration,
    selectedOperation: viewModel.operation,
    selectedGlassType: viewModel.glassType,
    selectedSTCRating: viewModel.stcRating,
    selectedPartitionSupport: viewModel.partitionSupport,
    selectedPassDoorType: viewModel.passDoorType,
    selectedPassDoorOption: viewModel.passDoorOption,
    selectedPanelFace: viewModel.panelFace,
    selectedHingeType: viewModel.hingeType,
    selectedFrameFinish: viewModel.frameFinish,
    selectedTrackType: viewModel.trackType,
    selectedTrackFinish: viewModel.trackFinish,
    selectedFinalClosure: viewModel.finalClosure,
    selectedBottomSeals: viewModel.bottomSeals,
    selectedTopSeals: viewModel.topSeals,
    
    // Computed properties
    frameThickness: viewModel.frameThickness,
    isInitialized: viewModel.initialized,
    
    // Available options
    availableConfigurations: viewModel.availableConfigurations,
    availableOperations: viewModel.availableOperations,
    availableGlassTypes: viewModel.availableGlassTypes,
    availableSTCRatings: viewModel.availableSTCRatings,
    availablePartitionSupports: viewModel.availablePartitionSupports,
    availablePassDoorTypes: viewModel.availablePassDoorTypes,
    availablePassDoorOptions: viewModel.availablePassDoorOptions,
    availablePanelFaces: viewModel.availablePanelFaces,
    availableHingeTypes: viewModel.availableHingeTypes,
    availableFrameFinishes: viewModel.availableFrameFinishes,
    availableTrackTypes: viewModel.availableTrackTypes,
    availableTrackFinishes: viewModel.availableTrackFinishes,
    availableFinalClosures: viewModel.availableFinalClosures,
    availableBottomSeals: viewModel.availableBottomSeals,
    availableTopSeals: viewModel.availableTopSeals,
    
    // Action methods
    setModel: viewModel.setModel.bind(viewModel),
    setConfiguration: viewModel.setConfiguration.bind(viewModel),
    setOperation: viewModel.setOperation.bind(viewModel),
    setGlassType: viewModel.setGlassType.bind(viewModel),
    setSTCRating: viewModel.setSTCRating.bind(viewModel),
    setPartitionSupport: viewModel.setPartitionSupport.bind(viewModel),
    setPassDoorType: viewModel.setPassDoorType.bind(viewModel),
    setPassDoorOption: viewModel.setPassDoorOption.bind(viewModel),
    setPanelFace: viewModel.setPanelFace.bind(viewModel),
    setHingeType: viewModel.setHingeType.bind(viewModel),
    setFrameFinish: viewModel.setFrameFinish.bind(viewModel),
    setTrackType: viewModel.setTrackType.bind(viewModel),
    setTrackFinish: viewModel.setTrackFinish.bind(viewModel),
    setFinalClosure: viewModel.setFinalClosure.bind(viewModel),
    setBottomSeals: viewModel.setBottomSeals.bind(viewModel),
    setTopSeals: viewModel.setTopSeals.bind(viewModel),
    
    // Utility methods
    resetAllFields: viewModel.resetAllFields.bind(viewModel),
    getCurrentConfiguration: viewModel.getCurrentConfiguration.bind(viewModel),
    getValidationResult: viewModel.getValidationResult.bind(viewModel),
  };
}

/**
 * Hook specifically for glass wall configuration forms
 * Includes additional form-specific functionality
 */
export function useGlassWallConfigurationForm(props: UseGlassWallConfigurationProps) {
  const viewModel = useGlassWallConfiguration(props);
  
  // Additional form-specific utilities
  const formUtils = {
    // Check if form is ready for user interaction
    isReady: viewModel.isInitialized && viewModel.selectedModel !== '',
    
    // Get form completion percentage
    getCompletionPercentage: (): number => {
      const config = viewModel.getCurrentConfiguration();
      const fields = Object.values(config);
      const filledFields = fields.filter(value => value !== '').length;
      return Math.round((filledFields / fields.length) * 100);
    },
    
    // Check if required fields are filled
    hasRequiredFields: (): boolean => {
      const config = viewModel.getCurrentConfiguration();
      return !!(config.model && config.configurationType && config.operationType && 
               config.glassType && config.stc_rating && config.partitionSupport && 
               config.trackType);
    },
    
    // Get user-friendly validation messages
    getValidationMessages: (): string[] => {
      const validation = viewModel.getValidationResult();
      if (validation.isValid) return [];
      
      return validation.missingFields.map(field => {
        const friendlyNames: { [key: string]: string } = {
          model: 'Glass Wall Model',
          configurationType: 'Panel Configuration',
          operationType: 'Operation Type',
          glassType: 'Glass Type',
          stc_rating: 'STC Rating',
          partitionSupport: 'Partition Support',
          trackType: 'Track Type'
        };
        return `${friendlyNames[field] || field} is required`;
      });
    }
  };
  
  return {
    ...viewModel,
    ...formUtils
  };
}