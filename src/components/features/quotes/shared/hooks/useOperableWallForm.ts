import { useState, useRef, useEffect, useCallback } from 'react';
import { WallSpecification, isOperableWall } from '@/lib/types';
import { 
  getSeriesByPanelConfiguration,
  getModelsByPanelConfigurationAndSeries,
  getPanelSkinOptions,
  getSTCRatingOptions,
  getTrackSystemByModel,
  getPanelThicknessByModel,
  getPanelFinishSpecificItems,
  getPassDoorQuantityOptions,
  panelConfigurations,
  panelDesigns,
  passDoorOptions,
  panelFinishCategories,
  verticalSeals,
  bottomSealOptions,
  topSealOptions,
  endPanelTypes,
  initialClosureSystems,
  getTrackTypeByModel,
} from '@/lib/types';

interface UseOperableWallFormProps {
  wall: WallSpecification;
  wallName: string;
  onChange: (wallName: string, updates: Record<string, string>) => void;
}

export const useOperableWallForm = ({ wall, wallName, onChange }: UseOperableWallFormProps) => {
  // Safe property access for operable wall fields
  const safeGetProperty = (property: string): string => {
    if (isOperableWall(wall)) {
      return (wall as any)[property] || '';
    }
    return '';
  };

  // State for all operable wall fields
  const [selectedPanelConfiguration, setSelectedPanelConfiguration] = useState<string>(wall.panelConfiguration || '');
  const [selectedSeries, setSelectedSeries] = useState<string>(safeGetProperty('series'));
  const [selectedModel, setSelectedModel] = useState<string>(wall.model || '');
  const [selectedPanelThickness, setSelectedPanelThickness] = useState<string>(safeGetProperty('panelThickness'));
  const [selectedPanelDesign, setSelectedPanelDesign] = useState<string>(safeGetProperty('panelDesign'));
  const [selectedPanelSkin, setSelectedPanelSkin] = useState<string>(safeGetProperty('panelSkin'));
  const [selectedSTCRating, setSelectedSTCRating] = useState<string>(wall.stcRating || '');
  const [selectedPassDoorPanels, setSelectedPassDoorPanels] = useState<string>(safeGetProperty('passDoorPanels'));
  const [selectedPassDoorQuantity, setSelectedPassDoorQuantity] = useState<string>(safeGetProperty('passDoorQuantity'));
  const [selectedPanelFinishCategory, setSelectedPanelFinishCategory] = useState<string>(safeGetProperty('panelFinishCategory'));
  const [selectedPanelFinishSpecificItem, setSelectedPanelFinishSpecificItem] = useState<string>(safeGetProperty('panelFinishSpecificItem'));
  const [selectedInitialClosureSystem, setSelectedInitialClosureSystem] = useState<string>(safeGetProperty('initialClosureSystem'));
  const [selectedEndPanelType, setSelectedEndPanelType] = useState<string>(safeGetProperty('endPanelType'));
  const [selectedVerticalSeals, setSelectedVerticalSeals] = useState<string>(safeGetProperty('verticalSeals'));
  const [selectedBottomSeals, setSelectedBottomSeals] = useState<string>(wall.bottomSeals || '');
  const [selectedTopSeals, setSelectedTopSeals] = useState<string>(wall.topSeals || '');
  const [selectedTrackType, setSelectedTrackType] = useState<string>(wall.trackType || '');
  const [calculatedTrackSystem, setCalculatedTrackSystem] = useState<string>(wall.trackSystem || '');

  // Ref for tracking previous values
  const prevModelRef = useRef<string>('');

  // Field dependencies mapping - all fields that should reset when a parent field changes
  const FIELD_DEPENDENCIES: Record<string, string[]> = {
    panelConfiguration: [
      'series', 'model', 'panelSkin', 'stcRating', 'panelDesign',
      'verticalSeals', 'bottomSeals', 'topSeals', 
      'initialClosureSystem', 'endPanelType',
      'passDoorPanels', 'passDoorQuantity', 
      'panelFinishCategory', 'panelFinishSpecificItem'
    ],
    series: ['model', 'panelSkin', 'stcRating', 'panelDesign',
      'verticalSeals', 'bottomSeals', 'topSeals', 
      'initialClosureSystem', 'endPanelType', 
      'passDoorPanels', 'passDoorQuantity', 
      'panelFinishCategory', 'panelFinishSpecificItem' 
    ],
    model: [
      'panelSkin', 'stcRating', 'panelDesign',
      'passDoorPanels', 'passDoorQuantity', 
      'panelFinishCategory', 'panelFinishSpecificItem',
      'initialClosureSystem', 'endPanelType', 
      'verticalSeals', 'bottomSeals', 'topSeals'
    ],
    panelSkin: ['stcRating'],
    passDoorPanels: ['passDoorQuantity'],
    panelFinishCategory: ['panelFinishSpecificItem']
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

    // Update local state
    if (fieldsToReset.includes('series')) setSelectedSeries('');
    if (fieldsToReset.includes('model')) setSelectedModel('');
    if (fieldsToReset.includes('panelSkin')) setSelectedPanelSkin('');
    if (fieldsToReset.includes('stcRating')) setSelectedSTCRating('');
    if (fieldsToReset.includes('panelDesign')) setSelectedPanelDesign('');
    if (fieldsToReset.includes('verticalSeals')) setSelectedVerticalSeals('');
    if (fieldsToReset.includes('bottomSeals')) setSelectedBottomSeals('');
    if (fieldsToReset.includes('topSeals')) setSelectedTopSeals('');
    if (fieldsToReset.includes('initialClosureSystem')) setSelectedInitialClosureSystem('');
    if (fieldsToReset.includes('endPanelType')) setSelectedEndPanelType('');
    if (fieldsToReset.includes('passDoorPanels')) setSelectedPassDoorPanels('');
    if (fieldsToReset.includes('passDoorQuantity')) setSelectedPassDoorQuantity('');
    if (fieldsToReset.includes('panelFinishCategory')) setSelectedPanelFinishCategory('');
    if (fieldsToReset.includes('panelFinishSpecificItem')) setSelectedPanelFinishSpecificItem('');
  }, [wallName, onChange]);

  // Main field change handler
  const handleFieldChange = useCallback((field: string, value: string) => {
    const displayValue = value === "None" ? "" : value;

    // Update local state first
    switch (field) {
      case "panelConfiguration":
        setSelectedPanelConfiguration(displayValue);
        break;
      case "series":
        setSelectedSeries(displayValue);
        break;
      case "model":
        setSelectedModel(displayValue);
        break;
      case "panelThickness":
        setSelectedPanelThickness(displayValue);
        break;
      case "panelDesign":
        setSelectedPanelDesign(displayValue);
        break;
      case "panelSkin":
        setSelectedPanelSkin(displayValue);
        break;
      case "stcRating":
        setSelectedSTCRating(displayValue);
        break;
      case "passDoorPanels":
        setSelectedPassDoorPanels(displayValue);
        break;
      case "passDoorQuantity":
        setSelectedPassDoorQuantity(displayValue);
        break;
      case "panelFinishCategory":
        setSelectedPanelFinishCategory(displayValue);
        break;
      case "panelFinishSpecificItem":
        setSelectedPanelFinishSpecificItem(displayValue);
        break;
      case "initialClosureSystem":
        setSelectedInitialClosureSystem(displayValue);
        break;
      case "endPanelType":
        setSelectedEndPanelType(displayValue);
        break;
      case "verticalSeals":
        setSelectedVerticalSeals(displayValue);
        break;
      case "bottomSeals":
        setSelectedBottomSeals(displayValue);
        break;
      case "topSeals":
        setSelectedTopSeals(displayValue);
        break;
      case "trackType":
        setSelectedTrackType(displayValue);
        break;
      case "trackSystem":
        setCalculatedTrackSystem(displayValue);
        break;
    }

    // Apply cascading if needed
    if (FIELD_DEPENDENCIES[field]) {
      cascadeFieldReset(field, displayValue);
    } else {
      // Simple field update
      onChange(wallName, { [field]: displayValue });
    }
  }, [wallName, onChange, cascadeFieldReset]);

  // Sync state with wall prop changes (important for form re-renders and wall switching)
  useEffect(() => {
    setSelectedPanelConfiguration(wall.panelConfiguration || '');
    setSelectedSeries(safeGetProperty('series'));
    setSelectedModel(wall.model || '');
    setSelectedPanelThickness(safeGetProperty('panelThickness'));
    setSelectedPanelDesign(safeGetProperty('panelDesign'));
    setSelectedPanelSkin(safeGetProperty('panelSkin'));
    setSelectedSTCRating(wall.stcRating || '');
    setSelectedPassDoorPanels(safeGetProperty('passDoorPanels'));
    setSelectedPassDoorQuantity(safeGetProperty('passDoorQuantity'));
    setSelectedPanelFinishCategory(safeGetProperty('panelFinishCategory'));
    setSelectedPanelFinishSpecificItem(safeGetProperty('panelFinishSpecificItem'));
    setSelectedInitialClosureSystem(safeGetProperty('initialClosureSystem'));
    setSelectedEndPanelType(safeGetProperty('endPanelType'));
    setSelectedVerticalSeals(safeGetProperty('verticalSeals'));
    setSelectedBottomSeals(wall.bottomSeals || '');
    setSelectedTopSeals(wall.topSeals || '');
    setSelectedTrackType(wall.trackType || '');
    setCalculatedTrackSystem(wall.trackSystem || '');
  }, [wall, safeGetProperty]);

  // Auto-calculate panel thickness, track type, and track system based on model
  useEffect(() => {
    if (selectedModel !== prevModelRef.current) {
      const updates: Record<string, string> = {};
      
      if (selectedModel) {
        // Model is selected - calculate values
        const panelThickness = getPanelThicknessByModel(selectedModel);
        const trackType = getTrackTypeByModel(selectedModel);
        const trackSystems = getTrackSystemByModel(selectedModel);
        
        // Update panel thickness
        if (panelThickness) {
          setSelectedPanelThickness(panelThickness);
          updates.panelThickness = panelThickness;
        }
        
        // Update track type and system
        if (trackType) {
          setSelectedTrackType(trackType);
          updates.trackType = trackType;
          
          // Auto-select trackSystem if there's only one option
          if (trackSystems.length === 1 && trackSystems[0]) {
            setCalculatedTrackSystem(trackSystems[0]);
            updates.trackSystem = trackSystems[0];
          }
        }
      } else {
        // Model is cleared - reset calculated values
        setSelectedPanelThickness('');
        setSelectedTrackType('');
        setCalculatedTrackSystem('');
        updates.panelThickness = '';
        updates.trackType = '';
        updates.trackSystem = '';
      }
      
      // Apply all updates at once
      if (Object.keys(updates).length > 0) {
        onChange(wallName, updates);
      }
      
      prevModelRef.current = selectedModel;
    }
  }, [selectedModel, wallName, onChange]);


  const getAvailableSeries = useCallback(() => {
    return getSeriesByPanelConfiguration(selectedPanelConfiguration);
  }, [selectedPanelConfiguration]);

  const getAvailableModels = useCallback(() => {
    return getModelsByPanelConfigurationAndSeries(selectedPanelConfiguration, selectedSeries);
  }, [selectedPanelConfiguration, selectedSeries]);

  const getAvailablePanelSkins = useCallback(() => {
    return getPanelSkinOptions(selectedModel);
  }, [selectedModel]);

  const getAvailableSTCRatings = useCallback(() => {
    return getSTCRatingOptions(selectedModel, selectedPanelSkin);
  }, [selectedPanelSkin]);

  const getAvailablePanelThickness = useCallback(() => {
    const thickness = getPanelThicknessByModel(selectedModel);
    return thickness ? [thickness] : [];
  }, [selectedModel]);

  const getAvailablePassDoorQuantity = useCallback(() => {
    return getPassDoorQuantityOptions(selectedPassDoorPanels);
  }, [selectedPassDoorPanels]);

  const getAvailablePanelFinishItems = useCallback(() => {
    return getPanelFinishSpecificItems(selectedPanelFinishCategory);
  }, [selectedPanelFinishCategory]);

  const getAvailableTrackSystems = useCallback(() => {
    return getTrackSystemByModel(selectedModel);
  }, [selectedModel]);

  return {
    // State values
    selectedPanelConfiguration,
    selectedSeries,
    selectedModel,
    selectedPanelThickness,
    selectedPanelDesign,
    selectedPanelSkin,
    selectedSTCRating,
    selectedPassDoorPanels,
    selectedPassDoorQuantity,
    selectedPanelFinishCategory,
    selectedPanelFinishSpecificItem,
    selectedInitialClosureSystem,
    selectedEndPanelType,
    selectedVerticalSeals,
    selectedBottomSeals,
    selectedTopSeals,
    selectedTrackType,
    calculatedTrackSystem,

    // Handlers
    handleFieldChange,

    // Option getters
    getAvailableSeries,
    getAvailableModels,
    getAvailablePanelSkins,
    getAvailableSTCRatings,
    getAvailablePanelThickness,
    getAvailablePassDoorQuantity,
    getAvailablePanelFinishItems,
    getAvailableTrackSystems,

    // Static options
    panelConfigurations,
    panelDesigns,
    passDoorOptions,
    panelFinishCategories,
    verticalSeals,
    bottomSealOptions,
    topSealOptions,
    endPanelTypes,
    initialClosureSystems
  };
};