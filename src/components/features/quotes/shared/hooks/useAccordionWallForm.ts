import { useMemo, useCallback } from 'react';
import { WallSpecification } from '@/lib/types';
import { 
  AccordionWallSpecification,
  getAccordionModelsBySeries,
  getSTCFromModel,
  getPanelFinishesByModel,
  getOptionsByModel,
  getAccordionTrackSystemByModel,
  getTrackSystemOptions,
  getTrackMounting,
  getAccordionFinalClosureOptions,
  getTopSealsOptions,
  getBottomSealsOptions
} from '@/lib/types/walls/accordion';

interface UseAccordionWallFormProps {
  wall: WallSpecification;
  wallName: string;
  onChange: (wallName: string, updates: Record<string, any>) => void;
}

export const useAccordionWallForm = ({ wall, wallName, onChange }: UseAccordionWallFormProps) => {
  const accordionWall = wall as AccordionWallSpecification;

  // Current field values
  const selectedSeries = accordionWall.series || '';
  const selectedModel = accordionWall.model || '';
  const selectedSTCRating = accordionWall.stcRating || '';
  const selectedOperation = accordionWall.operation || '';
  const selectedPanelFace = accordionWall.panelFace || '';
  const selectedTopSeals = accordionWall.topSeals || '';
  const selectedBottomSeals = accordionWall.bottomSeals || '';
  const selectedOptions = accordionWall.options || '';
  const selectedTrackSystemOption = accordionWall.trackSystemOption || '';
  const selectedTrackMounting = accordionWall.trackMounting || '';
  const selectedFinalClosureSystem = accordionWall.finalClosureSystem || '';
  // Available options based on current selections
  const availableModels = useMemo(() => {
    return selectedSeries ? getAccordionModelsBySeries(selectedSeries) : [];
  }, [selectedSeries]);

  const availablePanelFaces = useMemo(() => {
    return selectedModel ? getPanelFinishesByModel(selectedModel) : [];
  }, [selectedModel]);

  const availableTopSeals = useMemo(() => {
    return selectedModel ? getTopSealsOptions(selectedModel) : [];
  }, [selectedModel]);

  const availableBottomSeals = useMemo(() => {
    return selectedModel ? getBottomSealsOptions(selectedModel) : [];
  }, [selectedModel]);

  const availableOptions = useMemo(() => {
    return selectedModel ? getOptionsByModel(selectedModel) : [];
  }, [selectedModel]);

  // Static options
  const seriesOptions = ['VL Series', 'MK Series'];
  const trackMountingOptions = useMemo(() => {
    return selectedModel ? getTrackMounting(selectedModel) : [];
  }, [selectedModel]);
  const trackSystemOptions = useMemo(() => {
    return selectedModel ? getTrackSystemOptions(selectedModel) : '';
  }, [selectedModel]);

  const finalClosureSystemOptions = useMemo(() => {
      return selectedModel ? getAccordionFinalClosureOptions(selectedModel) : '';
  },[selectedModel]);

  // Cascading field change handler
  const handleFieldChange = useCallback((field: string, value: any) => {
    // Handle "none" values for seals - convert to empty string
    if ((field === 'topSeals' || field === 'bottomSeals') && value === 'none') {
      value = '';
    }
    
    let updates: Record<string, any> = { [field]: value };

    // Handle cascading changes
    if (field === 'series') {
      // Reset dependent fields when series changes
      updates = {
        ...updates,
        model: '',
        stcRating: '',
        panelFace: '',
        topSeals: '',
        bottomSeals: '',
        operation: '',
        options: '',
        trackSystem: '',
        trackSystemOption: '',
        trackMounting: '',
        finalClosureSystem: ''
      };
    } else if (field === 'model') {
      // Auto-calculate STC rating and set track system when model changes
      updates = {
        ...updates,
        stcRating: getSTCFromModel(value),
        trackSystem: getAccordionTrackSystemByModel(value),
        panelFace: '',
        topSeals: '',
        bottomSeals: '',
        operation: '',
        options: '',
        trackSystemOption: '',
        trackMounting: '',
        finalClosureSystem: ''
      };
    }

    onChange(wallName, updates);
  }, [wallName, onChange]);

  // Option handler for string-based options
  const handleOptionChange = useCallback((value: string) => {
    onChange(wallName, { options: value });
  }, [wallName, onChange]);

  return {
    // Current values
    selectedSeries,
    selectedModel,
    selectedSTCRating,
    selectedOperation,
    selectedPanelFace,
    selectedTopSeals,
    selectedBottomSeals,
    selectedOptions,
    selectedTrackSystemOption,
    selectedTrackMounting,

    // Available options
    seriesOptions,
    availableModels,
    availablePanelFaces,
    availableTopSeals,
    availableBottomSeals,
    availableOptions,
    trackMountingOptions,
    trackSystemOptions,
    finalClosureSystemOptions,

    // Handlers
    handleFieldChange,
    handleOptionChange,

    // Helper functions
    getAvailableModels: () => availableModels,
    getAvailablePanelFaces: () => availablePanelFaces,
    getAvailableTopSeals: () => availableTopSeals,
    getAvailableBottomSeals: () => availableBottomSeals,
    getAvailableOptions: () => availableOptions
  };
};