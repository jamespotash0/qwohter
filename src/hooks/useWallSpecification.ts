// Custom hook for Wall Specification management
// Provides React integration for the WallSpecificationViewModel

import { useRef, useEffect, useState } from 'react';
import { WallDetails } from '@/types/quote';
import { 
  createWallSpecificationViewModel, 
  WallSpecificationViewModel 
} from '@/viewmodels/WallSpecificationViewModel';

interface UseWallSpecificationProps {
  walls: WallDetails;
  onUpdate: (walls: WallDetails) => void;
}

/**
 * React interface that matches the original ViewModel interface
 * This provides backwards compatibility with existing components
 */
interface WallSpecificationViewModelInterface {
  // Callback
  onUpdate: (walls: WallDetails) => void;
  
  // State
  walls: WallDetails;
  currentWalls: WallDetails;
  editingWallName: string | null;
  currentEditingWallName: string | null;
  newWallName: string;
  currentNewWallName: string;
  collapsedWalls: Set<string>;
  currentCollapsedWalls: Set<string>;
  
  // Computed properties
  wallNames: string[];
  wallCount: number;
  hasWalls: boolean;
  validationResult: ReturnType<typeof import('@/models/WallValidation').validateAllWalls>;
  
  // All the methods from the ViewModel
  addWall: (wallSystemType?: string) => void;
  removeWall: (wallName: string) => void;
  renameWall: (oldName: string, newName: string) => void;
  duplicateWall: (wallName: string) => void;
  updateWallField: (wallName: string, field: keyof import('@/types/quote').WallSpecification, value: string) => void;
  updateGlassWallConfig: (wallName: string, config: import('@/types/quote').GlassWallConfiguration) => void;
  startEditingWallName: (wallName: string) => void;
  cancelEditingWallName: () => void;
  setNewWallName: (name: string) => void;
  toggleWallCollapse: (wallName: string) => void;
  isWallCollapsed: (wallName: string) => boolean;
  clearAllWalls: () => void;
  importWalls: (importedWalls: WallDetails) => void;
  exportWalls: () => WallDetails;
  validateWall: (wallName: string) => { isValid: boolean; errors: string[] };
  getWallValidationErrors: (wallName: string) => string[];
  getWall: (wallName: string) => import('@/types/quote').WallSpecification | undefined;
  hasWallType: (wallSystemType: string) => boolean;
  getWallsByType: (wallSystemType: string) => [string, import('@/types/quote').WallSpecification][];
}

/**
 * Custom hook for managing wall specification state and business logic
 * 
 * This hook provides:
 * - Complete wall lifecycle management (CRUD operations)
 * - Field validation and dependency handling
 * - UI state management (editing, collapsing)  
 * - Bulk operations (import/export, clear all)
 * - Glass wall configuration integration
 */
export function useWallSpecification({
  walls,
  onUpdate
}: UseWallSpecificationProps): WallSpecificationViewModelInterface {
  
  // Create a stable reference to the view model
  const viewModelRef = useRef<WallSpecificationViewModel | null>(null);
  
  // React state to trigger re-renders when the ViewModel state changes
  const [, forceUpdate] = useState({});
  
  // Create the view model only once
  if (!viewModelRef.current) {
    viewModelRef.current = createWallSpecificationViewModel(walls, (newWalls) => {
      onUpdate(newWalls);
      // Force a re-render when the ViewModel state changes
      forceUpdate({});
    });
  }
  
  const viewModel = viewModelRef.current;
  
  // Update the view model when props change (initial walls)
  useEffect(() => {
    // Sync the view model state if the initial walls changed
    if (JSON.stringify(viewModel.currentWalls) !== JSON.stringify(walls)) {
      viewModel.importWalls(walls);
    }
  }, [walls, viewModel]);
  
  // Return an interface that matches the expected React ViewModel interface
  return {
    // Callback
    onUpdate,
    
    // State - get from ViewModel getters
    walls: viewModel.currentWalls,
    currentWalls: viewModel.currentWalls,
    editingWallName: viewModel.currentEditingWallName,
    currentEditingWallName: viewModel.currentEditingWallName,
    newWallName: viewModel.currentNewWallName,
    currentNewWallName: viewModel.currentNewWallName,
    collapsedWalls: viewModel.currentCollapsedWalls,
    currentCollapsedWalls: viewModel.currentCollapsedWalls,
    
    // Computed properties
    wallNames: viewModel.wallNames,
    wallCount: viewModel.wallCount,
    hasWalls: viewModel.hasWalls,
    validationResult: viewModel.validationResult,
    
    // Methods - bind to ViewModel instance
    addWall: viewModel.addWall.bind(viewModel),
    removeWall: viewModel.removeWall.bind(viewModel),
    renameWall: viewModel.renameWall.bind(viewModel),
    duplicateWall: viewModel.duplicateWall.bind(viewModel),
    updateWallField: viewModel.updateWallField.bind(viewModel),
    updateGlassWallConfig: viewModel.updateGlassWallConfig.bind(viewModel),
    startEditingWallName: viewModel.startEditingWallName.bind(viewModel),
    cancelEditingWallName: viewModel.cancelEditingWallName.bind(viewModel),
    setNewWallName: viewModel.setNewWallName.bind(viewModel),
    toggleWallCollapse: viewModel.toggleWallCollapse.bind(viewModel),
    isWallCollapsed: viewModel.isWallCollapsed.bind(viewModel),
    clearAllWalls: viewModel.clearAllWalls.bind(viewModel),
    importWalls: viewModel.importWalls.bind(viewModel),
    exportWalls: viewModel.exportWalls.bind(viewModel),
    validateWall: viewModel.validateWall.bind(viewModel),
    getWallValidationErrors: viewModel.getWallValidationErrors.bind(viewModel),
    getWall: viewModel.getWall.bind(viewModel),
    hasWallType: viewModel.hasWallType.bind(viewModel),
    getWallsByType: viewModel.getWallsByType.bind(viewModel)
  };
}

/**
 * Enhanced hook for wall specification forms with additional utilities
 */
export function useWallSpecificationForm(props: UseWallSpecificationProps) {
  const viewModel = useWallSpecification(props);
  
  // Additional form-specific utilities
  const formUtils = {
    // Quick access to common wall types
    glassWalls: viewModel.getWallsByType('Glass Wall'),
    operableWalls: viewModel.getWallsByType('Operable Wall'),
    accordionWalls: viewModel.getWallsByType('Accordion Wall'),
    
    // Form completion and validation helpers
    getFormCompletionPercentage: (): number => {
      if (!viewModel.hasWalls) return 0;
      
      const totalFields = viewModel.wallCount * 8; // Approximate required fields per wall
      let completedFields = 0;
      
      viewModel.wallNames.forEach(wallName => {
        const wall = viewModel.getWall(wallName);
        if (!wall) return;
        
        // Count completed required fields
        const requiredFields = [
          'wallSystemType', 'lengthFeet', 'heightFeet', 'panelCount'
        ];
        
        completedFields += requiredFields.filter(field => 
          wall[field as keyof typeof wall]
        ).length;
        
        // Add system-specific field counts
        if (wall.wallSystemType === 'Operable Wall') {
          const operableFields = ['panelConfiguration', 'series', 'model', 'panelSkin'];
          completedFields += operableFields.filter(field => 
            wall[field as keyof typeof wall]
          ).length;
        } else if (wall.wallSystemType === 'Glass Wall') {
          const glassFields = ['glasswallModel', 'glasswallOperation', 'glasswallGlassType'];
          completedFields += glassFields.filter(field => 
            wall[field as keyof typeof wall]
          ).length;
        }
      });
      
      return Math.round((completedFields / totalFields) * 100);
    },
    
    // Get summary of validation issues
    getValidationSummary: () => {
      const result = viewModel.validationResult;
      const errorCount = Object.values(result.wallValidations)
        .reduce((count, validation) => count + validation.errors.length, 0);
      
      return {
        isValid: result.isValid,
        wallCount: viewModel.wallCount,
        errorCount,
        hasWalls: result.hasAtLeastOneWall,
        message: result.isValid 
          ? `${viewModel.wallCount} wall${viewModel.wallCount !== 1 ? 's' : ''} configured successfully`
          : `${errorCount} validation error${errorCount !== 1 ? 's' : ''} found`
      };
    },
    
    // Quick actions
    addGlassWall: () => viewModel.addWall('Glass Wall'),
    addOperableWall: () => viewModel.addWall('Operable Wall'),
    addAccordionWall: () => viewModel.addWall('Accordion Wall'),
    
    // Batch operations
    clearAllAndAddNew: (wallSystemType: string) => {
      viewModel.clearAllWalls();
      viewModel.addWall(wallSystemType);
    },
    
    // Export utilities
    exportToJson: () => JSON.stringify(viewModel.exportWalls(), null, 2),
    
    // Import utilities  
    importFromJson: (jsonString: string) => {
      try {
        const importedWalls = JSON.parse(jsonString);
        viewModel.importWalls(importedWalls);
        return { success: true };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Invalid JSON'
        };
      }
    },
    
    // Get walls grouped by type
    getWallsByType: () => {
      return {
        'Glass Wall': viewModel.getWallsByType('Glass Wall'),
        'Operable Wall': viewModel.getWallsByType('Operable Wall'),
        'Accordion Wall': viewModel.getWallsByType('Accordion Wall')
      };
    },
    
    // Advanced validation
    validateAllWalls: () => viewModel.validationResult,
    
    // UI helpers
    getWallDisplayName: (wallName: string) => {
      const wall = viewModel.getWall(wallName);
      if (!wall) return wallName;
      
      const type = wall.wallSystemType || 'Unknown';
      const model = wall.wallSystemType === 'Glass Wall' 
        ? wall.glasswallModel 
        : wall.model;
      
      return model ? `${wallName} (${type} - ${model})` : `${wallName} (${type})`;
    },
    
    // Quick field updates with validation
    safeUpdateWallField: (wallName: string, field: string, value: string) => {
      const wall = viewModel.getWall(wallName);
      if (!wall) return false;
      
      try {
        viewModel.updateWallField(wallName, field as keyof typeof wall, value);
        return true;
      } catch (error) {
        console.error('Failed to update wall field:', error);
        return false;
      }
    }
  };
  
  return {
    ...viewModel,
    ...formUtils
  };
}