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
  getTrackMounting
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
  const selectedPanelFinish = accordionWall.panelFinish || '';
  const selectedOptions = accordionWall.options || '';
  const selectedTrackSystemOption = accordionWall.trackSystemOption || '';
  const selectedTrackMounting = accordionWall.trackMounting || '';

  // Available options based on current selections
  const availableModels = useMemo(() => {
    return selectedSeries ? getAccordionModelsBySeries(selectedSeries) : [];
  }, [selectedSeries]);

  const availablePanelFinishes = useMemo(() => {
    return selectedModel ? getPanelFinishesByModel(selectedModel) : [];
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

  // Cascading field change handler
  const handleFieldChange = useCallback((field: string, value: any) => {
    let updates: Record<string, any> = { [field]: value };

    // Handle cascading changes
    if (field === 'series') {
      // Reset dependent fields when series changes
      updates = {
        ...updates,
        model: '',
        stcRating: '',
        panelFinish: '',
        options: '',
        trackSystem: '',
        trackSystemOption: '',
        trackMounting: ''
      };
    } else if (field === 'model') {
      // Auto-calculate STC rating and set track system when model changes
      updates = {
        ...updates,
        stcRating: getSTCFromModel(value),
        trackSystem: getAccordionTrackSystemByModel(value)
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
    selectedPanelFinish,
    selectedOptions,
    selectedTrackSystemOption,
    selectedTrackMounting,

    // Available options
    seriesOptions,
    availableModels,
    availablePanelFinishes,
    availableOptions,
    trackMountingOptions,
    trackSystemOptions,

    // Handlers
    handleFieldChange,
    handleOptionChange,

    // Helper functions
    getAvailableModels: () => availableModels,
    getAvailablePanelFinishes: () => availablePanelFinishes,
    getAvailableOptions: () => availableOptions
  };
};