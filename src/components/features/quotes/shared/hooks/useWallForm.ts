import { useState, useRef, useEffect, useCallback } from 'react';
import { WallSpecification } from '@/lib/types';
import { 
  modelConfigurations, 
  getAvailableOptions, 
  getFrameThickness, 
  getTrackSystem, 
  GlassWallModel,
  ModelConfiguration 
} from '@/lib/types/walls/glass';

interface UseWallFormProps {
  wall: WallSpecification;
  wallName: string;
  onChange: (wallName: string, updates: Record<string, string>) => void;
}

export const useWallForm = ({ wall, wallName, onChange }: UseWallFormProps) => {
  // State for all glass wall fields
  const [selectedModel, setSelectedModel] = useState<string>(wall.model || '');
  const [selectedConfiguration, setSelectedConfiguration] = useState<string>(wall.panelConfiguration || '');
  const [selectedOperation, setSelectedOperation] = useState<string>(wall.operation || '');
  const [selectedGlassType, setSelectedGlassType] = useState<string>(wall.glassType || '');
  const [selectedSTCRating, setSelectedSTCRating] = useState<string>(wall.stcRating || '');
  const [selectedPartitionSupport, setSelectedPartitionSupport] = useState<string>(wall.partitionSupport || '');
  const [selectedPassDoorType, setSelectedPassDoorType] = useState<string>(wall.passDoorType || '');
  const [selectedPassDoorOption, setSelectedPassDoorOption] = useState<string>(wall.passDoorOption || '');
  const [selectedPanelFace, setSelectedPanelFace] = useState<string>(wall.panelFace || '');
  const [selectedHingeType, setSelectedHingeType] = useState<string>(wall.hingeType || '');
  const [selectedFrameFinish, setSelectedFrameFinish] = useState<string>(wall.frameFinish || '');
  const [selectedTrackType, setSelectedTrackType] = useState<string>(wall.trackType || '');
  const [selectedTrackFinish, setSelectedTrackFinish] = useState<string>(wall.trackFinish || '');
  const [selectedFinalClosure, setSelectedFinalClosure] = useState<string>(wall.finalClosure || '');
  const [selectedBottomSeals, setSelectedBottomSeals] = useState<string>(wall.bottomSeals || '');
  const [selectedTopSeals, setSelectedTopSeals] = useState<string>(wall.topSeals || '');
  const [calculatedFrameThickness, setCalculatedFrameThickness] = useState<string>(wall.frameThickness || '');
  const [calculatedTrackSystem, setCalculatedTrackSystem] = useState<string>(wall.trackSystem || '');
  const [selectedFloorGuide, setSelectedFloorGuide] = useState<string>(wall.floorGuide || '');

  // Refs for tracking previous values to prevent infinite loops
  const prevModelRef = useRef<string>('');
  const prevConfigRef = useRef<string>('');

  // Sync state with wall prop changes (important for form re-renders)
  useEffect(() => {
    setSelectedModel(wall.model || '');
    setSelectedConfiguration(wall.panelConfiguration || '');
    setSelectedOperation(wall.operation || '');
    setSelectedGlassType(wall.glassType || '');
    setSelectedSTCRating(wall.stcRating || '');
    setSelectedPartitionSupport(wall.partitionSupport || '');
    setSelectedPassDoorType(wall.passDoorType || '');
    setSelectedPassDoorOption(wall.passDoorOption || '');
    setSelectedPanelFace(wall.panelFace || '');
    setSelectedHingeType(wall.hingeType || '');
    setSelectedFrameFinish(wall.frameFinish || '');
    setSelectedTrackType(wall.trackType || '');
    setSelectedTrackFinish(wall.trackFinish || '');
    setSelectedFinalClosure(wall.finalClosure || '');
    setSelectedBottomSeals(wall.bottomSeals || '');
    setSelectedTopSeals(wall.topSeals || '');
    setCalculatedFrameThickness(wall.frameThickness || '');
    setCalculatedTrackSystem(wall.trackSystem || '');
    setSelectedFloorGuide(wall.floorGuide || '');
  }, [wall]);

  // Cascading field dependencies
  const FIELD_DEPENDENCIES: Record<string, string[]> = {
    model: [
      'panelConfiguration', 'operation', 'glassType', 'stcRating', 'partitionSupport',
      'panelFace', 'frameFinish', 'frameThickness', 'trackSystem', 'trackType', 
      'trackFinish', 'passDoorType', 'passDoorOption', 'floorGuide', 'hingeType',
      'finalClosure', 'bottomSeals', 'topSeals'
    ],
    panelConfiguration: [],
    operation: [],
    passDoorType: ['passDoorOption']
  };

  // Cascading reset function
  const cascadeFieldReset = useCallback((field: string, currentValue: string) => {
    const fieldsToReset = FIELD_DEPENDENCIES[field] || [];
    const resetUpdates: Record<string, string> = {};

    fieldsToReset.forEach(fieldToReset => {
      resetUpdates[fieldToReset] = '';
    });

    // Apply the main field change and resets
    const allUpdates = { [field]: currentValue, ...resetUpdates };
    onChange(wallName, allUpdates);

    // Update local state - reset all fields that need to be reset
    if (fieldsToReset.includes('panelConfiguration')) setSelectedConfiguration('');
    if (fieldsToReset.includes('operation')) setSelectedOperation('');
    if (fieldsToReset.includes('glassType')) setSelectedGlassType('');
    if (fieldsToReset.includes('stcRating')) setSelectedSTCRating('');
    if (fieldsToReset.includes('partitionSupport')) setSelectedPartitionSupport('');
    if (fieldsToReset.includes('panelFace')) setSelectedPanelFace('');
    if (fieldsToReset.includes('frameFinish')) setSelectedFrameFinish('');
    if (fieldsToReset.includes('frameThickness')) setCalculatedFrameThickness('');
    if (fieldsToReset.includes('trackSystem')) setCalculatedTrackSystem('');
    if (fieldsToReset.includes('trackType')) setSelectedTrackType('');
    if (fieldsToReset.includes('trackFinish')) setSelectedTrackFinish('');
    if (fieldsToReset.includes('passDoorType')) setSelectedPassDoorType('');
    if (fieldsToReset.includes('passDoorOption')) setSelectedPassDoorOption('');
    if (fieldsToReset.includes('floorGuide')) setSelectedFloorGuide('');
    if (fieldsToReset.includes('hingeType')) setSelectedHingeType('');
    if (fieldsToReset.includes('finalClosure')) setSelectedFinalClosure('');
    if (fieldsToReset.includes('bottomSeals')) setSelectedBottomSeals('');
    if (fieldsToReset.includes('topSeals')) setSelectedTopSeals('');
  }, [wallName, onChange]);

  // Main field change handler
  const handleFieldChange = useCallback((field: string, value: string) => {
    const displayValue = value === "None" ? "" : value;

    // Update local state first
    switch (field) {
      case "model":
        setSelectedModel(displayValue);
        break;
      case "panelConfiguration":
        setSelectedConfiguration(displayValue);
        break;
      case "operation":
        setSelectedOperation(displayValue);
        break;
      case "glassType":
        setSelectedGlassType(displayValue);
        break;
      case "stcRating":
        setSelectedSTCRating(displayValue);
        break;
      case "partitionSupport":
        setSelectedPartitionSupport(displayValue);
        break;
      case "passDoorType":
        setSelectedPassDoorType(displayValue);
        // If pass door type is cleared/set to None, also clear pass door option
        if (!displayValue) {
          setSelectedPassDoorOption('');
        }
        break;
      case "passDoorOption":
        setSelectedPassDoorOption(displayValue);
        break;
      case "panelFace":
        setSelectedPanelFace(displayValue);
        break;
      case "hingeType":
        setSelectedHingeType(displayValue);
        break;
      case "frameFinish":
        setSelectedFrameFinish(displayValue);
        break;
      case "trackType":
        setSelectedTrackType(displayValue);
        break;
      case "trackFinish":
        setSelectedTrackFinish(displayValue);
        break;
      case "finalClosure":
        setSelectedFinalClosure(displayValue);
        break;
      case "bottomSeals":
        setSelectedBottomSeals(displayValue);
        break;
      case "topSeals":
        setSelectedTopSeals(displayValue);
        break;
      case "floorGuide":
        setSelectedFloorGuide(displayValue);
        break;
    }

    // Apply cascading if needed
    if (FIELD_DEPENDENCIES[field]) {
      cascadeFieldReset(field, displayValue);
    } else {
      // Special handling for pass door type
      if (field === "passDoorType" && !displayValue) {
        // If pass door type is cleared, also clear pass door option
        onChange(wallName, { 
          [field]: displayValue,
          passDoorOption: ''
        });
      } else {
        // Simple field update
        onChange(wallName, { [field]: displayValue });
      }
    }
  }, [wallName, onChange, cascadeFieldReset]);

  // Auto-calculate frame thickness and track system
  useEffect(() => {
    if (selectedModel && (selectedModel !== prevModelRef.current)) {
      try {
        const modelConfig = modelConfigurations[selectedModel as GlassWallModel];
        if (modelConfig) {
          const frameThickness = getFrameThickness(selectedModel as GlassWallModel, selectedSTCRating);
          const trackSystem = getTrackSystem(selectedModel as GlassWallModel);

          setCalculatedFrameThickness(frameThickness);
          setCalculatedTrackSystem(trackSystem);

          onChange(wallName, {
            frameThickness,
            trackSystem
          });
        }
      } catch (error) {
        console.error('Error calculating frame thickness and track system:', error);
      }

      prevModelRef.current = selectedModel;
    }
  }, [selectedModel, selectedSTCRating, wallName, onChange]);

  // Get available options based on current selections
  const getOptions = useCallback((field: string) => {
    try {
      // Map form field names to ModelConfiguration property names
      const fieldMapping: Record<string, keyof ModelConfiguration> = {
        'panelConfiguration': 'configurations',
        'operation': 'operations',
        'glassType': 'glassType',
        'stcRating': 'stcRating',
        'partitionSupport': 'partitionSupport',
        'passDoorType': 'passDoorType',
        'passDoorOption': 'passDoorOption',
        'panelFace': 'panelFaces',
        'hingeType': 'hinging',
        'frameFinish': 'frameFinishes',
        'trackSystem': 'trackSystem',
        'trackType': 'trackType',
        'trackFinish': 'trackFinish',
        'floorGuide': 'floorGuide',
        'finalClosure': 'finalClosure',
        'bottomSeals': 'bottomSeals',
        'topSeals': 'topSeals'
      };
      
      const mappedField = fieldMapping[field];
      if (!mappedField) {
        console.warn(`Unknown field mapping for: ${field}`);
        return [];
      }
      
      if (!selectedModel) {
        return [];
      }
      
      return getAvailableOptions(selectedModel as GlassWallModel, mappedField);
    } catch (error) {
      console.error(`Error getting options for field ${field}:`, error);
      return [];
    }
  }, [selectedModel]);

  // Validation function
  const validateForm = useCallback(() => {
    const errors: string[] = [];
    
    // Required fields
    if (!selectedModel) errors.push('Model is required');
    if (!selectedConfiguration) errors.push('Panel Configuration is required');
    if (!selectedOperation) errors.push('Operation is required');
    if (!selectedGlassType) errors.push('Glass Type is required');
    if (!selectedSTCRating) errors.push('STC Rating is required');
    if (!selectedPartitionSupport) errors.push('Partition Support is required');
    
    // Pass door validation - if pass door type is selected, pass door option is required
    if (selectedPassDoorType && selectedPassDoorType !== 'None' && (!selectedPassDoorOption || selectedPassDoorOption === 'None')) {
      errors.push('Pass Door Option is required when Pass Door Type is selected');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [selectedModel, selectedConfiguration, selectedOperation, selectedGlassType, selectedSTCRating, selectedPartitionSupport, selectedPassDoorType, selectedPassDoorOption]);

  return {
    // State values
    selectedModel,
    selectedConfiguration,
    selectedOperation,
    selectedGlassType,
    selectedSTCRating,
    selectedPartitionSupport,
    selectedPassDoorType,
    selectedPassDoorOption,
    selectedPanelFace,
    selectedHingeType,
    selectedFrameFinish,
    selectedTrackType,
    selectedTrackFinish,
    selectedFinalClosure,
    selectedBottomSeals,
    selectedTopSeals,
    selectedFloorGuide,
    calculatedFrameThickness,
    calculatedTrackSystem,

    // Handlers
    handleFieldChange,
    getOptions,
    validateForm
  };
};